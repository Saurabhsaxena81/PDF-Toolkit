import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import DragDropZone from "../DragDropZone";
import { readFileAsArrayBuffer } from "../../utils/fileHelpers";
import { Trash2, Eraser, Palette, Download, CheckCircle } from "lucide-react";

export default function CropTool() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfScale, setPdfScale] = useState(2.5);
  const [pageDimensions, setPageDimensions] = useState({ width: 1, height: 1 });

  const [eraserColor, setEraserColor] = useState("#ffffff");
  const [isTransparent, setIsTransparent] = useState(false); // NAYA STATE TRANSPARENCY KE LIYE

  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let timer;
    if (file) {
      timer = setTimeout(() => {
        renderPdfToCanvas(file);
      }, 150);
    }
    return () => clearTimeout(timer);
  }, [file]);

  const handleFile = (files) => {
    const pdfFile = files.find((f) => f.type === "application/pdf");
    if (!pdfFile) return;
    setFile(pdfFile);
    setBoxes([]);
  };

  const renderPdfToCanvas = async (pdfFile) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(pdfFile);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: pdfScale });
      setPageDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Base background white rakhte hain
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (error) {
      console.error(error);
      alert(`Error rendering PDF: ${error.message}`);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMousePos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = pageDimensions.width / rect.width;
    const scaleY = pageDimensions.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const pos = getMousePos(e);
    setCurrentBox({ startX: pos.x, startY: pos.y, width: 0, height: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !containerRef.current || !currentBox) return;
    const pos = getMousePos(e);
    setCurrentBox((prev) => ({
      ...prev,
      width: pos.x - prev.startX,
      height: pos.y - prev.startY,
    }));
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox) {
      if (Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
        setBoxes((prev) => [...prev, currentBox]);
      }
    }
    setCurrentBox(null);
    setIsDrawing(false);
  };

  const getNormalizedRect = (b) => {
    return {
      x: Math.min(b.startX, b.startX + b.width),
      y: Math.min(b.startY, b.startY + b.height),
      w: Math.abs(b.width),
      h: Math.abs(b.height),
    };
  };

  const handleApplyChanges = async () => {
    if (boxes.length === 0) return alert("Pehle koi area select karein.");
    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // LOGIC CHANGE: Check agar user transparent chahta hai ya colored
      boxes.forEach((box) => {
        const rect = getNormalizedRect(box);
        if (isTransparent) {
          // ClearRect se wahan ke pixels delete ho jayenge (Transparent hole)
          ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
        } else {
          // FillRect se solid color paint hoga
          ctx.fillStyle = eraserColor;
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        }
      });

      // LOGIC CHANGE: JPEG ki jagah PNG use karna padega kyunki JPEG mein transparency nahi hoti
      const imageDataUrl = canvas.toDataURL("image/png", 1.0);
      const imageBytes = await fetch(imageDataUrl).then((res) =>
        res.arrayBuffer(),
      );

      const arrayBuffer = await readFileAsArrayBuffer(file);
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const originalPage = originalPdf.getPages()[0];
      const { width: origWidth, height: origHeight } = originalPage.getSize();

      const newPdf = await PDFDocument.create();

      // LOGIC CHANGE: embedJpg ki jagah embedPng
      const embeddedImage = await newPdf.embedPng(imageBytes);

      const newPage = newPdf.addPage([origWidth, origHeight]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: origWidth,
        height: origHeight,
      });

      const pagesCount = originalPdf.getPageCount();
      if (pagesCount > 1) {
        const pageIndicesToCopy = Array.from(
          { length: pagesCount - 1 },
          (_, i) => i + 1,
        );
        const copiedPages = await newPdf.copyPages(
          originalPdf,
          pageIndicesToCopy,
        );
        copiedPages.forEach((p) => newPdf.addPage(p));
      }

      const pdfBytes = await newPdf.save();

      const modifiedBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const modifiedFile = new File([modifiedBlob], file.name || "edited.pdf", {
        type: "application/pdf",
      });

      setFile(modifiedFile);
      setBoxes([]);
    } catch (error) {
      console.error(error);
      alert("Error saving changes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited-${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Secure Text Eraser</h2>

      {!file ? (
        <DragDropZone
          onFilesSelected={handleFile}
          accept=".pdf"
          multiple={false}
          label="PDF drag & drop karo"
        />
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center space-y-4">
          <div className="w-full flex justify-between items-center px-2">
            <p className="text-gray-600 font-medium text-lg">
              1. Mouse se select karein kahan se text hatana hai.
            </p>
            <button
              onClick={() => setBoxes([])}
              className="text-red-500 hover:text-red-700 flex items-center text-sm font-semibold border px-3 py-1 rounded hover:bg-red-50"
            >
              <Trash2 size={16} className="mr-1" /> Clear Selections
            </button>
          </div>

          <div className="w-full max-w-4xl mx-auto border-4 border-gray-200 rounded-lg overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQYV2NkYGD4z0AEYBxVSF+FpBjgMEjxCgBqXxEBg72rEAAAAABJRU5ErkJggg==')] flex justify-center">
            {/* Background mein ek checkerboard pattern lagaya hai taaki transparent area saaf dikhe */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative cursor-crosshair shadow-lg w-full bg-white"
            >
              <canvas ref={canvasRef} className="w-full h-auto block" />

              {boxes.map((box, idx) => {
                const rect = getNormalizedRect(box);
                const cvsW = pageDimensions.width;
                const cvsH = pageDimensions.height;
                return (
                  <div
                    key={idx}
                    className="absolute border-2 border-red-500 bg-red-500 bg-opacity-40 pointer-events-none"
                    style={{
                      left: `${(rect.x / cvsW) * 100}%`,
                      top: `${(rect.y / cvsH) * 100}%`,
                      width: `${(rect.w / cvsW) * 100}%`,
                      height: `${(rect.h / cvsH) * 100}%`,
                    }}
                  />
                );
              })}

              {isDrawing && currentBox && (
                <div
                  className="absolute border-2 border-dashed border-gray-800 bg-gray-500 bg-opacity-40 pointer-events-none"
                  style={{
                    left: `${(Math.min(currentBox.startX, currentBox.startX + currentBox.width) / pageDimensions.width) * 100}%`,
                    top: `${(Math.min(currentBox.startY, currentBox.startY + currentBox.height) / pageDimensions.height) * 100}%`,
                    width: `${(Math.abs(currentBox.width) / pageDimensions.width) * 100}%`,
                    height: `${(Math.abs(currentBox.height) / pageDimensions.height) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-4xl mt-6 bg-gray-100 p-5 rounded-lg border border-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* CHECKBOX FOR TRANSPARENCY */}
                <label className="flex items-center cursor-pointer gap-2 bg-white px-3 py-2 rounded border border-gray-300 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={isTransparent}
                    onChange={(e) => setIsTransparent(e.target.checked)}
                    className="w-5 h-5 cursor-pointer accent-blue-600"
                  />
                  <span className="font-semibold text-gray-700">
                    Make Erased Area Transparent
                  </span>
                </label>

                <div
                  className={`flex items-center gap-3 transition-opacity ${isTransparent ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                >
                  <Palette size={20} className="text-gray-600" />
                  <span className="text-gray-800 font-semibold text-sm">
                    Background Color:
                  </span>
                  <input
                    type="color"
                    value={eraserColor}
                    onChange={(e) => setEraserColor(e.target.value)}
                    disabled={isTransparent}
                    className="w-10 h-10 cursor-pointer rounded border border-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                onClick={handleApplyChanges}
                disabled={isProcessing || boxes.length === 0}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center shadow"
              >
                <CheckCircle size={20} className="mr-2" />
                {isProcessing ? "Processing..." : "Apply Changes"}
              </button>
            </div>
          </div>

          <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setFile(null);
                setBoxes([]);
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Upload Another PDF
            </button>

            <button
              onClick={handleFinalDownload}
              className="px-8 py-3 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 flex items-center shadow-lg transform transition hover:scale-105"
            >
              <Download size={24} className="mr-3" />
              Download Final PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
