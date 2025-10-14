/**
 * Utility functions for coordinate transformations between screen and image coordinates
 */

/**
 * Point interface for coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Bounding box interface for image coordinates (x, y, width, height)
 */
export interface ImageBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bounding box interface for API format (south, west, north, east)
 */
export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Convert screen coordinates to image coordinates
 * @param screenX - Screen X coordinate (client coordinates)
 * @param screenY - Screen Y coordinate (client coordinates)
 * @param canvasWrapper - Canvas wrapper element
 * @param canvas - Canvas element
 * @param zoom - Current zoom level
 * @returns Image coordinates {x, y}
 */
export const screenToImageCoordinates = (
  screenX: number,
  screenY: number,
  canvasWrapper: HTMLElement | null,
  canvas: HTMLCanvasElement | null,
  zoom: number
): Point => {
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

  return { x: Math.round(clampedX), y: Math.round(clampedY) };
};

/**
 * Convert image coordinates to screen coordinates
 * @param imageX - Image X coordinate
 * @param imageY - Image Y coordinate
 * @param canvasWrapper - Canvas wrapper element
 * @param zoom - Current zoom level
 * @returns Screen coordinates {x, y}
 */
export const imageToScreenCoordinates = (
  imageX: number,
  imageY: number,
  canvasWrapper: HTMLElement | null,
  zoom: number
): Point => {
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
 * @param startPoint - Starting point {x, y}
 * @param endPoint - Ending point {x, y}
 * @returns Image bounding box {x, y, width, height}
 */
export const createBoundingBox = (startPoint: Point, endPoint: Point): ImageBoundingBox => {
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  return { x, y, width, height };
};

/**
 * Convert image bounding box to API format [x1, y1, x2, y2]
 * @param bbox - Image bounding box {x, y, width, height}
 * @returns API format [x1, y1, x2, y2]
 */
export const imageBboxToApiFormat = (bbox: ImageBoundingBox): [number, number, number, number] => {
  return [
    bbox.x,
    bbox.y,
    bbox.x + bbox.width,
    bbox.y + bbox.height
  ];
};

/**
 * Convert API format array to BoundingBox object
 * @param bboxArray - API format [x1, y1, x2, y2] where (x1,y1) is top-left, (x2,y2) is bottom-right
 * @returns BoundingBox object {south, west, north, east}
 */
export const apiFormatToBoundingBox = (bboxArray: [number, number, number, number]): BoundingBox => {
  const [x1, y1, x2, y2] = bboxArray;
  return { 
    south: y1,  // top-left y becomes south
    west: x1,   // top-left x becomes west
    north: y2,  // bottom-right y becomes north
    east: x2    // bottom-right x becomes east
  };
};

/**
 * Convert BoundingBox object to API format array
 * @param bbox - BoundingBox object {south, west, north, east}
 * @returns API format [x1, y1, x2, y2] where (x1,y1) is top-left, (x2,y2) is bottom-right
 */
export const boundingBoxToApiFormat = (bbox: BoundingBox): [number, number, number, number] => {
  return [bbox.west, bbox.south, bbox.east, bbox.north];
};

/**
 * Convert image bounding box to BoundingBox object (for API storage)
 * @param imageBbox - Image bounding box {x, y, width, height}
 * @returns BoundingBox object {south, west, north, east}
 */
export const imageBboxToBoundingBox = (imageBbox: ImageBoundingBox): BoundingBox => {
  return {
    south: imageBbox.y,  // top-left y
    west: imageBbox.x,   // top-left x
    north: imageBbox.y + imageBbox.height,  // bottom-right y
    east: imageBbox.x + imageBbox.width     // bottom-right x
  };
};

/**
 * Convert BoundingBox object to image bounding box (for rendering)
 * @param bbox - BoundingBox object {south, west, north, east}
 * @returns Image bounding box {x, y, width, height}
 */
export const boundingBoxToImageBbox = (bbox: BoundingBox): ImageBoundingBox => {
  return {
    x: bbox.west,  // left edge
    y: bbox.south, // top edge
    width: bbox.east - bbox.west,   // right - left
    height: bbox.north - bbox.south // bottom - top
  };
};

/**
 * Validate that an image bounding box has minimum dimensions
 * @param bbox - Image bounding box {x, y, width, height}
 * @param minSize - Minimum width/height (default: 10)
 * @returns True if bbox is valid
 */
export const isValidImageBoundingBox = (bbox: ImageBoundingBox | null | undefined, minSize: number = 10): boolean => {
  return bbox !== null && bbox !== undefined && bbox.width >= minSize && bbox.height >= minSize;
};

/**
 * Validate that a bounding box has minimum dimensions
 * @param bbox - Bounding box {south, west, north, east}
 * @param minSize - Minimum width/height (default: 10)
 * @returns True if bbox is valid
 */
export const isValidBoundingBox = (bbox: BoundingBox | null | undefined, minSize: number = 10): boolean => {
  if (!bbox) return false;
  const width = bbox.east - bbox.west;
  const height = bbox.north - bbox.south;
  return width >= minSize && height >= minSize;
};
