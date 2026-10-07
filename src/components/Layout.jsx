import React from "react";
import { Layers, Image, Crop, Scissors } from "lucide-react";

const navItems = [
  { id: "merge", label: "Merge PDFs", icon: <Layers size={20} /> },
  { id: "img2pdf", label: "Images to PDF", icon: <Image size={20} /> },
  { id: "crop", label: "Crop PDF", icon: <Crop size={20} /> },
  { id: "extract", label: "Extract Pages", icon: <Scissors size={20} /> },
];

export default function Layout({ activeTab, setActiveTab, children }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 font-black text-2xl text-blue-600 border-b">
          PDF Master
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
