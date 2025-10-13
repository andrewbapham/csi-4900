import React from 'react';
import { Image, Eye, Download } from 'lucide-react';
import './ImageGallery.css';

const ImageGallery = ({ images, currentIndex, onImageSelect, onDownload }) => {
  return (
    <div className="image-gallery">
      <h3>Image Gallery ({images.length})</h3>
      <div className="gallery-grid">
        {images.map((imageData, index) => (
          <div 
            key={index}
            className={`gallery-item ${index === currentIndex ? 'active' : ''}`}
            onClick={() => onImageSelect(index)}
          >
            <div className="image-preview">
              <img 
                src={imageData.thumbnail || imageData.url} 
                alt={`Image ${index + 1}`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <Image size={24} />
              </div>
            </div>
            <div className="image-info">
              <span className="image-name">{imageData.name}</span>
              <div className="image-actions">
                <button 
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageSelect(index);
                  }}
                  title="View"
                >
                  <Eye size={14} />
                </button>
                <button 
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(imageData);
                  }}
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            {imageData.annotations && (
              <div className="annotation-count">
                {imageData.annotations.length} annotations
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
