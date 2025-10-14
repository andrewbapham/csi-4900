import React, { useState } from 'react';
import { Image, Eye, Download, Loader2 } from 'lucide-react';
import './ImageGallery.css';
import { ImageData } from '../types';

interface ImageGalleryProps {
  images: ImageData[];
  currentIndex: number;
  onImageSelect: (index: number) => void;
  onDownload: (imageUrl: string) => void;
}

const ImageGallery = ({ images, currentIndex, onImageSelect, onDownload }: ImageGalleryProps) => {
  const [loadingImages, setLoadingImages] = useState(new Set());

  const handleImageLoad = (index: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageStartLoad = (index: number) => {
    setLoadingImages(prev => new Set(prev).add(index));
  };

  return (
    <div className="image-gallery">
      <div className="gallery-grid">
        {images.map((imageData: ImageData, index: number) => {
          // Handle both URL strings and image objects
          const imageUrl = typeof imageData === 'string' ? imageData : (imageData.url);
          const imageName = typeof imageData === 'string'
            ? `Image ${index + 1}`
            : (imageData.metadata?.filename || `Image ${index + 1}`);
          const isLoading = loadingImages.has(index);

          return (
            <div
              key={index}
              className={`gallery-item ${index === currentIndex ? 'active' : ''}`}
              onClick={() => onImageSelect(index)}
            >
              <div className="image-preview">
                {isLoading && (
                  <div className="image-loading">
                    <Loader2 size={24} className="spinner" />
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={imageName}
                  style={{ display: isLoading ? 'none' : 'block' }}
                  onLoadStart={() => handleImageStartLoad(index)}
                  onLoad={() => {
                    handleImageLoad(index);
                    console.log('Image loaded successfully:', imageUrl);
                  }}
                  onError={(e) => {
                    handleImageLoad(index);
                    console.log('Image failed to load:', imageUrl);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="image-placeholder" style={{ display: 'none' }}>
                  <Image size={24} />
                  <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Failed to load</span>
                </div>
              </div>
              <div className="image-info">
                <span className="image-name">{imageName}</span>
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
                      onDownload(imageUrl);
                    }}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              {imageData.metadata?.annotations && imageData.metadata?.annotations.length > 0 && (
                <div className="annotation-count">
                  {imageData.metadata?.annotations.length} annotations
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageGallery;
