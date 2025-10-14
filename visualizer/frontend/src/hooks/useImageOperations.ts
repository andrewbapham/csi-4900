import { Annotation, AnnotationApiResponse, ImageMetadata, ImageData } from '@/types';
import { useCallback, type Dispatch, type SetStateAction } from 'react';

interface UseImageOperationsProps {
  setAnnotations: (annotations: Annotation[]) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (pos: { x: number; y: number }) => void;
  setCurrentImageMetadata: (metadata: ImageMetadata | null) => void;
  setHoveredAnnotation: (id: string | null) => void;
  setSelectedAnnotation: (id: string | null) => void;
  setCurrentImage: Dispatch<SetStateAction<ImageData | null>>;
  setError: (message: string | null) => void;
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
            const processedAnnotations: Annotation[] = payload.detections;
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
            setAnnotations(data as Annotation[]);
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
