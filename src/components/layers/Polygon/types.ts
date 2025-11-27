import type { Polygon, PolygonTrack, PolygonPoint } from "../../../types/polygon";

export interface PolygonLayerProps {
  polygons: Polygon[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
  canEdit: boolean;
}

export interface PolygonLayerEmits {
  (e: "click", event: PolygonClickEvent): void;
  (e: "drag-end", event: PolygonDragEvent): void;
  (e: "vertex-drag-move", event: PolygonVertexEvent): void;
  (e: "vertex-drag-end", event: PolygonVertexEvent): void;
  (e: "vertex-click", trackId: string): void;
}

export interface PolygonClickEvent {
  trackId: string;
  originalEvent: any;
}

export interface PolygonDragEvent {
  trackId: string;
  deltaX: number;
  deltaY: number;
  originalEvent: any;
}

export interface PolygonVertexEvent {
  trackId: string;
  pointIndex: number;
  x: number;
  y: number;
  originalEvent: any;
}

export interface PendingPolygon {
  points: PolygonPoint[];
  frame: number;
}

export interface PolygonDrawingState {
  isDrawing: boolean;
  points: PolygonPoint[];
}

export type { Polygon, PolygonTrack, PolygonPoint };
