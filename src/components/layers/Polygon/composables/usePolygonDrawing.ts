import { ref } from "vue";
import Konva from "konva";
import type { Polygon, PolygonPoint, PolygonDrawingState, PendingPolygon } from "../types";

export function usePolygonDrawing() {
  const drawingState = ref<PolygonDrawingState>({
    isDrawing: false,
    points: [],
  });

  const pendingPolygon = ref<PendingPolygon | null>(null);
  let previewLine: Konva.Line | null = null;
  let previewPoints: Konva.Circle[] = [];
  let layer: Konva.Layer | null = null;

  const initialize = (konvaLayer: Konva.Layer) => {
    layer = konvaLayer;
  };

  const startDrawing = (pos: PolygonPoint, color: string) => {
    if (!layer) return;

    drawingState.value = {
      isDrawing: true,
      points: [pos],
    };

    previewLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: color,
      strokeWidth: 2,
      dash: [5, 5],
      closed: false,
      listening: false,
    });

    const point = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: 6,
      fill: color,
      stroke: "#fff",
      strokeWidth: 2,
      listening: false,
    });

    previewPoints = [point];
    layer.add(previewLine);
    layer.add(point);
    layer.batchDraw();
  };

  const addPoint = (pos: PolygonPoint, color: string) => {
    if (!layer || !drawingState.value.isDrawing) return;

    drawingState.value.points.push(pos);

    if (previewLine) {
      const points = drawingState.value.points.flatMap((p) => [p.x, p.y]);
      previewLine.points(points);
    }

    const point = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: 6,
      fill: color,
      stroke: "#fff",
      strokeWidth: 2,
      listening: false,
    });

    previewPoints.push(point);
    layer.add(point);
    layer.batchDraw();
  };

  const updatePreview = (pos: PolygonPoint) => {
    if (!layer || !previewLine || !drawingState.value.isDrawing) return;

    const points = drawingState.value.points.flatMap((p) => [p.x, p.y]);
    points.push(pos.x, pos.y);
    previewLine.points(points);
    layer.batchDraw();
  };

  const finishDrawing = (color: string, frame: number): Polygon | null => {
    if (!drawingState.value.isDrawing || drawingState.value.points.length < 3) {
      cancelDrawing();
      return null;
    }

    const polygon: Polygon = {
      id: `polygon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      points: [...drawingState.value.points],
      color: color,
      classId: 0,
    };

    pendingPolygon.value = {
      points: polygon.points,
      frame: frame,
    };

    cleanupPreview();
    drawingState.value = {
      isDrawing: false,
      points: [],
    };

    return polygon;
  };

  const cancelDrawing = () => {
    cleanupPreview();
    drawingState.value = {
      isDrawing: false,
      points: [],
    };
  };

  const cleanupPreview = () => {
    if (previewLine) {
      previewLine.destroy();
      previewLine = null;
    }
    previewPoints.forEach((p) => p.destroy());
    previewPoints = [];
    layer?.batchDraw();
  };

  const clearPendingPolygon = () => {
    pendingPolygon.value = null;
  };

  const isDrawingActive = () => drawingState.value.isDrawing;

  const getPointCount = () => drawingState.value.points.length;

  const dispose = () => {
    cleanupPreview();
    layer = null;
  };

  return {
    drawingState,
    pendingPolygon,
    initialize,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing,
    cancelDrawing,
    clearPendingPolygon,
    isDrawingActive,
    getPointCount,
    dispose,
  };
}
