import { useState, useRef } from 'react';

export const useImageState = () => {
  const [currentImage, setCurrentImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageMetadata, setCurrentImageMetadata] = useState(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const canvasWrapperRef = useRef(null);

  return {
    // State
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
    
    // Refs
    canvasRef,
    fileInputRef,
    jsonInputRef,
    canvasWrapperRef
  };
};
