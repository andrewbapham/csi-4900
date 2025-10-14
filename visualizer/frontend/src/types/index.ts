
export interface Creator {
  id: string;
  username: string;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Annotation {
  id: string;
  value: string;
  geometry: string;
  bbox: BoundingBox;
  image_id: number;
  validated?: boolean;
  deleted?: boolean;
}
export interface AnnotationApiResponse {
  id: string;
  url: string
  cameraType: string;
  sequence: string;
  creator: Creator;
  filename: string;
  width: number;
  height: number;
  lat: number;
  lon: number;
  detections: Annotation[];
}
export interface ImageMetadata {
  id: string;
  filename: string;
  width: number;
  height: number;
  annotations: Annotation[];
  lat: number;
  lon: number;
  sequence: string;
  creator: Creator | null;
  cameraType?: string;
}

export interface ImageData {
  id: string;
  url: string;
  metadata?: ImageMetadata;
}


export interface CanvasPosition {
  x: number;
  y: number;
}

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface UIState {
  sidebarWidth: number;
  isPanning: boolean;
  lastPanX: number;
  lastPanY: number;
}

export interface ImageState {
  currentImageIndex: number;
  currentImage: ImageData | null;
  currentImageMetadata: ImageMetadata | null;
  annotations: Annotation[];
  hoveredAnnotation: string | null;
  selectedAnnotation: string | null;
  editingAnnotation: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageRef: React.RefObject<HTMLImageElement>;
}

export interface APIState {
  apiImages: string[];
  loading: boolean;
  error: string | null;
  apiBaseUrl: string;
}

export interface ImageOperations {
  nextImage: () => void;
  prevImage: () => void;
  handleImageSelect: (index: number) => Promise<void>;
  loadImageFromApi: (imageId: string) => Promise<void>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: (imageUrl: string) => void;
}

export interface AnnotationOperations {
  editAnnotation: (annotationId: string) => void;
  saveAnnotationEdit: (annotationId: string, newValue: string) => void;
  validateAnnotation: (annotationId: string) => void;
  invalidateAnnotation: (annotationId: string) => void;
  formatClassName: (className: string | undefined | null) => string;
}

export interface ZoomOperations {
  handleZoom: (delta: number, centerX?: number, centerY?: number) => void;
  handleWheel: (event: React.WheelEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: () => void;
  resetZoom: () => void;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
  total_images: number;
}

