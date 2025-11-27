export interface SkeletonPoint {
  x: number;
  y: number;
}

export interface Skeleton {
  id: string;
  points: SkeletonPoint[];
  label?: string;
  color: string;
  classId?: number;
  value?: number;
}

export interface SkeletonTrack {
  trackId: string;
  keyframes: Map<number, Skeleton>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface SkeletonClass {
  value: number;
  name: string;
  color: string;
}

export interface SkeletonLayerProps {
  skeletons: Skeleton[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
  canEdit: boolean;
}

export interface SkeletonLayerEmits {
  (e: "click", event: SkeletonClickEvent): void;
  (e: "drag-end", event: SkeletonDragEvent): void;
  (e: "keypoint-drag-start", event: SkeletonKeypointEvent): void;
  (e: "keypoint-drag-move", event: SkeletonKeypointEvent): void;
  (e: "keypoint-drag-end", event: SkeletonKeypointEvent): void;
  (e: "keypoint-click", trackId: string): void;
}

export interface SkeletonClickEvent {
  trackId: string;
  originalEvent: any;
}

export interface SkeletonDragEvent {
  trackId: string;
  deltaX: number;
  deltaY: number;
  originalEvent: any;
}

export interface SkeletonKeypointEvent {
  trackId: string;
  pointIndex: number;
  x: number;
  y: number;
  originalEvent: any;
}

export interface PendingSkeleton {
  points: SkeletonPoint[];
  frame: number;
}

export interface SkeletonDrawingState {
  isDrawing: boolean;
  points: SkeletonPoint[];
}
