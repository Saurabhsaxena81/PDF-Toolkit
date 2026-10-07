import React, { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import DragDropZone from "../DragDropZone";
import { readFileAsArrayBuffer, downloadPdf } from "../../utils/fileHelpers";
import { Check } from "lucide-react";

export default function ExtractTool() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (files) => {
    const pdfFile = files.find((f) => f.type === "application/pdf");
    if (!pdfFile) return;
    setFile(pdfFile);
    setIsProcessing(true);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(pdfFile);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const thumbs = [];

      // Render each page to a hidden canvas to generate a thumbnail image
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push({ index: i - 1, url: canvas.toDataURL() });
      }

      setThumbnails(thumbs);
      setSelectedPages(new Set(thumbs.map((t) => t.index))); // Select all by default
    } catch (error) {
      console.error("Error generating thumbnails:", error);
      alert("Failed to load PDF pages.");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePage = (index) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    setSelectedPages(newSelection);
  };

  const extractSelected = async () => {
    if (selectedPages.size === 0) return alert("Select at least one page.");
    setIsProcessing(true);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      // Sort selected indices to maintain original page order
      const indicesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newPdf.copyPages(pdfDoc, indicesToExtract);

      copiedPages.forEach((page) => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();
      downloadPdf(pdfBytes, "extracted-pages.pdf");
    } catch (error) {
      console.error(error);
      alert("Error extracting pages.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Extract Pages</h2>

      {!file ? (
        <DragDropZone
          onFilesSelected={handleFile}
          accept=".pdf"
          multiple={false}
          label="Drag & drop a PDF here"
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{file.name}</h3>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-red-600 hover:underline"
            >
              Cancel
            </button>
          </div>

          {isProcessing && thumbnails.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Loading pages...</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {thumbnails.map((thumb) => {
                const isSelected = selectedPages.has(thumb.index);
                return (
                  <div
                    key={thumb.index}
                    onClick={() => togglePage(thumb.index)}
                    className={`relative cursor-pointer rounded border-2 transition-all ${isSelected ? "border-blue-500 shadow-md" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img
                      src={thumb.url}
                      alt={`Page ${thumb.index + 1}`}
                      className="w-full h-auto rounded-sm"
                    />
                    <div className="absolute bottom-1 right-1 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {thumb.index + 1}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={extractSelected}
            disabled={isProcessing || selectedPages.size === 0}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing
              ? "Processing..."
              : `Extract ${selectedPages.size} Pages`}
          </button>
        </div>
      )}
    </div>
  );
}
