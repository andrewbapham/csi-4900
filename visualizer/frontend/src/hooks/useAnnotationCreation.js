import { useCallback } from "react";
import {
    screenToImageCoordinates,
    createBoundingBox,
    bboxToApiFormat,
    isValidBoundingBox,
} from "../utils/coordinateUtils";

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
}) => {
    // Handle mouse down to start drawing
    const handleDrawingMouseDown = useCallback(
        (event) => {
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
            console.log("imageCoords", imageCoords);

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
        (event) => {
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
            console.log('Mouse move - bbox update:', bbox, 'from', drawingStartPoint, 'to', imageCoords);
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
        async (event) => {
            if (!isDrawingAnnotation || !currentBbox || !drawingStartPoint) return;

            // Check if bounding box is valid (minimum size)
            if (!isValidBoundingBox(currentBbox, 10)) {
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
                    bbox: bboxToApiFormat(currentBbox),
                };

                // Save to API
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
                    const newAnnotation = {
                        id: result.annotation.id,
                        x: currentBbox.x,
                        y: currentBbox.y,
                        width: currentBbox.width,
                        height: currentBbox.height,
                        class: selectedClass,
                        confidence: 1.0,
                        imageId: currentImageId,
                    };

                    setAnnotations((prev) => [...prev, newAnnotation]);

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
            } catch (err) {
                setError(`Error saving annotation: ${err.message}`);

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
