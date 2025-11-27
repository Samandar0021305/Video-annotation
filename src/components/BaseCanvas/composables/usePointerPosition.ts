import type Konva from "konva";
import type { Ref } from "vue";
import type { Position } from "../types";

export function usePointerPosition(stageRef: Ref<{ getStage: () => Konva.Stage | null } | null>) {
  /**
   * Get the pointer position in screen coordinates (relative to stage container)
   */
  const getScreenPosition = (): Position | null => {
    const stage = stageRef.value?.getStage();
    if (!stage) return null;
    return stage.getPointerPosition();
  };

  /**
   * Get the pointer position in logical coordinates (accounting for zoom/pan)
   */
  const getLogicalPosition = (): Position | null => {
    const stage = stageRef.value?.getStage();
    if (!stage) return null;
    return stage.getRelativePointerPosition();
  };

  /**
   * Convert screen coordinates to logical coordinates
   */
  const screenToLogical = (screenPos: Position): Position | null => {
    const stage = stageRef.value?.getStage();
    if (!stage) return null;

    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(screenPos);
  };

  /**
   * Convert logical coordinates to screen coordinates
   */
  const logicalToScreen = (logicalPos: Position): Position | null => {
    const stage = stageRef.value?.getStage();
    if (!stage) return null;

    const transform = stage.getAbsoluteTransform();
    return transform.point(logicalPos);
  };

  return {
    getScreenPosition,
    getLogicalPosition,
    screenToLogical,
    logicalToScreen,
  };
}
