import { useCallback } from 'react';

export const useZoomOperations = ({
  zoom,
  setZoom,
  setPanOffset,
  canvasWrapperRef,
  currentImage
}) => {
  const calculateOptimalZoom = useCallback((imgWidth, imgHeight) => {
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (!canvasWrapper) return 1;

    const containerWidth = canvasWrapper.clientWidth - 60; // Account for padding and positioning
    const containerHeight = canvasWrapper.clientHeight - 60; // Account for padding and positioning

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;

    // Use the smaller scale to ensure the image fits completely
    const optimalScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    return Math.max(optimalScale, 0.1); // Minimum 10% zoom
  }, []);

  const scrollToImage = useCallback(() => {
    const canvasWrapper = canvasWrapperRef.current;
    if (canvasWrapper) {
      // Wait for the image to load and render
      setTimeout(() => {
        const centerX = Math.max(0, (canvasWrapper.scrollWidth - canvasWrapper.clientWidth) / 2);
        const centerY = Math.max(0, (canvasWrapper.scrollHeight - canvasWrapper.clientHeight) / 2);

        canvasWrapper.scrollLeft = centerX;
        canvasWrapper.scrollTop = centerY;

        setPanOffset({ x: 0, y: 0 });
      }, 100);
    }
  }, [canvasWrapperRef, setPanOffset]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, [setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, [setZoom]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    scrollToImage();
  }, [setZoom, setPanOffset, scrollToImage]);

  const handleFitToScreen = useCallback(() => {
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
  }, [currentImage, calculateOptimalZoom, setZoom, scrollToImage]);

  return {
    calculateOptimalZoom,
    scrollToImage,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen
  };
};
