import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

const ZoomControls = ({
    zoom,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen
}) => {
    return (
        <div className="zoom-controls-overlay">
            <button className="btn-icon" onClick={handleZoomOut} title="Zoom Out (Ctrl+Mouse wheel or Ctrl+-)">
                <ZoomOut size={16} />
            </button>
            <button className="btn-icon" onClick={handleFitToScreen} title="Fit to Screen">
                <Maximize size={16} />
            </button>
            <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
            <button className="btn-icon" onClick={handleZoomIn} title="Zoom In (Ctrl+Mouse wheel or Ctrl++)">
                <ZoomIn size={16} />
            </button>
            <button className="btn-icon" onClick={handleResetZoom} title="Reset Zoom (Ctrl+0)">
                <RotateCcw size={16} />
            </button>
        </div>
    );
};

export default ZoomControls;
