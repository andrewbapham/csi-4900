import React, { useEffect } from 'react';
import { formatClassName, getClassColor, getContrastColor } from './utils/annotationUtils';
import { useImageState } from './hooks/useImageState';
import { useAPIState } from './hooks/useAPIState';
import { useUIState } from './hooks/useUIState';
import { useImageOperations } from './hooks/useImageOperations';
import { useAnnotationOperations } from './hooks/useAnnotationOperations';
import { useZoomOperations } from './hooks/useZoomOperations';
import Sidebar from './components/Sidebar';
import ImageViewer from './components/ImageViewer';
import './App.css';
import { Annotation, AnnotationApiResponse } from './types/index.js';

const App: React.FC = () => {
  // State management hooks
  const imageState = useImageState();
  const apiState = useAPIState();
  const uiState = useUIState();

  // Destructure state for easier access
  const {
    currentImage, setCurrentImage, annotations, setAnnotations,
    currentImageIndex, setCurrentImageIndex, currentImageMetadata, setCurrentImageMetadata,
    hoveredAnnotation, setHoveredAnnotation, selectedAnnotation, setSelectedAnnotation,
    editingAnnotation, setEditingAnnotation, zoom, setZoom, panOffset, setPanOffset,
    isPanning, setIsPanning, lastPanPoint, setLastPanPoint,
    canvasRef, fileInputRef, jsonInputRef, canvasWrapperRef
  } = imageState;

  const {
    apiImages, setApiImages, currentImageId, setCurrentImageId, apiBaseUrl,
    pagination, setPagination, currentPage, setCurrentPage, loadingImages, setLoadingImages
  } = apiState;

  const {
    loading, setLoading, error, setError,
    sidebarWidth, setSidebarWidth, isDragging, setIsDragging
  } = uiState;

  // Operation hooks 
  const imageOperations = useImageOperations({
    setAnnotations, setZoom, setPanOffset, setCurrentImageMetadata,
    setHoveredAnnotation, setSelectedAnnotation, setCurrentImage, setError
  });

  const annotationOperations = useAnnotationOperations({
    annotations, setAnnotations, setEditingAnnotation
  });

  const zoomOperations = useZoomOperations({
    zoom, setZoom, setPanOffset, canvasWrapperRef, currentImage
  });

  // Load image and draw annotations
  useEffect(() => {
    if (currentImage) {
      drawAnnotations();
    }
  }, [currentImage, annotations, hoveredAnnotation, selectedAnnotation]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            zoomOperations.handleZoomIn();
            break;
          case '-':
            event.preventDefault();
            zoomOperations.handleZoomOut();
            break;
          case '0':
            event.preventDefault();
            zoomOperations.handleResetZoom();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomOperations]);

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Calculate and set optimal zoom for first load
      if (zoom === 1) {
        const optimalZoom = zoomOperations.calculateOptimalZoom(img.width, img.height);
        setZoom(optimalZoom);

        // Scroll to show the image after a short delay to allow zoom to apply
        setTimeout(() => {
          zoomOperations.scrollToImage();
        }, 100);
      }

      // Clear canvas completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Only draw annotations if there are any
      if (annotations.length > 0) {
        annotations.forEach((annotation) => {
          const { bbox } = annotation;
          // bbox is [x1, y1, x2, y2] where origin is top-left (0,0)
          const [x1, y1, x2, y2] = bbox as [number, number, number, number];
          const x = x1;
          const y = y1;
          const width = x2 - x1;
          const height = y2 - y1;

          const color = getClassColor(annotation.value);
          const isHovered = hoveredAnnotation === annotation.id;
          const isSelected = selectedAnnotation === annotation.id;

          // Draw highlight background for hovered/selected annotations
          if (isHovered || isSelected) {
            ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
          }

          // Draw bounding box with enhanced style for hovered/selected
          ctx.strokeStyle = color;
          ctx.lineWidth = isHovered || isSelected ? 8 : 4;
          ctx.strokeRect(x, y, width, height);

          // Draw label background
          ctx.font = '18px Arial';
          const formattedClassName = formatClassName(annotation.value);
          const labelText = formattedClassName;
          const textMetrics = ctx.measureText(labelText);
          const labelWidth = textMetrics.width + 8;
          const labelHeight = 24;

          ctx.fillStyle = color;
          ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

          // Draw label text with high contrast color
          const textColor = getContrastColor(color);
          ctx.fillStyle = textColor;
          ctx.fillText(labelText, x + 4, y - 6);
        });
      }
    };

    img.src = currentImage.url;
  };

  // Use the operations from hooks
  const { handleImageUpload, handleJsonUpload } = imageOperations;


  // Use annotation operations from hooks
  const { validateAnnotation, invalidateAnnotation, editAnnotation, saveAnnotationEdit, deleteAnnotation } = annotationOperations;

  const nextImage = async () => {
    if (apiImages.length > 0) {
      const nextIndex = currentImageIndex + 1;

      // If we're at the end of current page and there's a next page, load it
      if (nextIndex >= apiImages.length && pagination?.pages && pagination.pages > currentPage) {
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

  const handleImageSelect = (index: number) => {
    imageOperations.clearImageState();

    if (apiImages.length > 0) {
      setCurrentImageIndex(index);
      loadImageFromApi(apiImages[index]);
    }
  };

  // Use zoom operations from hooks
  const { handleZoomIn, handleZoomOut, handleResetZoom, handleFitToScreen } = zoomOperations;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.preventDefault();
  };

  // React-level mouse move not used; document listeners handle dragging

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Pan functionality for canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      const canvasWrapper = canvasWrapperRef.current;
      if (canvasWrapper) {
        const newScrollLeft = canvasWrapper.scrollLeft - deltaX;
        const newScrollTop = canvasWrapper.scrollTop - deltaY;

        // Constrain scrolling to prevent over-scrolling
        const maxScrollLeft = canvasWrapper.scrollWidth - canvasWrapper.clientWidth;
        const maxScrollTop = canvasWrapper.scrollHeight - canvasWrapper.clientHeight;

        canvasWrapper.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
        canvasWrapper.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
      }

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: MouseEvent) => {
        const newWidth = e.clientX;
        if (newWidth >= 250 && newWidth <= window.innerWidth - 200) {
          setSidebarWidth(newWidth);
        }
      };
      const onUp = () => handleMouseUp();

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      return () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
    }
  }, [isDragging]);

  // Add panning event listeners
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleCanvasMouseMove);
      document.addEventListener('mouseup', handleCanvasMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleCanvasMouseMove);
        document.removeEventListener('mouseup', handleCanvasMouseUp);
      };
    }
  }, [isPanning, lastPanPoint]);

  // Load images from API on component mount
  useEffect(() => {
    loadApiImages();
  }, []);

  // Add wheel event listener for zoom
  useEffect(() => {
    const canvasWrapper = canvasWrapperRef.current;
    if (canvasWrapper) {
      const handleWheel = (e: WheelEvent) => {
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

      canvasWrapper.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvasWrapper.removeEventListener('wheel', handleWheel);
    }
  }, [currentImage, zoom]);

  const loadApiImages = async (page = 1) => {
    try {
      setLoadingImages(true);
      const response = await fetch(`${apiBaseUrl}/api/images?page=${page}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setApiImages(data.image_ids);
        // Map backend pagination format to frontend format
        setPagination({
          page: data.pagination.page,
          per_page: data.pagination.limit,
          total: data.pagination.total_images,
          pages: data.pagination.total_pages,
          has_prev: data.pagination.has_prev,
          has_next: data.pagination.has_next,
          total_images: data.pagination.total_images
        });
        setCurrentPage(page);
        if (data.image_ids.length > 0) {
          setCurrentImageIndex(0);
          setCurrentImageId(data.image_ids[0]);
        }
      } else {
        setError('Failed to load images from API');
      }
    } catch (err) {
      setError('Error connecting to API: ' + (err as Error).message);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadImageFromApi = async (imageId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load image
      const imageUrl = `${apiBaseUrl}/api/images/${imageId}`;
      setCurrentImageId(imageId);

      // Load annotations
      const annotationsResponse = await fetch(`${apiBaseUrl}/api/images/${imageId}/annotations`);
      if (annotationsResponse.ok) {
        const annotationData: AnnotationApiResponse = await annotationsResponse.json();

        if (annotationData.detections && Array.isArray(annotationData.detections)) {
          const processedAnnotations: Annotation[] = annotationData.detections
          setAnnotations(processedAnnotations);

          setCurrentImageMetadata({
            id: imageId,
            filename: annotationData.filename,
            width: annotationData.width,
            height: annotationData.height,
            lat: annotationData.lat,
            lon: annotationData.lon,
            creator: annotationData.creator,
            annotations: processedAnnotations,
            sequence: annotationData.sequence ?? null,
          });
        
          setCurrentImage({ url: imageUrl, id: imageId });
        }
      } 
    } catch (err) {
      setError('Error loading image: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annotation Visualizer</h1>
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
        />

        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
        ></div>

        <ImageViewer
          currentImage={currentImage}
          canvasRef={canvasRef}
          canvasWrapperRef={canvasWrapperRef}
          zoom={zoom}
          isPanning={isPanning}
          currentImageIndex={currentImageIndex}
          apiImages={apiImages}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleCanvasMouseLeave={handleCanvasMouseLeave}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleResetZoom={handleResetZoom}
          handleFitToScreen={handleFitToScreen}
          prevImage={prevImage}
          nextImage={nextImage}
          drawAnnotations={drawAnnotations}
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
