import type Konva from "konva";

// ============ Stage Types ============

export interface StageConfig {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

// ============ Zoom Types ============

export interface ZoomConfig {
  minScale: number;
  maxScale: number;
  scaleBy: number;
}

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minScale: 0.1,
  maxScale: 20,
  scaleBy: 1.2,
};

// ============ Event Types ============

export interface CanvasMouseEvent {
  originalEvent: MouseEvent;
  konvaEvent: Konva.KonvaEventObject<MouseEvent>;
  screenPosition: Position | null;
  logicalPosition: Position | null;
  target: Konva.Node | null;
}

export interface CanvasWheelEvent {
  originalEvent: WheelEvent;
  screenPosition: Position | null;
  logicalPosition: Position | null;
  deltaY: number;
}

// ============ Layer Refs Types ============

export interface CanvasLayerRefs {
  stage: Konva.Stage | null;
  backgroundLayer: Konva.Layer | null;
  annotationsLayer: Konva.Layer | null;
  interactiveLayer: Konva.Layer | null;
}

// ============ Emits Types ============

export interface BaseCanvasEmits {
  (e: "mousedown", event: CanvasMouseEvent): void;
  (e: "mousemove", event: CanvasMouseEvent): void;
  (e: "mouseup", event: CanvasMouseEvent): void;
  (e: "mouseleave", event: CanvasMouseEvent): void;
  (e: "dblclick", event: CanvasMouseEvent): void;
  (e: "wheel", event: CanvasWheelEvent): void;
  (e: "zoom-change", zoomLevel: number): void;
  (e: "stage-ready", stage: Konva.Stage): void;
}

// ============ Props Types ============

export interface BaseCanvasProps {
  width?: number | string;
  height?: number;
  zoomConfig?: ZoomConfig;
  enablePan?: boolean;
  enableZoom?: boolean;
  cursor?: string;
  fillContainer?: boolean;
}
