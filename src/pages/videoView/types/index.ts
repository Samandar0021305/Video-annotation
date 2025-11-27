export type TrackType = "bbox" | "polygon" | "skeleton" | "brush";

export interface PendingBbox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  frame: number;
}

export interface PendingPolygon {
  points: Array<{ x: number; y: number }>;
  frame: number;
}

export interface PendingSkeleton {
  points: Array<{ x: number; y: number }>;
  frame: number;
}

export interface PendingBrush {
  canvas: HTMLCanvasElement;
  frame: number;
}

export interface TempBrushStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  frame: number;
}

export interface ColocatedPoint {
  skeletonId: string;
  pointIdx: number;
}

export interface Point {
  x: number;
  y: number;
}
