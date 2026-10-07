import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import DragDropZone from "../DragDropZone";
import { readFileAsArrayBuffer, downloadPdf } from "../../utils/fileHelpers";
import { GripVertical, X } from "lucide-react";

export default function MergeTool() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (newFiles) => {
    const pdfs = newFiles.filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const mergePdfs = async () => {
    if (files.length < 2) return alert("Please add at least 2 PDFs");
    setIsProcessing(true);

    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices(),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      downloadPdf(mergedPdfBytes, "merged-document.pdf");
    } catch (error) {
      console.error(error);
      alert("Error merging PDFs");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Merge PDFs</h2>
      <DragDropZone
        onFilesSelected={handleFiles}
        accept=".pdf"
        label="Drag & drop PDF files here"
      />

      {files.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">
            Files to Merge (Top to Bottom):
          </h3>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <li
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 border rounded"
              >
                <div className="flex items-center">
                  <GripVertical className="text-gray-400 mr-2" />
                  <span className="text-sm truncate max-w-xs">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={mergePdfs}
            disabled={isProcessing}
            className="mt-4 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? "Merging..." : "Merge PDFs"}
          </button>
        </div>
      )}
    </div>
  );
}
