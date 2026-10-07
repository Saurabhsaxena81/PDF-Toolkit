import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import DragDropZone from "../DragDropZone";
import { readFileAsArrayBuffer, downloadPdf } from "../../utils/fileHelpers";
import { X } from "lucide-react";

export default function ImageToPdfTool() {
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (newFiles) => {
    const validImages = newFiles.filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...validImages]);
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of images) {
        const imageBytes = await readFileAsArrayBuffer(file);
        let embeddedImage;
        if (file.type === "image/jpeg" || file.type === "image/jpg") {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === "image/png") {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          continue; // skip unsupported formats
        }

        const { width, height } = embeddedImage;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      downloadPdf(pdfBytes, "images-converted.pdf");
    } catch (error) {
      console.error(error);
      alert("Error converting images");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Images to PDF</h2>
      <DragDropZone
        onFilesSelected={handleFiles}
        accept="image/*"
        label="Drag & drop images (JPG, PNG)"
      />

      {images.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square bg-gray-100 rounded overflow-hidden"
              >
                <img
                  src={URL.createObjectURL(img)}
                  alt="preview"
                  className="object-cover w-full h-full"
                />
                <button
                  onClick={() =>
                    setImages(images.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={convertToPdf}
            disabled={isProcessing}
            className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {isProcessing ? "Converting..." : "Convert to PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
