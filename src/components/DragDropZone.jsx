import React, { useCallback } from "react";
import { UploadCloud } from "lucide-react";

export default function DragDropZone({
  onFilesSelected,
  accept = "*",
  multiple = true,
  label = "Drag & drop files here",
}) {
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-blue-500 hover:bg-blue-50 bg-white"
    >
      <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
      <p className="text-gray-600 font-medium">{label}</p>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => onFilesSelected(Array.from(e.target.files))}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
      >
        Browse Files
      </label>
    </div>
  );
}
