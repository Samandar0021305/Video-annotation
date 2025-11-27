import Konva from "konva";
import type { BoundingBox } from "../types";

export class BBoxTool {
  private bboxStartPos: { x: number; y: number } | null = null;
  private bboxPreview: Konva.Rect | null = null;
  private transformer: Konva.Transformer | null = null;
  private layer: Konva.Layer | null = null;

  constructor(layer: Konva.Layer) {
    this.layer = layer;
  }

  setupTransformer(): Konva.Transformer {
    this.transformer = new Konva.Transformer({
      keepRatio: false,
      enabledAnchors: [
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ],
      boundBoxFunc: (_oldBox, newBox) => {
        if (newBox.width < 10) newBox.width = 10;
        if (newBox.height < 10) newBox.height = 10;
        return newBox;
      },
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    });

    if (this.layer) {
      this.layer.add(this.transformer);
    }

    return this.transformer;
  }

  updateTransformerSelection(selectedBboxId: string | null): void {
    if (!this.transformer || !this.layer) return;

    if (!selectedBboxId) {
      this.transformer.nodes([]);
      this.layer.batchDraw();
      return;
    }

    const group = this.layer.findOne(`#${selectedBboxId}`);

    if (group) {
      this.transformer.nodes([group]);
    } else {
      this.transformer.nodes([]);
    }

    this.layer.batchDraw();
  }

  startDrawing(pos: { x: number; y: number }, color: string): void {
    this.bboxStartPos = pos;
    if (!this.layer) return;

    this.bboxPreview = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: color,
      strokeWidth: 2,
      dash: [5, 5],
      listening: false,
    });

    this.layer.add(this.bboxPreview);
    this.layer.batchDraw();
  }

  updatePreview(pos: { x: number; y: number }): void {
    if (!this.bboxPreview || !this.bboxStartPos || !this.layer) return;

    const width = pos.x - this.bboxStartPos.x;
    const height = pos.y - this.bboxStartPos.y;

    this.bboxPreview.setAttrs({
      x: width < 0 ? pos.x : this.bboxStartPos.x,
      y: height < 0 ? pos.y : this.bboxStartPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    this.layer.batchDraw();
  }

  finishDrawing(color: string): BoundingBox | null {
    if (!this.bboxPreview || !this.bboxStartPos) return null;

    const width = this.bboxPreview.width();
    const height = this.bboxPreview.height();

    if (width < 10 || height < 10) {
      this.bboxPreview.destroy();
      this.bboxPreview = null;
      this.bboxStartPos = null;
      this.layer?.batchDraw();
      return null;
    }

    const bbox: BoundingBox = {
      id: `bbox_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      x: this.bboxPreview.x(),
      y: this.bboxPreview.y(),
      width: width,
      height: height,
      rotation: 0,
      color: color,
      classId: 0,
    };

    this.bboxPreview.destroy();
    this.bboxPreview = null;
    this.bboxStartPos = null;
    this.layer?.batchDraw();

    return bbox;
  }

  cancelDrawing(): void {
    if (this.bboxPreview) {
      this.bboxPreview.destroy();
      this.bboxPreview = null;
    }
    this.bboxStartPos = null;
    this.layer?.batchDraw();
  }

  handleDragEnd(event: any, bboxes: BoundingBox[]): BoundingBox[] {
    const group = event.target;
    const bboxId = group.id();

    const bboxIndex = bboxes.findIndex((b) => b.id === bboxId);
    if (bboxIndex === -1) return bboxes;

    const oldBbox = bboxes[bboxIndex];
    if (!oldBbox) return bboxes;

    const updatedBbox: BoundingBox = {
      id: oldBbox.id,
      x: group.x(),
      y: group.y(),
      width: oldBbox.width,
      height: oldBbox.height,
      rotation: oldBbox.rotation,
      color: oldBbox.color,
      classId: oldBbox.classId,
      label: oldBbox.label,
    };

    const newBboxes = [...bboxes];
    newBboxes[bboxIndex] = updatedBbox;
    return newBboxes;
  }

  handleTransformEnd(bboxes: BoundingBox[]): BoundingBox[] {
    const nodes = this.transformer?.nodes();
    if (!nodes || nodes.length === 0) return bboxes;

    const group = nodes[0] as Konva.Group;
    const bboxId = group.id();

    const bboxIndex = bboxes.findIndex((b) => b.id === bboxId);
    if (bboxIndex === -1) return bboxes;

    const oldBbox = bboxes[bboxIndex];
    if (!oldBbox) return bboxes;

    const rect = group.findOne("Rect");
    if (!rect) return bboxes;

    const scaleX = group.scaleX();
    const scaleY = group.scaleY();

    const updatedBbox: BoundingBox = {
      id: oldBbox.id,
      x: group.x(),
      y: group.y(),
      width: rect.width() * scaleX,
      height: rect.height() * scaleY,
      rotation: group.rotation(),
      color: oldBbox.color,
      classId: oldBbox.classId,
      label: oldBbox.label,
    };

    group.scaleX(1);
    group.scaleY(1);

    const newBboxes = [...bboxes];
    newBboxes[bboxIndex] = updatedBbox;
    return newBboxes;
  }

  deleteBbox(bboxId: string, bboxes: BoundingBox[]): BoundingBox[] {
    return bboxes.filter((b) => b.id !== bboxId);
  }

  getTransformer(): Konva.Transformer | null {
    return this.transformer;
  }
}
