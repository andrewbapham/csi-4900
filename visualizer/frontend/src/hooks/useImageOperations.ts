import { Annotation, AnnotationApiResponse, ImageMetadata, ImageData } from '@/types';
import React, { useCallback, type Dispatch, type SetStateAction } from 'react';
import { apiFormatToBoundingBox } from '../utils/coordinateUtils';

interface UseImageOperationsProps {
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setCurrentImageMetadata: React.Dispatch<React.SetStateAction<ImageMetadata | null>>;
  setHoveredAnnotation: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAnnotation: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentImage: React.Dispatch<React.SetStateAction<ImageData | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useImageOperations = ({
  setAnnotations,
  setZoom,
  setPanOffset,
  setCurrentImageMetadata,
  setHoveredAnnotation,
  setSelectedAnnotation,
  setCurrentImage,
  setError,
}: UseImageOperationsProps) => {
  const clearImageState = useCallback(() => {
    setAnnotations([]);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setCurrentImageMetadata(null);
    setHoveredAnnotation(null);
    setSelectedAnnotation(null);
  }, [setAnnotations, setZoom, setPanOffset, setCurrentImageMetadata, setHoveredAnnotation, setSelectedAnnotation]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        clearImageState();
        const result = e.target?.result;
        if (typeof result === 'string') {
          setCurrentImage({ id: `local-${Date.now()}` as string, url: result });
        }
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, [clearImageState, setCurrentImage, setError]);

  const handleJsonUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') {
            throw new Error('Empty or invalid JSON');
          }
          const data: AnnotationApiResponse | Annotation[] = JSON.parse(text);
          // Normalized handling
          if ((data as AnnotationApiResponse).detections && Array.isArray((data as AnnotationApiResponse).detections)) {
            const payload = data as AnnotationApiResponse;
            const processedAnnotations: Annotation[] = payload.detections.map((detection: any) => ({
              ...detection,
              bbox: apiFormatToBoundingBox(detection.bbox as [number, number, number, number])
            }));
            setAnnotations(processedAnnotations);

            if (payload.width && payload.height) {
              setCurrentImageMetadata({
                id: payload.id ?? '',
                filename: payload.filename ?? '',
                width: payload.width,
                height: payload.height,
                lat: payload.lat ?? null,
                lon: payload.lon ?? null,
                creator: payload.creator ?? null,
                annotations: processedAnnotations,
                sequence: payload.sequence ?? null,
              });
            }
          } else {
            // Handle case where data is already an array of annotations
            const annotations = data as Annotation[];
            const processedAnnotations = annotations.map((annotation: any) => ({
              ...annotation,
              bbox: Array.isArray(annotation.bbox) 
                ? apiFormatToBoundingBox(annotation.bbox as [number, number, number, number])
                : annotation.bbox
            }));
            setAnnotations(processedAnnotations);
          }
          setError(null);
        } catch {
          setError('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    }
  }, [setAnnotations, setCurrentImageMetadata, setError]);

  return {
    clearImageState,
    handleImageUpload,
    handleJsonUpload,
  };
};
