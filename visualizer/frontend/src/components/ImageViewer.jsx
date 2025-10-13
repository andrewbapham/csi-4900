import React from 'react';
import { Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageGallery from './ImageGallery.jsx';
import ZoomControls from './ZoomControls.jsx';

const ImageViewer = ({
    currentImage,
    canvasRef,
    canvasWrapperRef,
    zoom,
    isPanning,
    currentImageIndex,
    apiImages,
    apiBaseUrl,
    pagination,
    currentPage,
    loadingImages,
    loadApiImages,
    handleImageSelect,
    handleDownload,
    handleCanvasMouseDown,
    handleCanvasMouseLeave,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    prevImage,
    nextImage,
    drawAnnotations
}) => {
    return (
        <div className="canvas-container">
            {currentImage ? (
                <div className="image-viewer">
                    <div
                        className="canvas-wrapper"
                        ref={canvasWrapperRef}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseLeave={handleCanvasMouseLeave}
                        style={{
                            cursor: isPanning ? 'grabbing' : 'grab'
                        }}
                    >
                        <div
                            className="image-container"
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'center center'
                            }}
                        >
                            <img
                                src={currentImage}
                                alt="Annotated image"
                                className="base-image"
                                onLoad={drawAnnotations}
                            />
                            <canvas
                                ref={canvasRef}
                                className="annotation-canvas"
                            />
                        </div>

                        <ZoomControls
                            zoom={zoom}
                            handleZoomIn={handleZoomIn}
                            handleZoomOut={handleZoomOut}
                            handleResetZoom={handleResetZoom}
                            handleFitToScreen={handleFitToScreen}
                        />

                        <div className="image-controls-overlay">
                            <button onClick={prevImage} disabled={currentImageIndex === 0}>
                                Previous
                            </button>
                            <span>{currentImageIndex + 1} / {apiImages.length || 1}</span>
                            <button onClick={nextImage} disabled={currentImageIndex >= (apiImages.length - 1)}>
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="placeholder">
                    <Upload size={64} />
                    <p>Load an image to get started</p>
                </div>
            )}
        </div>
    );
};

export default ImageViewer;
