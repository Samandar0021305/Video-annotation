import { ref } from "vue";
import type Konva from "konva";
import type { Ref } from "vue";
import type { Position } from "../types";
import { CursorStyle } from "../enums";

export function usePanning(stageRef: Ref<{ getStage: () => Konva.Stage | null } | null>) {
  const isPanning = ref(false);
  const lastPanPoint = ref<Position | null>(null);

  const startPan = (screenPosition: Position) => {
    isPanning.value = true;
    lastPanPoint.value = screenPosition;

    const stage = stageRef.value?.getStage();
    if (stage) {
      stage.container().style.cursor = CursorStyle.Grabbing;
    }
  };

  const updatePan = (screenPosition: Position) => {
    if (!isPanning.value || !lastPanPoint.value) return false;

    const stage = stageRef.value?.getStage();
    if (!stage) return false;

    const dx = screenPosition.x - lastPanPoint.value.x;
    const dy = screenPosition.y - lastPanPoint.value.y;

    const newPos = {
      x: stage.x() + dx,
      y: stage.y() + dy,
    };

    stage.position(newPos);
    stage.batchDraw();

    lastPanPoint.value = screenPosition;
    return true;
  };

  const endPan = (defaultCursor: CursorStyle = CursorStyle.Default) => {
    const wasPanning = isPanning.value;
    isPanning.value = false;
    lastPanPoint.value = null;

    const stage = stageRef.value?.getStage();
    if (stage) {
      stage.container().style.cursor = defaultCursor;
    }

    return wasPanning;
  };

  const setCursor = (cursor: CursorStyle) => {
    const stage = stageRef.value?.getStage();
    if (stage) {
      stage.container().style.cursor = cursor;
    }
  };

  return {
    isPanning,
    lastPanPoint,
    startPan,
    updatePan,
    endPan,
    setCursor,
  };
}
