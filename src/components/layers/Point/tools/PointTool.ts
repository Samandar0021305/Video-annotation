import Konva from "konva";
import type { Point } from "../types";

export class PointTool {
  private _layer: Konva.Layer | null = null;
  private _previewParent: Konva.Group | Konva.Layer | null = null;

  constructor(layer: Konva.Layer) {
    this._layer = layer;
    this._previewParent = layer;
  }

  setPreviewParent(parent: Konva.Group | Konva.Layer): void {
    this._previewParent = parent;
  }

  getPreviewParent(): Konva.Group | Konva.Layer | null {
    return this._previewParent;
  }

  createPoint(pos: { x: number; y: number }, color: string): Point {
    const point: Point = {
      id: `point_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      x: pos.x,
      y: pos.y,
      color: color,
      classId: 0,
    };
    return point;
  }

  handleDragEnd(event: Konva.KonvaEventObject<DragEvent>, points: Map<string, Point>): Map<string, Point> {
    const rect = event.target as Konva.Rect;
    const pointId = rect.id();

    const point = points.get(pointId);
    if (!point) return points;

    const updatedPoint: Point = {
      ...point,
      x: rect.x(),
      y: rect.y(),
    };

    const newPoints = new Map(points);
    newPoints.set(pointId, updatedPoint);
    return newPoints;
  }

  deletePoint(pointId: string, points: Map<string, Point>): Map<string, Point> {
    const newPoints = new Map(points);
    newPoints.delete(pointId);
    return newPoints;
  }

  getLayer(): Konva.Layer | null {
    return this._layer;
  }
}
