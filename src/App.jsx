import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// VITE Ka Official aur Failsafe tareeqa local worker load karne ka
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

import Layout from "./components/Layout";
import MergeTool from "./components/tools/MergeTool";
import ImageToPdfTool from "./components/tools/ImageToPdfTool";
import ExtractTool from "./components/tools/ExtractTool";
import CropTool from "./components/tools/CropTool";

function App() {
  const [activeTab, setActiveTab] = useState("merge");

  const renderContent = () => {
    switch (activeTab) {
      case "merge":
        return <MergeTool />;
      case "img2pdf":
        return <ImageToPdfTool />;
      case "crop":
        return <CropTool />;
      case "extract":
        return <ExtractTool />;
      default:
        return <MergeTool />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
