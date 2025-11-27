import type { BoundingBox, BoundingBoxTrack } from "../../../types/boundingBox";

export interface BoundingBoxLayerProps {
  bboxes: BoundingBox[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
  canEdit: boolean;
}

export interface BoundingBoxLayerEmits {
  (e: "click", event: BoundingBoxClickEvent): void;
  (e: "drag-end", event: BoundingBoxDragEvent): void;
  (e: "transform-end", event: BoundingBoxTransformEvent): void;
}

export interface BoundingBoxClickEvent {
  trackId: string;
  originalEvent: any;
}

export interface BoundingBoxDragEvent {
  trackId: string;
  x: number;
  y: number;
  originalEvent: any;
}

export interface BoundingBoxTransformEvent {
  trackId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PendingBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  frame: number;
}

export interface BoundingBoxDrawingState {
  isDrawing: boolean;
  startPos: { x: number; y: number } | null;
  currentPos: { x: number; y: number } | null;
}

export type { BoundingBox, BoundingBoxTrack };
