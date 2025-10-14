import React, { useEffect, useState } from "react";
import {
  formatClassName,
  getClassColor,
  getContrastColor,
} from "./utils/annotationUtils";
import { useImageState } from "./hooks/useImageState";
import { useAPIState } from "./hooks/useAPIState";
import { useUIState } from "./hooks/useUIState";
import { useImageOperations } from "./hooks/useImageOperations";
import { useAnnotationOperations } from "./hooks/useAnnotationOperations";
import { useZoomOperations } from "./hooks/useZoomOperations";
import { useAnnotationCreation } from "./hooks/useAnnotationCreation";
import Sidebar from "./components/Sidebar";
import ImageViewer from "./components/ImageViewer";
import AnnotationControls from "./components/AnnotationControls";
import "./App.css";

const App = () => {
  // State management hooks
  const imageState = useImageState();
  const apiState = useAPIState();
  const uiState = useUIState();

  // Destructure state for easier access
  const {
    currentImage,
    setCurrentImage,
    annotations,
    setAnnotations,
    currentImageIndex,
    setCurrentImageIndex,
    currentImageMetadata,
    setCurrentImageMetadata,
    hoveredAnnotation,
    setHoveredAnnotation,
    selectedAnnotation,
    setSelectedAnnotation,
    editingAnnotation,
    setEditingAnnotation,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    lastPanPoint,
    setLastPanPoint,
    isDrawingAnnotation,
    setIsDrawingAnnotation,
    currentBbox,
    setCurrentBbox,
    selectedClass,
    setSelectedClass,
    drawingStartPoint,
    setDrawingStartPoint,
    canvasRef,
    fileInputRef,
    jsonInputRef,
    canvasWrapperRef,
  } = imageState;

  const {
    apiImages,
    setApiImages,
    currentImageId,
    setCurrentImageId,
    apiBaseUrl,
    pagination,
    setPagination,
    currentPage,
    setCurrentPage,
    loadingImages,
    setLoadingImages,
  } = apiState;

  const {
    isValidating,
    setIsValidating,
    loading,
    setLoading,
    error,
    setError,
    sidebarWidth,
    setSidebarWidth,
    isDragging,
    setIsDragging,
    annotationMode,
    setAnnotationMode,
  } = uiState;

  // Operation hooks
  const imageOperations = useImageOperations({
    setAnnotations,
    setZoom,
    setPanOffset,
    setCurrentImageMetadata,
    setHoveredAnnotation,
    setSelectedAnnotation,
    setCurrentImage,
    setError,
    setCurrentImageIndex,
  });

  const annotationOperations = useAnnotationOperations({
    annotations,
    setAnnotations,
    setEditingAnnotation,
  });

  const zoomOperations = useZoomOperations({
    zoom,
    setZoom,
    setPanOffset,
    canvasWrapperRef,
    currentImage,
  });

  const annotationCreation = useAnnotationCreation({
    annotationMode,
    setAnnotationMode,
    isDrawingAnnotation,
    setIsDrawingAnnotation,
    currentBbox,
    setCurrentBbox,
    drawingStartPoint,
    setDrawingStartPoint,
    selectedClass,
    canvasRef,
    canvasWrapperRef,
    zoom,
    currentImageId,
    apiBaseUrl,
    setAnnotations,
    setError,
  });

  // Load image and draw annotations
  useEffect(() => {
    if (currentImage) {
      setLoadedImage(null); // Clear previous image
      drawAnnotations();
    }
  }, [currentImage, annotations, hoveredAnnotation, selectedAnnotation]);

  // Redraw canvas when preview bbox changes (faster than full redraw)
  useEffect(() => {
    if (currentImage && currentBbox && isDrawingAnnotation) {
      redrawCanvas();
    }
  }, [currentBbox]);

  // Keyboard shortcuts for zoom and annotation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Handle escape key for annotation mode
      if (event.key === "Escape") {
        if (isDrawingAnnotation) {
          event.preventDefault();
          annotationCreation.cancelDrawing();
        } else if (annotationMode) {
          event.preventDefault();
          annotationCreation.exitAnnotationMode();
        }
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "=":
          case "+":
            event.preventDefault();
            zoomOperations.handleZoomIn();
            break;
          case "-":
            event.preventDefault();
            zoomOperations.handleZoomOut();
            break;
          case "0":
            event.preventDefault();
            zoomOperations.handleResetZoom();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomOperations, isDrawingAnnotation, annotationMode, annotationCreation]);

  // Store the loaded image for reuse
  const [loadedImage, setLoadedImage] = useState(null);

  // Function to draw annotations and preview on canvas (synchronous)
  const drawAnnotationsOnCanvas = (ctx, canvas, img) => {
    if (!img) return;

    // Clear canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw existing annotations
    if (annotations.length > 0) {
      annotations.forEach((annotation, index) => {
        const {
          x,
          y,
          width,
          height,
          class: className,
          confidence,
        } = annotation;
        const color = getClassColor(className);
        const isHovered = hoveredAnnotation === index;
        const isSelected = selectedAnnotation === index;

        // Draw highlight background for hovered/selected annotations
        if (isHovered || isSelected) {
          ctx.fillStyle = isSelected
            ? "rgba(255, 255, 0, 0.3)"
            : "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
        }

        // Draw bounding box with enhanced style for hovered/selected
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered || isSelected ? 4 : 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        const formattedClassName = formatClassName(className);
        const labelText = `${formattedClassName}${
          confidence && confidence < 1
            ? ` (${(confidence * 100).toFixed(1)}%)`
            : ""
        }`;
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

        // Draw label text with high contrast color
        const textColor = getContrastColor(color);
        ctx.fillStyle = textColor;
        ctx.font = "12px Arial";
        ctx.fillText(labelText, x + 4, y - 6);
      });
    }

    // Draw preview bounding box if currently drawing
    if (currentBbox && isDrawingAnnotation) {
      const { x, y, width, height } = currentBbox;

      // Draw preview rectangle with dashed border
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw semi-transparent fill
      ctx.fillStyle = "rgba(0, 123, 255, 0.1)";
      ctx.fillRect(x, y, width, height);

      // Reset line dash
      ctx.setLineDash([]);

      // Draw preview label
      const previewLabel = `${formatClassName(selectedClass)} (preview)`;
      const previewMetrics = ctx.measureText(previewLabel);
      const previewLabelWidth = previewMetrics.width + 8;
      const previewLabelHeight = 20;

      ctx.fillStyle = "#007bff";
      ctx.fillRect(
        x,
        y - previewLabelHeight,
        previewLabelWidth,
        previewLabelHeight
      );

      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText(previewLabel, x + 4, y - 6);
    }
  };

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Set canvas size to match image (only on initial load)
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Calculate and set optimal zoom for first load
      if (zoom === 1) {
        const optimalZoom = zoomOperations.calculateOptimalZoom(
          img.width,
          img.height
        );
        setZoom(optimalZoom);

        // Scroll to show the image after a short delay to allow zoom to apply
        setTimeout(() => {
          zoomOperations.scrollToImage();
        }, 100);
      }

      // Store the loaded image for reuse
      setLoadedImage(img);

      // Draw everything
      drawAnnotationsOnCanvas(ctx, canvas, img);
    };

    img.src = currentImage;
  };

  // Quick redraw function for preview updates (uses stored image)
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage || !loadedImage) return;

    const ctx = canvas.getContext("2d");
    drawAnnotationsOnCanvas(ctx, canvas, loadedImage);
  };

  // Use the operations from hooks
  const { handleImageUpload, handleJsonUpload } = imageOperations;

  // Use annotation operations from hooks
  const {
    validateAnnotation,
    invalidateAnnotation,
    editAnnotation,
    saveAnnotationEdit,
    deleteAnnotation,
  } = annotationOperations;

  const nextImage = async () => {
    if (apiImages.length > 0) {
      const nextIndex = currentImageIndex + 1;

      // If we're at the end of current page and there's a next page, load it
      if (nextIndex >= apiImages.length && pagination?.has_next) {
        await loadApiImages(currentPage + 1);
        // After loading new page, load the first image
        if (apiImages.length > 0) {
          setCurrentImageIndex(0);
          loadImageFromApi(apiImages[0]);
        }
      } else if (nextIndex < apiImages.length) {
        setCurrentImageIndex(nextIndex);
        loadImageFromApi(apiImages[nextIndex]);
      }
    }
  };

  const prevImage = async () => {
    if (apiImages.length > 0) {
      const prevIndex = currentImageIndex - 1;

      // If we're at the beginning of current page and there's a previous page, load it
      if (prevIndex < 0 && pagination?.has_prev) {
        await loadApiImages(currentPage - 1);
        // After loading new page, load the last image
        if (apiImages.length > 0) {
          setCurrentImageIndex(apiImages.length - 1);
          loadImageFromApi(apiImages[apiImages.length - 1]);
        }
      } else if (prevIndex >= 0) {
        setCurrentImageIndex(prevIndex);
        loadImageFromApi(apiImages[prevIndex]);
      }
    }
  };

  const handleImageSelect = (index) => {
    imageOperations.clearImageState();

    if (apiImages.length > 0) {
      setCurrentImageIndex(index);
      loadImageFromApi(apiImages[index]);
    }
  };

  const handleDownload = (imageData) => {
    // In a real implementation, this would trigger a download
    console.log("Downloading:", imageData);
  };

  // Use zoom operations from hooks
  const { handleZoomIn, handleZoomOut, handleResetZoom, handleFitToScreen } =
    zoomOperations;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= window.innerWidth - 200) {
        setSidebarWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Pan functionality for canvas
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0) {
      // Left mouse button

      // Check if we're in annotation mode and should start drawing
      if (annotationMode && !isDrawingAnnotation) {
        annotationCreation.handleDrawingMouseDown(e);
        return;
      }

      // Otherwise, handle panning (but not if we're currently drawing)
      if (!isDrawingAnnotation) {
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    // Handle annotation drawing
    if (isDrawingAnnotation) {
      annotationCreation.handleDrawingMouseMove(e);
      return;
    }

    // Handle panning
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      const canvasWrapper = canvasWrapperRef.current;
      if (canvasWrapper) {
        const newScrollLeft = canvasWrapper.scrollLeft - deltaX;
        const newScrollTop = canvasWrapper.scrollTop - deltaY;

        // Constrain scrolling to prevent over-scrolling
        const maxScrollLeft =
          canvasWrapper.scrollWidth - canvasWrapper.clientWidth;
        const maxScrollTop =
          canvasWrapper.scrollHeight - canvasWrapper.clientHeight;

        canvasWrapper.scrollLeft = Math.max(
          0,
          Math.min(newScrollLeft, maxScrollLeft)
        );
        canvasWrapper.scrollTop = Math.max(
          0,
          Math.min(newScrollTop, maxScrollTop)
        );
      }

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = (e) => {
    // Handle annotation drawing completion
    if (isDrawingAnnotation) {
      annotationCreation.handleDrawingMouseUp(e);
      return;
    }

    // Handle panning end
    setIsPanning(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  // Add panning and drawing event listeners
  useEffect(() => {
    if (isPanning || isDrawingAnnotation) {
      document.addEventListener("mousemove", handleCanvasMouseMove);
      document.addEventListener("mouseup", handleCanvasMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleCanvasMouseMove);
        document.removeEventListener("mouseup", handleCanvasMouseUp);
      };
    }
  }, [
    isPanning,
    isDrawingAnnotation,
    lastPanPoint,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  ]);

  // Load images from API on component mount
  useEffect(() => {
    loadApiImages();
  }, []);

  // Add wheel event listener for zoom
  useEffect(() => {
    const canvasWrapper = canvasWrapperRef.current;
    if (canvasWrapper) {
      const handleWheel = (e) => {
        if (e.ctrlKey && currentImage) {
          e.preventDefault();
          e.stopPropagation();

          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          const newZoom = Math.max(0.1, Math.min(5, zoom * delta));

          if (newZoom !== zoom) {
            setZoom(newZoom);
          }
        }
      };

      canvasWrapper.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvasWrapper.removeEventListener("wheel", handleWheel);
    }
  }, [currentImage, zoom]);

  const loadApiImages = async (page = 1) => {
    try {
      setLoadingImages(true);
      const response = await fetch(
        `${apiBaseUrl}/api/images?page=${page}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setApiImages(data.image_ids);
        setPagination(data.pagination);
        setCurrentPage(page);
        if (data.image_ids.length > 0) {
          setCurrentImageIndex(0);
          setCurrentImageId(data.image_ids[0]);
        }
      } else {
        setError("Failed to load images from API");
      }
    } catch (err) {
      setError("Error connecting to API: " + err.message);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadImageFromApi = async (imageId) => {
    try {
      setLoading(true);
      setError(null);

      // Load image
      const imageUrl = `${apiBaseUrl}/api/images/${imageId}`;
      setCurrentImage(imageUrl);
      setCurrentImageId(imageId);

      // Load annotations
      const annotationsResponse = await fetch(
        `${apiBaseUrl}/api/images/${imageId}/annotations`
      );
      if (annotationsResponse.ok) {
        const annotationData = await annotationsResponse.json();

        if (
          annotationData.detections &&
          Array.isArray(annotationData.detections)
        ) {
          const processedAnnotations = annotationData.detections.map(
            (detection) => ({
              id: detection.id,
              x: detection.bbox[0],
              y: detection.bbox[1],
              width: detection.bbox[2] - detection.bbox[0],
              height: detection.bbox[3] - detection.bbox[1],
              class: detection.value,
              confidence: 1.0,
              imageId: detection.image_id,
            })
          );
          setAnnotations(processedAnnotations);

          if (annotationData.width && annotationData.height) {
            setCurrentImageMetadata({
              width: annotationData.width,
              height: annotationData.height,
              lat: annotationData.lat,
              lon: annotationData.lon,
              creator: annotationData.creator,
              cameraType: annotationData.camera_type,
              sequence: annotationData.sequence,
            });
          }
        } else {
          setAnnotations(annotationData);
        }
      } else {
        setAnnotations([]);
        setCurrentImageMetadata(null);
      }

      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setHoveredAnnotation(null);
      setSelectedAnnotation(null);
    } catch (err) {
      setError("Error loading image: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annotation Visualizer</h1>
        <AnnotationControls
          annotationMode={annotationMode}
          setAnnotationMode={setAnnotationMode}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          isDrawingAnnotation={isDrawingAnnotation}
          setIsDrawingAnnotation={setIsDrawingAnnotation}
          currentImage={currentImage}
          compact={true}
        />
      </header>

      <div className="main-content">
        <Sidebar
          sidebarWidth={sidebarWidth}
          apiImages={apiImages}
          currentImageIndex={currentImageIndex}
          apiBaseUrl={apiBaseUrl}
          pagination={pagination}
          currentPage={currentPage}
          loadingImages={loadingImages}
          loadApiImages={loadApiImages}
          handleImageSelect={handleImageSelect}
          handleDownload={handleDownload}
          fileInputRef={fileInputRef}
          jsonInputRef={jsonInputRef}
          handleImageUpload={handleImageUpload}
          handleJsonUpload={handleJsonUpload}
          loadImageFromApi={loadImageFromApi}
          loading={loading}
          currentImageMetadata={currentImageMetadata}
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
          annotationMode={annotationMode}
          setAnnotationMode={setAnnotationMode}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          isDrawingAnnotation={isDrawingAnnotation}
          setIsDrawingAnnotation={setIsDrawingAnnotation}
          currentImage={currentImage}
        />

        <div className="resize-handle" onMouseDown={handleMouseDown}></div>

        <ImageViewer
          currentImage={currentImage}
          canvasRef={canvasRef}
          canvasWrapperRef={canvasWrapperRef}
          zoom={zoom}
          isPanning={isPanning}
          currentImageIndex={currentImageIndex}
          apiImages={apiImages}
          apiBaseUrl={apiBaseUrl}
          pagination={pagination}
          currentPage={currentPage}
          loadingImages={loadingImages}
          loadApiImages={loadApiImages}
          handleImageSelect={handleImageSelect}
          handleDownload={handleDownload}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleCanvasMouseLeave={handleCanvasMouseLeave}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleResetZoom={handleResetZoom}
          handleFitToScreen={handleFitToScreen}
          prevImage={prevImage}
          nextImage={nextImage}
          drawAnnotations={drawAnnotations}
          annotationMode={annotationMode}
          isDrawingAnnotation={isDrawingAnnotation}
        />
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default App;
