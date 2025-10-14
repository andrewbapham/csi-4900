export interface Annotation {
  id: string;
  label: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  className?: string;
  validated: boolean
}

export interface ImageMetadata {
  id: string;
  filename: string;
  width: number;
  height: number;
  annotations?: Annotation[];
  [key: string]: any;
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
  handleImageSelect: (index: number) => void;
  loadImageFromApi: (imageId: string) => Promise<void>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: (imageUrl: string) => void;
}

export interface AnnotationOperations {
  editAnnotation: (annotationId: string) => void;
  saveAnnotationEdit: (annotationId: string, newLabel: string) => void;
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
