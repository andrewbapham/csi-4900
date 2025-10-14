import { Annotation } from '@/types';
import React, { useCallback } from 'react';

export const useAnnotationOperations = ({
  annotations,
  setAnnotations,
  setEditingAnnotation
}: {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  setEditingAnnotation: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const validateAnnotation = useCallback((id: string) => {
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id
        ? { ...annotation, validated: true }
        : annotation
    );
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  const invalidateAnnotation = useCallback((id: string) => {
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id
        ? { ...annotation, validated: false }
        : annotation
    );
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  const editAnnotation = useCallback((id: string) => {
    setEditingAnnotation(id);
  }, [setEditingAnnotation]);

  const saveAnnotationEdit = useCallback((id: string, newValue: string) => {
    console.log('Saving annotation edit:', { id, newValue });
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id 
        ? { ...annotation, value: newValue }
        : annotation
    );
    console.log('Updated annotations:', updatedAnnotations);
    setAnnotations(updatedAnnotations);
    setEditingAnnotation(null);
  }, [annotations, setAnnotations, setEditingAnnotation]);

  const deleteAnnotation = useCallback((id: string) => {
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id
        ? { ...annotation, deleted: true }
        : annotation
    );
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  const restoreAnnotation = useCallback((id: string) => {
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id
        ? { ...annotation, deleted: false }
        : annotation
    );
    setAnnotations(updatedAnnotations);
  }, [annotations, setAnnotations]);

  return {
    validateAnnotation,
    invalidateAnnotation,
    editAnnotation,
    saveAnnotationEdit,
    deleteAnnotation,
    restoreAnnotation
  };
};
