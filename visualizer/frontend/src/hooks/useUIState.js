import { useState } from 'react';

export const useUIState = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isDragging, setIsDragging] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);

  return {
    isValidating,
    setIsValidating,
    loading,
    setLoading,
    error,
    setError,
    sidebarWidth,
    setSidebarWidth,
    isDragging,
    setIsDragging,
    annotationMode,
    setAnnotationMode
  };
};
