/**
 * Utility functions for coordinate transformations between screen and image coordinates
 */

/**
 * Convert screen coordinates to image coordinates
 * @param {number} screenX - Screen X coordinate (client coordinates)
 * @param {number} screenY - Screen Y coordinate (client coordinates)
 * @param {HTMLElement} canvasWrapper - Canvas wrapper element
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} zoom - Current zoom level
 * @returns {Object} Image coordinates {x, y}
 */
export const screenToImageCoordinates = (screenX, screenY, canvasWrapper, canvas, zoom) => {
    if (!canvasWrapper || !canvas) {
        return { x: 0, y: 0 };
    }

    // Get the canvas bounding rect (this accounts for the CSS transform scaling)
    const canvasRect = canvas.getBoundingClientRect();

    // Calculate the position relative to the canvas
    const relativeX = screenX - canvasRect.left;
    const relativeY = screenY - canvasRect.top;

    // Convert from scaled canvas coordinates to actual canvas coordinates
    // The canvas is scaled by CSS transform, so we need to account for that
    const scaleRatio = canvasRect.width / canvas.width;

    const imageX = relativeX / scaleRatio;
    const imageY = relativeY / scaleRatio;

    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(imageX, canvas.width));
    const clampedY = Math.max(0, Math.min(imageY, canvas.height));

    // Debug logging
    console.log('Coordinate transformation:', {
        screen: { x: screenX, y: screenY },
        canvasRect: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
        canvasSize: { width: canvas.width, height: canvas.height },
        relative: { x: relativeX, y: relativeY },
        scaleRatio,
        image: { x: imageX, y: imageY },
        clamped: { x: clampedX, y: clampedY },
        zoom
    });

    return { x: Math.round(clampedX), y: Math.round(clampedY) };
};

/**
 * Convert image coordinates to screen coordinates
 * @param {number} imageX - Image X coordinate
 * @param {number} imageY - Image Y coordinate
 * @param {HTMLElement} canvasWrapper - Canvas wrapper element
 * @param {number} zoom - Current zoom level
 * @returns {Object} Screen coordinates {x, y}
 */
export const imageToScreenCoordinates = (imageX, imageY, canvasWrapper, zoom) => {
    if (!canvasWrapper) {
        return { x: 0, y: 0 };
    }

    const wrapperRect = canvasWrapper.getBoundingClientRect();
    const scrollX = canvasWrapper.scrollLeft;
    const scrollY = canvasWrapper.scrollTop;

    const screenX = (imageX * zoom) - scrollX + wrapperRect.left;
    const screenY = (imageY * zoom) - scrollY + wrapperRect.top;

    return { x: screenX, y: screenY };
};

/**
 * Create a bounding box from two points
 * @param {Object} startPoint - Starting point {x, y}
 * @param {Object} endPoint - Ending point {x, y}
 * @returns {Object} Bounding box {x, y, width, height}
 */
export const createBoundingBox = (startPoint, endPoint) => {
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    return { x, y, width, height };
};

/**
 * Convert bounding box to API format [x1, y1, x2, y2]
 * @param {Object} bbox - Bounding box {x, y, width, height}
 * @returns {Array} API format [x1, y1, x2, y2]
 */
export const bboxToApiFormat = (bbox) => {
    return [
        bbox.x,
        bbox.y,
        bbox.x + bbox.width,
        bbox.y + bbox.height
    ];
};

/**
 * Validate that a bounding box has minimum dimensions
 * @param {Object} bbox - Bounding box {x, y, width, height}
 * @param {number} minSize - Minimum width/height (default: 10)
 * @returns {boolean} True if bbox is valid
 */
export const isValidBoundingBox = (bbox, minSize = 10) => {
    return bbox && bbox.width >= minSize && bbox.height >= minSize;
};
