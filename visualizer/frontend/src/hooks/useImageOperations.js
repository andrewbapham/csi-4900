import { useCallback } from 'react';

export const useImageOperations = ({
  setAnnotations,
  setZoom,
  setPanOffset,
  setCurrentImageMetadata,
  setHoveredAnnotation,
  setSelectedAnnotation,
  setCurrentImage,
  setError,
  setCurrentImageIndex
}) => {
  const clearImageState = useCallback(() => {
    setAnnotations([]);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setCurrentImageMetadata(null);
    setHoveredAnnotation(null);
    setSelectedAnnotation(null);
  }, [setAnnotations, setZoom, setPanOffset, setCurrentImageMetadata, setHoveredAnnotation, setSelectedAnnotation]);

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        clearImageState();
        setCurrentImage(e.target.result);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, [clearImageState, setCurrentImage, setError]);

  const handleJsonUpload = useCallback((event) => {
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
  }, [setAnnotations, setCurrentImageMetadata, setError]);

  return {
    clearImageState,
    handleImageUpload,
    handleJsonUpload
  };
};
