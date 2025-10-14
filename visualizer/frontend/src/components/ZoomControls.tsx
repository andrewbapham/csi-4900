import type { FC } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToScreen: () => void;
}

const ZoomControls: FC<ZoomControlsProps> = ({
  zoom,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleFitToScreen,
}) => {
  return (
    <div className="zoom-controls-overlay">
      <button
        className="btn-icon"
        onClick={handleZoomOut}
        title="Zoom Out (Ctrl+Mouse wheel or Ctrl+-)"
        type="button"
      >
        <ZoomOut size={16} />
      </button>
      <button
        className="btn-icon"
        onClick={handleFitToScreen}
        title="Fit to Screen"
        type="button"
      >
        <Maximize size={16} />
      </button>
      <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
      <button
        className="btn-icon"
        onClick={handleZoomIn}
        title="Zoom In (Ctrl+Mouse wheel or Ctrl++)"
        type="button"
      >
        <ZoomIn size={16} />
      </button>
      <button
        className="btn-icon"
        onClick={handleResetZoom}
        title="Reset Zoom (Ctrl+0)"
        type="button"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
};

export default ZoomControls;
