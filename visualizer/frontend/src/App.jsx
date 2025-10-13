import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, CheckCircle, XCircle, Edit3, Save, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';
import ImageGallery from './components/ImageGallery.jsx';
import { FTPClient, matchImageWithAnnotations } from './utils/ftpClient';
import './App.css';

const App = () => {
  const [currentImage, setCurrentImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [imageList, setImageList] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [ftpConfig, setFtpConfig] = useState({
    host: '',
    username: '',
    password: '',
    port: 21
  });
  const [showFtpConfig, setShowFtpConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [ftpClient, setFtpClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentImageMetadata, setCurrentImageMetadata] = useState(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Color palette for different classes - optimized for contrast
  const colors = [
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#34495E', '#E67E22', '#8E44AD', '#27AE60'
  ];

  const getClassColor = (className) => {
    const index = className.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getContrastColor = (backgroundColor) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const formatClassName = (className) => {
    // Convert Mapillary format (regulatory--stop--g1) to readable format
    return className
      .split('--')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Load image and draw annotations
  useEffect(() => {
    if (currentImage) {
      drawAnnotations();
    }
  }, [currentImage, annotations, hoveredAnnotation, selectedAnnotation]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            handleZoomIn();
            break;
          case '-':
            event.preventDefault();
            handleZoomOut();
            break;
          case '0':
            event.preventDefault();
            handleResetZoom();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  const calculateOptimalZoom = (imgWidth, imgHeight) => {
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (!canvasWrapper) return 1;
    
    const containerWidth = canvasWrapper.clientWidth - 60; // Account for padding and positioning
    const containerHeight = canvasWrapper.clientHeight - 60; // Account for padding and positioning
    
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    
    // Use the smaller scale to ensure the image fits completely
    const optimalScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    
    return Math.max(optimalScale, 0.1); // Minimum 10% zoom
  };

  const scrollToImage = () => {
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (canvasWrapper) {
      // Scroll to bottom-right to show the image
      canvasWrapper.scrollTop = canvasWrapper.scrollHeight - canvasWrapper.clientHeight;
      canvasWrapper.scrollLeft = canvasWrapper.scrollWidth - canvasWrapper.clientWidth;
    }
  };

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Calculate and set optimal zoom for first load
      if (zoom === 1) {
        const optimalZoom = calculateOptimalZoom(img.width, img.height);
        setZoom(optimalZoom);
        
        // Scroll to show the image after a short delay to allow zoom to apply
        setTimeout(() => {
          scrollToImage();
        }, 100);
      }
      
      // Clear canvas completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Only draw annotations if there are any
      if (annotations.length > 0) {
        annotations.forEach((annotation, index) => {
          const { x, y, width, height, class: className, confidence } = annotation;
          const color = getClassColor(className);
          const isHovered = hoveredAnnotation === index;
          const isSelected = selectedAnnotation === index;
          
          // Draw highlight background for hovered/selected annotations
          if (isHovered || isSelected) {
            ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
          }
          
          // Draw bounding box with enhanced style for hovered/selected
          ctx.strokeStyle = color;
          ctx.lineWidth = isHovered || isSelected ? 4 : 2;
          ctx.strokeRect(x, y, width, height);
          
          // Draw label background
          const formattedClassName = formatClassName(className);
          const labelText = `${formattedClassName}${confidence && confidence < 1 ? ` (${(confidence * 100).toFixed(1)}%)` : ''}`;
          const textMetrics = ctx.measureText(labelText);
          const labelWidth = textMetrics.width + 8;
          const labelHeight = 20;
          
          ctx.fillStyle = color;
          ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
          
          // Draw label text with high contrast color
          const textColor = getContrastColor(color);
          ctx.fillStyle = textColor;
          ctx.font = '12px Arial';
          ctx.fillText(labelText, x + 4, y - 6);
        });
      }
    };
    
    img.src = currentImage;
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Clear previous annotations and reset zoom
        setAnnotations([]);
        setZoom(1);
        setCurrentImageMetadata(null);
        setHoveredAnnotation(null);
        setSelectedAnnotation(null);
        setCurrentImage(e.target.result);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJsonUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Handle Mapillary annotation format
          if (data.detections && Array.isArray(data.detections)) {
            const processedAnnotations = data.detections.map(detection => ({
              id: detection.id,
              x: detection.bbox[0], // x1
              y: detection.bbox[1], // y1
              width: detection.bbox[2] - detection.bbox[0], // x2 - x1
              height: detection.bbox[3] - detection.bbox[1], // y2 - y1
              class: detection.value,
              confidence: 1.0, // Mapillary doesn't provide confidence scores
              imageId: detection.image_id
            }));
            setAnnotations(processedAnnotations);
            
            // Store image metadata
            if (data.width && data.height) {
              setCurrentImageMetadata({
                width: data.width,
                height: data.height,
                lat: data.lat,
                lon: data.lon,
                creator: data.creator,
                cameraType: data.camera_type,
                sequence: data.sequence
              });
            }
          } else {
            // Fallback to simple format
            setAnnotations(data);
          }
          setError(null);
        } catch (err) {
          setError('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFtpConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new FTPClient(ftpConfig);
      const result = await client.connect();
      
      if (result.success) {
        setFtpClient(client);
        setIsConnected(true);
        
        // Load file list
        const files = await client.listFiles();
        const imageFiles = files.filter(f => f.type === 'file' && /\.(jpg|jpeg|png|gif)$/i.test(f.name));
        const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
        
        const matches = matchImageWithAnnotations(imageFiles, jsonFiles);
        setImageList(matches);
        
        if (matches.length > 0) {
          await loadImageFromFtp(0);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to connect to FTP server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadImageFromFtp = async (index) => {
    if (!ftpClient || !imageList[index]) return;
    
    setLoading(true);
    try {
      const imageData = imageList[index];
      const imageFile = await ftpClient.downloadFile(imageData.image.name);
      const jsonFile = await ftpClient.downloadFile(imageData.annotations.name);
      
      // In a real implementation, you would process the downloaded files
      // For now, we'll simulate loading
      setCurrentImage(`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`);
      
      // Mock annotations data
      const mockAnnotations = [
        { x: 100, y: 100, width: 200, height: 150, class: 'person', confidence: 0.95 },
        { x: 300, y: 200, width: 150, height: 100, class: 'car', confidence: 0.87 }
      ];
      setAnnotations(mockAnnotations);
      
      setCurrentImageIndex(index);
    } catch (err) {
      setError('Failed to load image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateAnnotation = (index) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].validated = true;
    setAnnotations(updatedAnnotations);
  };

  const invalidateAnnotation = (index) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].validated = false;
    setAnnotations(updatedAnnotations);
  };

  const editAnnotation = (index) => {
    setEditingAnnotation(index);
  };

  const saveAnnotationEdit = (index, newClass) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].class = newClass;
    setAnnotations(updatedAnnotations);
    setEditingAnnotation(null);
  };

  const deleteAnnotation = (index) => {
    const updatedAnnotations = annotations.filter((_, i) => i !== index);
    setAnnotations(updatedAnnotations);
  };

  const nextImage = () => {
    if (currentImageIndex < imageList.length - 1) {
      const nextIndex = currentImageIndex + 1;
      // Clear previous annotations and reset zoom
      setAnnotations([]);
      setZoom(1);
      setCurrentImageMetadata(null);
      setHoveredAnnotation(null);
      setSelectedAnnotation(null);
      
      if (isConnected && ftpClient) {
        loadImageFromFtp(nextIndex);
      } else {
        setCurrentImageIndex(nextIndex);
      }
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      // Clear previous annotations and reset zoom
      setAnnotations([]);
      setZoom(1);
      setCurrentImageMetadata(null);
      setHoveredAnnotation(null);
      setSelectedAnnotation(null);
      
      if (isConnected && ftpClient) {
        loadImageFromFtp(prevIndex);
      } else {
        setCurrentImageIndex(prevIndex);
      }
    }
  };

  const handleImageSelect = (index) => {
    // Clear previous annotations and reset zoom when switching images
    setAnnotations([]);
    setZoom(1);
    setCurrentImageMetadata(null);
    setHoveredAnnotation(null);
    setSelectedAnnotation(null);
    
    if (isConnected && ftpClient) {
      loadImageFromFtp(index);
    } else {
      setCurrentImageIndex(index);
    }
  };

  const handleDownload = (imageData) => {
    // In a real implementation, this would trigger a download
    console.log('Downloading:', imageData);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleFitToScreen = () => {
    if (currentImage) {
      const img = new Image();
      img.onload = () => {
        const optimalZoom = calculateOptimalZoom(img.width, img.height);
        setZoom(optimalZoom);
        
        // Scroll to show the image after zoom
        setTimeout(() => {
          scrollToImage();
        }, 100);
      };
      img.src = currentImage;
    }
  };

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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annotation Visualizer</h1>
        <div className="header-controls">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowFtpConfig(!showFtpConfig)}
          >
            <Settings size={16} />
            FTP Settings
          </button>
        </div>
      </header>

      {showFtpConfig && (
        <div className="ftp-config">
          <h3>FTP Configuration</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Host"
              value={ftpConfig.host}
              onChange={(e) => setFtpConfig({...ftpConfig, host: e.target.value})}
            />
            <input
              type="text"
              placeholder="Username"
              value={ftpConfig.username}
              onChange={(e) => setFtpConfig({...ftpConfig, username: e.target.value})}
            />
            <input
              type="password"
              placeholder="Password"
              value={ftpConfig.password}
              onChange={(e) => setFtpConfig({...ftpConfig, password: e.target.value})}
            />
            <input
              type="number"
              placeholder="Port"
              value={ftpConfig.port}
              onChange={(e) => setFtpConfig({...ftpConfig, port: parseInt(e.target.value)})}
            />
            <button 
              className="btn btn-primary"
              onClick={handleFtpConnect}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="upload-section">
            <h3>Load Data</h3>
            <div className="upload-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Load Image
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => jsonInputRef.current?.click()}
              >
                <Upload size={16} />
                Load Annotations
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              style={{ display: 'none' }}
            />
          </div>

          {imageList.length > 0 && (
            <ImageGallery
              images={imageList}
              currentIndex={currentImageIndex}
              onImageSelect={handleImageSelect}
              onDownload={handleDownload}
            />
          )}

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

          <div className="annotations-section">
            <h3>Annotations ({annotations.length})</h3>
            <div className="annotations-list">
              {annotations.map((annotation, index) => (
                <div 
                  key={annotation.id || index} 
                  className={`annotation-item ${annotation.validated ? 'validated' : ''} ${hoveredAnnotation === index ? 'hovered' : ''} ${selectedAnnotation === index ? 'selected' : ''}`}
                  onMouseEnter={() => setHoveredAnnotation(index)}
                  onMouseLeave={() => setHoveredAnnotation(null)}
                  onClick={() => setSelectedAnnotation(selectedAnnotation === index ? null : index)}
                >
                  <div className="annotation-main">
                    <div className="annotation-info">
                      <span className="class-name">{formatClassName(annotation.class)}</span>
                      {annotation.confidence && annotation.confidence < 1 && (
                        <span className="confidence">{(annotation.confidence * 100).toFixed(1)}%</span>
                      )}
                      <span className="raw-class">({annotation.class})</span>
                    </div>
                    <div className="annotation-actions">
                      {editingAnnotation === index ? (
                        <button 
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveAnnotationEdit(index, document.querySelector('.edit-form input').value);
                          }}
                          title="Save"
                        >
                          <Save size={14} />
                        </button>
                      ) : (
                        <>
                          <button 
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              editAnnotation(index);
                            }}
                            title="Edit class"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              validateAnnotation(index);
                            }}
                            title="Validate"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              invalidateAnnotation(index);
                            }}
                            title="Invalidate"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingAnnotation === index && (
                    <div className="edit-form">
                      <input
                        type="text"
                        defaultValue={annotation.class}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveAnnotationEdit(index, e.target.value);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div 
          className="resize-handle"
          onMouseDown={handleMouseDown}
        ></div>

        <div className="canvas-container">
          {currentImage ? (
            <div className="image-viewer">
              <div className="canvas-wrapper">
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
                
                {/* Overlay Controls */}
                <div className="zoom-controls-overlay">
                  <button className="btn-icon" onClick={handleZoomOut} title="Zoom Out (Ctrl+-)">
                    <ZoomOut size={16} />
                  </button>
                  <button className="btn-icon" onClick={handleFitToScreen} title="Fit to Screen">
                    <Maximize size={16} />
                  </button>
                  <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
                  <button className="btn-icon" onClick={handleZoomIn} title="Zoom In (Ctrl++)">
                    <ZoomIn size={16} />
                  </button>
                  <button className="btn-icon" onClick={handleResetZoom} title="Reset Zoom (Ctrl+0)">
                    <RotateCcw size={16} />
                  </button>
                </div>
                
                <div className="image-controls-overlay">
                  <button onClick={prevImage} disabled={currentImageIndex === 0}>
                    Previous
                  </button>
                  <span>{currentImageIndex + 1} / {imageList.length || 1}</span>
                  <button onClick={nextImage} disabled={currentImageIndex >= imageList.length - 1}>
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
