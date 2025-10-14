import { useState } from 'react';

export const useUIState = () => {
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(350);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
    setIsDragging
  };
};
