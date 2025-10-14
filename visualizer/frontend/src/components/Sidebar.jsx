import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageGallery from "./ImageGallery.jsx";
import UploadSection from "./UploadSection.jsx";
import MetadataDisplay from "./MetadataDisplay.jsx";
import AnnotationList from "./AnnotationList.jsx";
import AnnotationControls from "./AnnotationControls.jsx";

const Sidebar = ({
  sidebarWidth,
  apiImages,
  currentImageIndex,
  apiBaseUrl,
  pagination,
  currentPage,
  loadingImages,
  loadApiImages,
  handleImageSelect,
  handleDownload,
  fileInputRef,
  jsonInputRef,
  handleImageUpload,
  handleJsonUpload,
  loadImageFromApi,
  loading,
  currentImageMetadata,
  annotations,
  hoveredAnnotation,
  setHoveredAnnotation,
  selectedAnnotation,
  setSelectedAnnotation,
  editingAnnotation,
  editAnnotation,
  saveAnnotationEdit,
  validateAnnotation,
  invalidateAnnotation,
  formatClassName,
  // Annotation creation props
  annotationMode,
  setAnnotationMode,
  selectedClass,
  setSelectedClass,
  isDrawingAnnotation,
  setIsDrawingAnnotation,
  currentImage,
}) => {
  return (
    <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
      <UploadSection
        apiImages={apiImages}
        loadImageFromApi={loadImageFromApi}
        fileInputRef={fileInputRef}
        jsonInputRef={jsonInputRef}
        handleImageUpload={handleImageUpload}
        handleJsonUpload={handleJsonUpload}
        loading={loading}
      />

      {apiImages.length > 0 && (
        <div className="image-gallery-section">
          <ImageGallery
            images={apiImages.map((id) => `${apiBaseUrl}/api/images/${id}`)}
            currentIndex={currentImageIndex}
            onImageSelect={handleImageSelect}
            onDownload={handleDownload}
          />
          {pagination && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Page {pagination.page} of {pagination.total_pages}(
                {pagination.total_images} total images)
              </div>
              <div className="pagination-buttons">
                <button
                  className="btn btn-sm"
                  onClick={() => loadApiImages(currentPage - 1)}
                  disabled={!pagination.has_prev || loadingImages}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => loadApiImages(currentPage + 1)}
                  disabled={!pagination.has_next || loadingImages}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <MetadataDisplay currentImageMetadata={currentImageMetadata} />

      <AnnotationControls
        annotationMode={annotationMode}
        setAnnotationMode={setAnnotationMode}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        isDrawingAnnotation={isDrawingAnnotation}
        setIsDrawingAnnotation={setIsDrawingAnnotation}
        currentImage={currentImage}
        compact={false}
      />

      <AnnotationList
        annotations={annotations}
        hoveredAnnotation={hoveredAnnotation}
        setHoveredAnnotation={setHoveredAnnotation}
        selectedAnnotation={selectedAnnotation}
        setSelectedAnnotation={setSelectedAnnotation}
        editingAnnotation={editingAnnotation}
        editAnnotation={editAnnotation}
        saveAnnotationEdit={saveAnnotationEdit}
        validateAnnotation={validateAnnotation}
        invalidateAnnotation={invalidateAnnotation}
        formatClassName={formatClassName}
      />
    </div>
  );
};

export default Sidebar;
