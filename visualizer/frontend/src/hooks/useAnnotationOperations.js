import { useCallback } from 'react';

export const useAnnotationOperations = ({
  annotations,
  setAnnotations,
  setEditingAnnotation
}) => {
  const validateAnnotation = useCallback((index) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].validated = true;
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  const invalidateAnnotation = useCallback((index) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].validated = false;
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  const editAnnotation = useCallback((index) => {
    setEditingAnnotation(index);
  }, [setEditingAnnotation]);

  const saveAnnotationEdit = useCallback((index, newClass) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index].class = newClass;
    setAnnotations(updatedAnnotations);
    setEditingAnnotation(null);
  }, [annotations, setAnnotations, setEditingAnnotation]);

  const deleteAnnotation = useCallback((index) => {
    const updatedAnnotations = annotations.filter((_, i) => i !== index);
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  return {
    validateAnnotation,
    invalidateAnnotation,
    editAnnotation,
    saveAnnotationEdit,
    deleteAnnotation
  };
};
