import React from "react";
import { Plus, Square, X } from "lucide-react";
import ClassAutocomplete from "./ClassAutocomplete";
import { formatClassName } from "../utils/annotationUtils";

const AnnotationControls = ({
  annotationMode,
  setAnnotationMode,
  selectedClass,
  setSelectedClass,
  isDrawingAnnotation,
  setIsDrawingAnnotation,
  currentImage,
  compact = false,
}) => {
  const handleToggleAnnotationMode = () => {
    if (annotationMode) {
      // Exit annotation mode
      setAnnotationMode(false);
      setIsDrawingAnnotation(false);
    } else {
      // Enter annotation mode
      setAnnotationMode(true);
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawingAnnotation(false);
  };

  if (!currentImage) {
    return null;
  }

  if (compact) {
    // Compact version for toolbar/header
    return (
      <div className="annotation-controls-compact">
        <button
          className={`btn ${
            annotationMode ? "btn-primary active" : "btn-secondary"
          }`}
          onClick={handleToggleAnnotationMode}
          title={annotationMode ? "Exit annotation mode" : "Add new annotation"}
        >
          <Plus size={16} />
          {annotationMode ? "Exit Annotation Mode" : "Add Annotation"}
        </button>
      </div>
    );
  }

  // Full version for sidebar
  return (
    <div className="annotation-controls">
      <div className="annotation-controls-header">
        <h3>Add Annotation</h3>
        <button
          className={`btn ${
            annotationMode ? "btn-primary active" : "btn-secondary"
          }`}
          onClick={handleToggleAnnotationMode}
        >
          <Plus size={16} />
          {annotationMode ? "Exit Mode" : "Start Adding"}
        </button>
      </div>

      {annotationMode && (
        <div className="annotation-creation-panel">
          <ClassAutocomplete
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            disabled={isDrawingAnnotation}
          />

          <div className="drawing-instructions">
            {isDrawingAnnotation ? (
              <div className="drawing-active">
                <div className="drawing-status">
                  <Square size={16} />
                  <span>Drawing bounding box...</span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelDrawing}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="drawing-instructions-text">
                <p>
                  <strong>Instructions:</strong>
                </p>
                <ol>
                  <li>Select a traffic sign class above</li>
                  <li>Click and drag on the image to draw a bounding box</li>
                  <li>Release to create the annotation</li>
                </ol>
                <p className="selected-class">
                  <strong>Selected:</strong> {formatClassName(selectedClass)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationControls;
