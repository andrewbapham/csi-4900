import type { RefObject } from 'react';
import { Upload } from 'lucide-react';
import ZoomControls from './ZoomControls.jsx';
import { ImageData } from '@/types/index.js';

interface ImageViewerProps {
  currentImage: ImageData | null;
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasWrapperRef: RefObject<HTMLDivElement>;
  zoom: number;
  isPanning: boolean;
  currentImageIndex: number;
  apiImages: ImageData[];
  handleCanvasMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleCanvasMouseLeave: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToScreen: () => void;
  prevImage: () => void;
  nextImage: () => void;
  drawAnnotations: () => void;
}

const ImageViewer = ({
  currentImage,
  canvasRef,
  canvasWrapperRef,
  zoom,
  isPanning,
  currentImageIndex,
  apiImages,
  handleCanvasMouseDown,
  handleCanvasMouseLeave,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleFitToScreen,
  prevImage,
  nextImage,
  drawAnnotations,
}: ImageViewerProps) => {
  return (
    <div className="canvas-container">
      {currentImage?.url ? (
        <div className="image-viewer">
          <div
            className="canvas-wrapper"
            ref={canvasWrapperRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseLeave={handleCanvasMouseLeave}
            style={{
              cursor: isPanning ? 'grabbing' : 'grab',
            }}
          >
            <div
              className="image-container"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={currentImage?.url}
                alt="Annotated image"
                className="base-image"
                onLoad={drawAnnotations}
              />
              <canvas ref={canvasRef} className="annotation-canvas" />
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
              <span>
                {currentImageIndex + 1} / {apiImages.length || 1}
              </span>
              <button
                onClick={nextImage}
                disabled={currentImageIndex >= apiImages.length - 1}
              >
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
