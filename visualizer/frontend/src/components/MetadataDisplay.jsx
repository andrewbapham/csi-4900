import React from 'react';

const MetadataDisplay = ({ currentImageMetadata }) => {
    return (
        <div className="metadata-section">
            <h3>Image Metadata</h3>
            {currentImageMetadata ? (
                <div className="metadata-info">
                    <div className="metadata-item">
                        <strong>Dimensions:</strong> {currentImageMetadata.width} × {currentImageMetadata.height}
                    </div>
                    <div className="metadata-item">
                        <strong>Location:</strong> {currentImageMetadata.lat?.toFixed(6)}, {currentImageMetadata.lon?.toFixed(6)}
                    </div>
                    <div className="metadata-item">
                        <strong>Camera:</strong> {currentImageMetadata.cameraType}
                    </div>
                    {currentImageMetadata.creator && (
                        <div className="metadata-item">
                            <strong>Creator:</strong> {currentImageMetadata.creator.username}
                        </div>
                    )}
                    {currentImageMetadata.sequence && (
                        <div className="metadata-item">
                            <strong>Sequence:</strong> {currentImageMetadata.sequence}
                        </div>
                    )}
                </div>
            ) : (
                <div className="metadata-placeholder">
                    Upload annotations to view metadata
                </div>
            )}
        </div>
    );
};

export default MetadataDisplay;
