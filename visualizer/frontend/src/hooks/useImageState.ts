import { useState, useRef } from 'react';
import { ImageData, ImageMetadata, Annotation, CanvasPosition } from '../types';
import { ImageBoundingBox } from '../utils/coordinateUtils';

export const useImageState = () => {
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [currentImageMetadata, setCurrentImageMetadata] = useState<ImageMetadata | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<CanvasPosition>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastPanPoint, setLastPanPoint] = useState<CanvasPosition>({ x: 0, y: 0 });
  const [isDrawingAnnotation, setIsDrawingAnnotation] = useState<boolean>(false);
  const [currentBbox, setCurrentBbox] = useState<ImageBoundingBox | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [drawingStartPoint, setDrawingStartPoint] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

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
    isDrawingAnnotation,
    setIsDrawingAnnotation,
    currentBbox,
    setCurrentBbox,
    selectedClass,
    setSelectedClass,
    drawingStartPoint,
    setDrawingStartPoint,
    
    // Refs
    canvasRef,
    fileInputRef,
    jsonInputRef,
    canvasWrapperRef
  };
};
