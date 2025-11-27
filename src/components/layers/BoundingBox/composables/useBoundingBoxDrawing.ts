import { ref } from "vue";
import Konva from "konva";
import type { BoundingBox, BoundingBoxDrawingState, PendingBoundingBox } from "../types";

export function useBoundingBoxDrawing() {
  const drawingState = ref<BoundingBoxDrawingState>({
    isDrawing: false,
    startPos: null,
    currentPos: null,
  });

  const pendingBbox = ref<PendingBoundingBox | null>(null);
  let bboxPreview: Konva.Rect | null = null;
  let transformer: Konva.Transformer | null = null;
  let layer: Konva.Layer | null = null;

  const initialize = (konvaLayer: Konva.Layer) => {
    layer = konvaLayer;
    setupTransformer();
  };

  const setupTransformer = () => {
    if (!layer) return null;

    transformer = new Konva.Transformer({
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

    layer.add(transformer);
    return transformer;
  };

  const updateTransformerSelection = (selectedId: string | null) => {
    if (!transformer || !layer) return;

    if (!selectedId) {
      transformer.nodes([]);
      layer.batchDraw();
      return;
    }

    const group = layer.findOne(`#${selectedId}`);
    if (group) {
      transformer.nodes([group]);
    } else {
      transformer.nodes([]);
    }
    layer.batchDraw();
  };

  const startDrawing = (pos: { x: number; y: number }, color: string) => {
    if (!layer) return;

    drawingState.value = {
      isDrawing: true,
      startPos: pos,
      currentPos: pos,
    };

    bboxPreview = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: color,
      strokeWidth: 2,
      dash: [5, 5],
      listening: false,
    });

    layer.add(bboxPreview);
    layer.batchDraw();
  };

  const updatePreview = (pos: { x: number; y: number }) => {
    if (!bboxPreview || !drawingState.value.startPos || !layer) return;

    drawingState.value.currentPos = pos;

    const startPos = drawingState.value.startPos;
    const width = pos.x - startPos.x;
    const height = pos.y - startPos.y;

    bboxPreview.setAttrs({
      x: width < 0 ? pos.x : startPos.x,
      y: height < 0 ? pos.y : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    layer.batchDraw();
  };

  const finishDrawing = (color: string, frame: number): BoundingBox | null => {
    if (!bboxPreview || !drawingState.value.startPos) return null;

    const width = bboxPreview.width();
    const height = bboxPreview.height();

    if (width < 10 || height < 10) {
      cancelDrawing();
      return null;
    }

    const bbox: BoundingBox = {
      id: `bbox_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      x: bboxPreview.x(),
      y: bboxPreview.y(),
      width: width,
      height: height,
      rotation: 0,
      color: color,
      classId: 0,
    };

    pendingBbox.value = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      rotation: bbox.rotation,
      frame: frame,
    };

    bboxPreview.destroy();
    bboxPreview = null;
    drawingState.value = {
      isDrawing: false,
      startPos: null,
      currentPos: null,
    };
    layer?.batchDraw();

    return bbox;
  };

  const cancelDrawing = () => {
    if (bboxPreview) {
      bboxPreview.destroy();
      bboxPreview = null;
    }
    drawingState.value = {
      isDrawing: false,
      startPos: null,
      currentPos: null,
    };
    layer?.batchDraw();
  };

  const clearPendingBbox = () => {
    pendingBbox.value = null;
  };

  const getTransformer = () => transformer;

  const getTransformData = (trackId: string): { x: number; y: number; width: number; height: number; rotation: number; scaleX: number; scaleY: number } | null => {
    if (!layer) return null;

    const group = layer.findOne(`#${trackId}`) as Konva.Group | undefined;
    if (!group) return null;

    const rect = group.findOne("Rect") as Konva.Rect | undefined;
    if (!rect) return null;

    return {
      x: group.x(),
      y: group.y(),
      width: rect.width(),
      height: rect.height(),
      rotation: group.rotation(),
      scaleX: group.scaleX(),
      scaleY: group.scaleY(),
    };
  };

  const resetGroupScale = (trackId: string) => {
    if (!layer) return;

    const group = layer.findOne(`#${trackId}`) as Konva.Group | undefined;
    if (group) {
      group.scaleX(1);
      group.scaleY(1);
    }
  };

  const dispose = () => {
    if (transformer) {
      transformer.destroy();
      transformer = null;
    }
    if (bboxPreview) {
      bboxPreview.destroy();
      bboxPreview = null;
    }
    layer = null;
  };

  return {
    drawingState,
    pendingBbox,
    initialize,
    setupTransformer,
    updateTransformerSelection,
    startDrawing,
    updatePreview,
    finishDrawing,
    cancelDrawing,
    clearPendingBbox,
    getTransformer,
    getTransformData,
    resetGroupScale,
    dispose,
  };
}
