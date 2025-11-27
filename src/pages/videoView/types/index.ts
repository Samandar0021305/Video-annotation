import type { TrackTypeValue, ToolModeValue, SegmentationEditModeValue } from "../enums";

// Re-export enum types for convenience
export type TrackType = TrackTypeValue;
export type ToolMode = ToolModeValue;
export type SegmentationEditMode = SegmentationEditModeValue;

export interface Point {
  x: number;
  y: number;
}

export interface PendingBbox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  frame: number;
}

export interface PendingPolygon {
  points: Point[];
  frame: number;
}

export interface PendingSkeleton {
  points: Point[];
  frame: number;
}

export interface PendingBrush {
  canvas: HTMLCanvasElement;
  frame: number;
}

export interface TempBrushStroke {
  points: Point[];
  color: string;
  size: number;
  frame: number;
}

export interface ColocatedPoint {
  skeletonId: string;
  pointIdx: number;
}

export interface BrushAnnotationCanvasData {
  nonSelectedCanvas: HTMLCanvasElement | null;
  selectedCanvas: HTMLCanvasElement | null;
  hoveredCanvas: HTMLCanvasElement | null;
  frameNumber: number;
  renderVersion: number;
}

export interface DrawingState {
  isDrawing: boolean;
  isPanning: boolean;
  isPlaying: boolean;
  isPolygonDrawing: boolean;
  isSkeletonDrawing: boolean;
  drawingStartFrame: number | null;
}
