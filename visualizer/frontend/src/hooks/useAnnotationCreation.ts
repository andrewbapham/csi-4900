import React, { useCallback } from "react";
import {
    screenToImageCoordinates,
    createBoundingBox,
    imageBboxToBoundingBox,
    isValidImageBoundingBox,
    ImageBoundingBox,
} from "../utils/coordinateUtils";
import { Annotation } from "@/types";



interface useAnnotationCreationProps {
    annotationMode: boolean;
    setAnnotationMode: (mode: boolean) => void;
    isDrawingAnnotation: boolean;
    setIsDrawingAnnotation: (drawing: boolean) => void;
    currentBbox: ImageBoundingBox | null;
    setCurrentBbox: (bbox: ImageBoundingBox | null) => void;
    drawingStartPoint: { x: number; y: number } | null;
    setDrawingStartPoint: (point: { x: number; y: number } | null) => void;
    selectedClass: string;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    canvasWrapperRef: React.RefObject<HTMLDivElement>;
    zoom: number;
    currentImageId: string | null;
    apiBaseUrl: string;
    setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}
export const useAnnotationCreation = ({
    annotationMode,
    setAnnotationMode,
    isDrawingAnnotation,
    setIsDrawingAnnotation,
    currentBbox,
    setCurrentBbox,
    drawingStartPoint,
    setDrawingStartPoint,
    selectedClass,
    canvasRef,
    canvasWrapperRef,
    zoom,
    currentImageId,
    apiBaseUrl,
    setAnnotations,
    setError,
}: useAnnotationCreationProps) => {
    // Handle mouse down to start drawing
    const handleDrawingMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!annotationMode || isDrawingAnnotation) return;

            const canvas = canvasRef.current;
            const canvasWrapper = canvasWrapperRef.current;

            if (!canvas || !canvasWrapper) return;

            // Convert screen coordinates to image coordinates
            const imageCoords = screenToImageCoordinates(
                event.clientX,
                event.clientY,
                canvasWrapper,
                canvas,
                zoom
            );

            setDrawingStartPoint(imageCoords);
            setIsDrawingAnnotation(true);
            setCurrentBbox({ x: imageCoords.x, y: imageCoords.y, width: 0, height: 0 });

            // Prevent default to avoid conflicts with panning
            event.preventDefault();
            event.stopPropagation();
        },
        [
            annotationMode,
            isDrawingAnnotation,
            canvasRef,
            canvasWrapperRef,
            zoom,
            setDrawingStartPoint,
            setIsDrawingAnnotation,
            setCurrentBbox,
        ]
    );

    // Handle mouse move while drawing
    const handleDrawingMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDrawingAnnotation || !drawingStartPoint) return;

            const canvas = canvasRef.current;
            const canvasWrapper = canvasWrapperRef.current;

            if (!canvas || !canvasWrapper) return;

            // Convert screen coordinates to image coordinates
            const imageCoords = screenToImageCoordinates(
                event.clientX,
                event.clientY,
                canvasWrapper,
                canvas,
                zoom
            );

            // Create bounding box from start point to current point
            const bbox = createBoundingBox(drawingStartPoint, imageCoords);
            setCurrentBbox(bbox);
        },
        [
            isDrawingAnnotation,
            drawingStartPoint,
            canvasRef,
            canvasWrapperRef,
            zoom,
            setCurrentBbox,
        ]
    );

    // Handle mouse up to finish drawing
    const handleDrawingMouseUp = useCallback(
        async () => {
            if (!isDrawingAnnotation || !currentBbox || !drawingStartPoint) return;

            // Check if bounding box is valid (minimum size)
            if (!isValidImageBoundingBox(currentBbox, 10)) {
                // Cancel drawing if too small
                setIsDrawingAnnotation(false);
                setCurrentBbox(null);
                setDrawingStartPoint(null);
                return;
            }

            try {
                // Generate unique ID for the annotation
                const annotationId = Date.now();

                // Convert to API format
                const apiAnnotation = {
                    id: annotationId,
                    value: selectedClass,
                    geometry: "", // Empty geometry for new annotations
                    bbox: imageBboxToBoundingBox(currentBbox),
                };

                // Save to API
                if (currentImageId) {
                    const response = await fetch(
                        `${apiBaseUrl}/api/images/${currentImageId}/annotations`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(apiAnnotation),
                        }
                    );

                    if (response.ok) {
                        const result = await response.json();

                        // Add to local annotations state
                        const newAnnotation: Annotation = {
                            id: result.annotation.id,
                            value: selectedClass,
                            geometry: "",
                            bbox: imageBboxToBoundingBox(currentBbox),
                            image_id: parseInt(currentImageId),
                        };

                        setAnnotations((prev: Annotation[]) => [...prev, newAnnotation]);

                        // Reset drawing state
                        setIsDrawingAnnotation(false);
                        setCurrentBbox(null);
                        setDrawingStartPoint(null);
                    } else {
                        const errorData = await response.json();
                        setError(`Failed to save annotation: ${errorData.detail || "Unknown error"}`);

                        // Reset drawing state on error
                        setIsDrawingAnnotation(false);
                        setCurrentBbox(null);
                        setDrawingStartPoint(null);
                    }
                } else {
                    setError("No image selected for annotation");
                    // Reset drawing state on error
                    setIsDrawingAnnotation(false);
                    setCurrentBbox(null);
                    setDrawingStartPoint(null);
                }
            } catch (err) {
                setError(`Error saving annotation: ${(err as Error).message}`);

                // Reset drawing state on error
                setIsDrawingAnnotation(false);
                setCurrentBbox(null);
                setDrawingStartPoint(null);
            }
        },
        [
            isDrawingAnnotation,
            currentBbox,
            drawingStartPoint,
            selectedClass,
            currentImageId,
            apiBaseUrl,
            setAnnotations,
            setError,
            setIsDrawingAnnotation,
            setCurrentBbox,
            setDrawingStartPoint,
        ]
    );

    // Cancel drawing
    const cancelDrawing = useCallback(() => {
        setIsDrawingAnnotation(false);
        setCurrentBbox(null);
        setDrawingStartPoint(null);
    }, [setIsDrawingAnnotation, setCurrentBbox, setDrawingStartPoint]);

    // Exit annotation mode
    const exitAnnotationMode = useCallback(() => {
        cancelDrawing();
        setAnnotationMode(false);
    }, [cancelDrawing, setAnnotationMode]);

    return {
        handleDrawingMouseDown,
        handleDrawingMouseMove,
        handleDrawingMouseUp,
        cancelDrawing,
        exitAnnotationMode,
    };
};
