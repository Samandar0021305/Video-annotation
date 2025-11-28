import { shallowRef } from "vue";
import type { Point } from "../types";
import { PointTool } from "../tools/PointTool";
import Konva from "konva";

export function usePointDrawing() {
  const pointToolRef = shallowRef<PointTool | null>(null);

  const initPointTool = (konvaLayer: Konva.Layer): PointTool => {
    pointToolRef.value = new PointTool(konvaLayer);
    return pointToolRef.value;
  };

  const createPointAtPosition = (
    pos: { x: number; y: number },
    color: string
  ): Point | null => {
    if (!pointToolRef.value) return null;
    return pointToolRef.value.createPoint(pos, color);
  };

  const handlePointDragEnd = (
    event: Konva.KonvaEventObject<DragEvent>,
    points: Map<string, Point>
  ): Map<string, Point> => {
    if (!pointToolRef.value) return points;
    return pointToolRef.value.handleDragEnd(event, points);
  };

  const getPointTool = (): PointTool | null => {
    return pointToolRef.value;
  };

  return {
    initPointTool,
    createPointAtPosition,
    handlePointDragEnd,
    getPointTool,
  };
}
