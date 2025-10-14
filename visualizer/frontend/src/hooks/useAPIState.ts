import { useState } from 'react';
import { Pagination } from '@/types';

export const useAPIState = () => {
  const [apiImages, setApiImages] = useState<string[]>([]);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [apiBaseUrl] = useState<string>('http://localhost:8000');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);

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
