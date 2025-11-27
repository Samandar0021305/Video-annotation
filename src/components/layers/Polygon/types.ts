export interface PolygonPoint {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: PolygonPoint[];
  label?: string;
  color: string;
  classId?: number;
  value?: number;
}

export interface PolygonTrack {
  trackId: string;
  keyframes: Map<number, Polygon>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface PolygonClass {
  value: number;
  name: string;
  color: string;
}

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
