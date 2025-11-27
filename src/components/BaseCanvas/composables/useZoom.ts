import { ref } from "vue";
import type Konva from "konva";
import type { Ref } from "vue";
import type { ZoomConfig } from "../types";
import { DEFAULT_ZOOM_CONFIG } from "../types";
import { ZoomDirection } from "../enums";

export function useZoom(
  stageRef: Ref<{ getStage: () => Konva.Stage | null } | null>,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG
) {
  const zoomLevel = ref(1);

  const zoomIn = () => {
    const stage = stageRef.value?.getStage();
    if (!stage) return;

    const newScale = stage.scaleX() * config.scaleBy;
    const clampedScale = Math.min(config.maxScale, newScale);

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.batchDraw();
    zoomLevel.value = clampedScale;

    return clampedScale;
  };

  const zoomOut = () => {
    const stage = stageRef.value?.getStage();
    if (!stage) return;

    const newScale = stage.scaleX() / config.scaleBy;
    const clampedScale = Math.max(config.minScale, newScale);

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.batchDraw();
    zoomLevel.value = clampedScale;

    return clampedScale;
  };

  const resetZoom = () => {
    const stage = stageRef.value?.getStage();
    if (!stage) return;

    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
    zoomLevel.value = 1;

    return 1;
  };

  const setZoom = (scale: number) => {
    const stage = stageRef.value?.getStage();
    if (!stage) return;

    const clampedScale = Math.max(config.minScale, Math.min(config.maxScale, scale));

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.batchDraw();
    zoomLevel.value = clampedScale;

    return clampedScale;
  };

  const zoom = (direction: ZoomDirection) => {
    switch (direction) {
      case ZoomDirection.In:
        return zoomIn();
      case ZoomDirection.Out:
        return zoomOut();
      case ZoomDirection.Reset:
        return resetZoom();
    }
  };

  const handleWheelZoom = (e: WheelEvent) => {
    e.preventDefault();

    const stage = stageRef.value?.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0 ? oldScale * config.scaleBy : oldScale / config.scaleBy;
    const clampedScale = Math.max(
      config.minScale,
      Math.min(config.maxScale, newScale)
    );

    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    stage.position(newPos);
    stage.batchDraw();

    zoomLevel.value = clampedScale;
    return clampedScale;
  };

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    zoom,
    handleWheelZoom,
  };
}
