import Konva from "konva";
import type { Skeleton, SkeletonPoint } from "../types";

const SKELETON_MERGE_THRESHOLD = 10;

export class SkeletonTool {
  private layer: Konva.Layer | null = null;
  private previewParent: Konva.Group | Konva.Layer | null = null;
  private isDrawing: boolean = false;
  private currentPoints: SkeletonPoint[] = [];
  private previewLine: Konva.Line | null = null;
  private previewCircles: Konva.Circle[] = [];

  constructor(layer: Konva.Layer) {
    this.layer = layer;
    this.previewParent = layer; // Default to layer, can be changed with setPreviewParent
  }

  setPreviewParent(parent: Konva.Group | Konva.Layer): void {
    this.previewParent = parent;
  }

  isDrawingActive(): boolean {
    return this.isDrawing;
  }

  getCurrentPoints(): SkeletonPoint[] {
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

  private shouldMergeWithExistingPoint(pos: { x: number; y: number }): boolean {
    for (const existingPoint of this.currentPoints) {
      const distance = Math.sqrt(
        Math.pow(pos.x - existingPoint.x, 2) +
          Math.pow(pos.y - existingPoint.y, 2)
      );
      if (distance < SKELETON_MERGE_THRESHOLD) {
        return true;
      }
    }
    return false;
  }

  startDrawing(pos: { x: number; y: number }, color: string): void {
    this.isDrawing = true;
    this.currentPoints = [{ x: pos.x, y: pos.y }];

    if (!this.previewParent || !this.layer) return;

    this.previewLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: color,
      strokeWidth: 2,
      dash: [5, 5],
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    });
    this.previewParent.add(this.previewLine);

    const circle = this.createPreviewCircle(pos.x, pos.y, color);
    this.previewParent.add(circle);
    this.previewCircles.push(circle);

    this.layer.batchDraw();
  }

  addPoint(pos: { x: number; y: number }, color: string): boolean {
    if (this.shouldMergeWithExistingPoint(pos)) {
      return false;
    }

    this.currentPoints.push({ x: pos.x, y: pos.y });

    if (!this.previewParent || !this.layer) return false;

    const circle = this.createPreviewCircle(pos.x, pos.y, color);
    this.previewParent.add(circle);
    this.previewCircles.push(circle);

    this.updatePreview();
    return false;
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

  completeDrawing(color: string): Skeleton | null {
    if (this.currentPoints.length < 2) {
      this.cancelDrawing();
      return null;
    }

    const skeleton: Skeleton = {
      id: `skeleton_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
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

    return skeleton;
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

  handleDragEnd(event: any, skeletons: Skeleton[]): Skeleton[] {
    const line = event.target;
    const skeletonId = line.id();

    const skeletonIndex = skeletons.findIndex((s) => s.id === skeletonId);
    if (skeletonIndex === -1) return skeletons;

    const oldSkeleton = skeletons[skeletonIndex];
    if (!oldSkeleton) return skeletons;

    const dx = line.x();
    const dy = line.y();

    const updatedPoints = oldSkeleton.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    line.x(0);
    line.y(0);

    const updatedSkeleton: Skeleton = {
      id: oldSkeleton.id,
      points: updatedPoints,
      color: oldSkeleton.color,
      classId: oldSkeleton.classId,
      label: oldSkeleton.label,
    };

    const newSkeletons = [...skeletons];
    newSkeletons[skeletonIndex] = updatedSkeleton;
    return newSkeletons;
  }

  handleKeypointDragMove(
    event: any,
    skeletonId: string,
    pointIdx: number,
    skeletons: Skeleton[]
  ): void {
    const circle = event.target;
    if (!this.layer) return;

    const skeleton = skeletons.find((s) => s.id === skeletonId);
    if (!skeleton) return;

    const line = this.layer.findOne(`#${skeletonId}`) as Konva.Line;
    if (!line) return;

    const points = [...skeleton.points];
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

  handleKeypointDragEnd(
    event: any,
    skeletonId: string,
    pointIdx: number,
    skeletons: Skeleton[]
  ): Skeleton[] {
    const circle = event.target;

    const skeletonIndex = skeletons.findIndex((s) => s.id === skeletonId);
    if (skeletonIndex === -1) return skeletons;

    const oldSkeleton = skeletons[skeletonIndex];
    if (!oldSkeleton) return skeletons;

    const updatedPoints = oldSkeleton.points.map((p, i) =>
      i === pointIdx ? { x: circle.x(), y: circle.y() } : p
    );

    const updatedSkeleton: Skeleton = {
      id: oldSkeleton.id,
      points: updatedPoints,
      color: oldSkeleton.color,
      classId: oldSkeleton.classId,
      label: oldSkeleton.label,
    };

    const newSkeletons = [...skeletons];
    newSkeletons[skeletonIndex] = updatedSkeleton;
    return newSkeletons;
  }

  deleteSkeleton(skeletonId: string, skeletons: Skeleton[]): Skeleton[] {
    return skeletons.filter((s) => s.id !== skeletonId);
  }
}
