import Konva from "konva";
import type { Polygon, PolygonPoint } from "../types";

export class PolygonTool {
  private layer: Konva.Layer | null = null;
  private isDrawing: boolean = false;
  private currentPoints: PolygonPoint[] = [];
  private previewLine: Konva.Line | null = null;
  private previewCircles: Konva.Circle[] = [];

  constructor(layer: Konva.Layer) {
    this.layer = layer;
  }

  isDrawingActive(): boolean {
    return this.isDrawing;
  }

  getCurrentPoints(): PolygonPoint[] {
    return this.currentPoints;
  }

  private createPreviewCircle(x: number, y: number, color: string): Konva.Circle {
    return new Konva.Circle({
      x,
      y,
      radius: 6,
      fill: color,
      stroke: "#fff",
      strokeWidth: 2,
      listening: false,
    });
  }

  private clearPreviewCircles(): void {
    for (const circle of this.previewCircles) {
      circle.destroy();
    }
    this.previewCircles = [];
  }

  startDrawing(pos: { x: number; y: number }, color: string): void {
    this.isDrawing = true;
    this.currentPoints = [{ x: pos.x, y: pos.y }];

    if (!this.layer) return;

    this.previewLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: color,
      strokeWidth: 2,
      dash: [5, 5],
      closed: true,
      fill: color + "30",
      listening: false,
    });
    this.layer.add(this.previewLine);

    const circle = this.createPreviewCircle(pos.x, pos.y, color);
    this.layer.add(circle);
    this.previewCircles.push(circle);

    this.layer.batchDraw();
  }

  addPoint(pos: { x: number; y: number }, color: string): boolean {
    const firstPoint = this.currentPoints[0];
    if (!firstPoint) return false;

    const distance = Math.sqrt(
      Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
    );

    if (distance < 15 && this.currentPoints.length >= 3) {
      return true;
    } else {
      this.currentPoints.push({ x: pos.x, y: pos.y });

      if (!this.layer) return false;

      const circle = this.createPreviewCircle(pos.x, pos.y, color);
      this.layer.add(circle);
      this.previewCircles.push(circle);

      this.updatePreview();
      return false;
    }
  }

  updatePreview(): void {
    if (!this.previewLine || !this.layer) return;

    const points: number[] = [];
    for (const p of this.currentPoints) {
      points.push(p.x, p.y);
    }

    this.previewLine.points(points);
    this.layer.batchDraw();
  }

  updatePreviewWithMouse(pos: { x: number; y: number }): void {
    if (!this.previewLine || !this.layer) return;

    const points: number[] = [];
    for (const p of this.currentPoints) {
      points.push(p.x, p.y);
    }
    points.push(pos.x, pos.y);

    this.previewLine.points(points);
    this.layer.batchDraw();
  }

  completeDrawing(color: string): Polygon | null {
    if (this.currentPoints.length < 3) {
      this.cancelDrawing();
      return null;
    }

    const polygon: Polygon = {
      id: `polygon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      points: [...this.currentPoints],
      color: color,
      classId: 0,
    };

    if (this.previewLine) {
      this.previewLine.destroy();
      this.previewLine = null;
    }

    this.clearPreviewCircles();

    this.isDrawing = false;
    this.currentPoints = [];

    if (this.layer) {
      this.layer.batchDraw();
    }

    return polygon;
  }

  cancelDrawing(): void {
    if (this.previewLine) {
      this.previewLine.destroy();
      this.previewLine = null;
    }
    this.clearPreviewCircles();
    this.isDrawing = false;
    this.currentPoints = [];
    if (this.layer) {
      this.layer.batchDraw();
    }
  }

  handleDragEnd(event: any, polygons: Polygon[]): Polygon[] {
    const line = event.target;
    const polygonId = line.id();

    const polygonIndex = polygons.findIndex((p) => p.id === polygonId);
    if (polygonIndex === -1) return polygons;

    const oldPolygon = polygons[polygonIndex];
    if (!oldPolygon) return polygons;

    const dx = line.x();
    const dy = line.y();

    const updatedPoints = oldPolygon.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    line.x(0);
    line.y(0);

    const updatedPolygon: Polygon = {
      id: oldPolygon.id,
      points: updatedPoints,
      color: oldPolygon.color,
      classId: oldPolygon.classId,
      label: oldPolygon.label,
    };

    const newPolygons = [...polygons];
    newPolygons[polygonIndex] = updatedPolygon;
    return newPolygons;
  }

  handleVertexDragMove(
    event: any,
    polygonId: string,
    pointIdx: number,
    polygons: Polygon[]
  ): void {
    const circle = event.target;
    if (!this.layer) return;

    const polygon = polygons.find((p) => p.id === polygonId);
    if (!polygon) return;

    const line = this.layer.findOne(`#${polygonId}`) as Konva.Line;
    if (!line) return;

    const points = [...polygon.points];
    points[pointIdx] = {
      x: circle.x(),
      y: circle.y(),
    };

    const flatPoints: number[] = [];
    for (const p of points) {
      flatPoints.push(p.x, p.y);
    }
    line.points(flatPoints);

    this.layer.batchDraw();
  }

  handleVertexDragEnd(
    event: any,
    polygonId: string,
    pointIdx: number,
    polygons: Polygon[]
  ): Polygon[] {
    const circle = event.target;

    const polygonIndex = polygons.findIndex((p) => p.id === polygonId);
    if (polygonIndex === -1) return polygons;

    const oldPolygon = polygons[polygonIndex];
    if (!oldPolygon) return polygons;

    const updatedPoints = oldPolygon.points.map((p, i) =>
      i === pointIdx ? { x: circle.x(), y: circle.y() } : p
    );

    const updatedPolygon: Polygon = {
      id: oldPolygon.id,
      points: updatedPoints,
      color: oldPolygon.color,
      classId: oldPolygon.classId,
      label: oldPolygon.label,
    };

    const newPolygons = [...polygons];
    newPolygons[polygonIndex] = updatedPolygon;
    return newPolygons;
  }

  deletePolygon(polygonId: string, polygons: Polygon[]): Polygon[] {
    return polygons.filter((p) => p.id !== polygonId);
  }
}
