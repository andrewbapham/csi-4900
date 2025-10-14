import React from "react";
import { Upload, FileText, Database } from "lucide-react";

const UploadSection = ({
  apiImages,
  loadImageFromApi,
  fileInputRef,
  jsonInputRef,
  handleImageUpload,
  handleJsonUpload,
  loading,
}) => {
  return (
    <div className="upload-section">
      <h3>Load Data</h3>
      <div className="upload-buttons">
        {apiImages.length > 0 ? (
          <button
            className="btn btn-primary"
            onClick={() => loadImageFromApi(apiImages[0].id)}
            disabled={loading}
          >
            <Database size={16} />
            Load from API ({apiImages.length} images)
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            Load Image
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => jsonInputRef.current?.click()}
        >
          <FileText size={16} />
          Load Annotations
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonUpload}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default UploadSection;
