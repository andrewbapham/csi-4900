import { useState } from 'react';

export const useAPIState = () => {
  const [apiImages, setApiImages] = useState([]);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [apiBaseUrl] = useState('http://localhost:8000');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingImages, setLoadingImages] = useState(false);

  return {
    apiImages,
    setApiImages,
    currentImageId,
    setCurrentImageId,
    apiBaseUrl,
    pagination,
    setPagination,
    currentPage,
    setCurrentPage,
    loadingImages,
    setLoadingImages
  };
};
