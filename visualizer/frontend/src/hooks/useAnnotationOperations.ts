import { Annotation } from '@/types';
import { useCallback } from 'react';

export const useAnnotationOperations = ({
  annotations,
  setAnnotations,
  setEditingAnnotation
}: {
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  setEditingAnnotation: (id: string) => void;
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

  const saveAnnotationEdit = useCallback((id: string, newLabel: string) => {
    const updatedAnnotations = annotations.map((annotation: Annotation) => 
      annotation.id === id 
        ? { ...annotation, label: newLabel, className: newLabel }
        : annotation
    );
    setAnnotations(updatedAnnotations);
    setEditingAnnotation("");
  }, [annotations, setAnnotations, setEditingAnnotation]);

  const deleteAnnotation = useCallback((index: number) => {
    const updatedAnnotations = annotations.filter((_: Annotation, i: number) => i !== index);
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
