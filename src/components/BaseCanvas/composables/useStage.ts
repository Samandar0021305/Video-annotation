import { ref, computed } from "vue";
import type Konva from "konva";
import type { StageConfig, ZoomConfig, CanvasMouseEvent } from "../types";
import { DEFAULT_ZOOM_CONFIG } from "../types";
import { usePointerPosition } from "./usePointerPosition";
import { usePanning } from "./usePanning";
import { useZoom } from "./useZoom";

export interface UseStageOptions {
  width: number;
  height: number;
  zoomConfig?: ZoomConfig;
}

export function useStage(options: UseStageOptions) {
  const stageRef = ref<{ getStage: () => Konva.Stage | null } | null>(null);
  const containerRef = ref<HTMLDivElement | null>(null);

  const stageConfig = ref<StageConfig>({
    width: options.width,
    height: options.height,
  });

  // Composables
  const pointerPosition = usePointerPosition(stageRef);
  const panning = usePanning(stageRef);
  const zoom = useZoom(stageRef, options.zoomConfig ?? DEFAULT_ZOOM_CONFIG);

  // Computed
  const stage = computed(() => stageRef.value?.getStage() ?? null);

  // Methods
  const getStage = (): Konva.Stage | null => {
    return stageRef.value?.getStage() ?? null;
  };

  const updateSize = (width: number, height: number) => {
    stageConfig.value.width = width;
    stageConfig.value.height = height;

    const stageInstance = getStage();
    if (stageInstance) {
      stageInstance.width(width);
      stageInstance.height(height);
      stageInstance.batchDraw();
    }
  };

  const batchDraw = () => {
    const stageInstance = getStage();
    if (stageInstance) {
      stageInstance.batchDraw();
    }
  };

  const createMouseEvent = (konvaEvent: Konva.KonvaEventObject<MouseEvent>): CanvasMouseEvent => {
    return {
      originalEvent: konvaEvent.evt,
      konvaEvent,
      screenPosition: pointerPosition.getScreenPosition(),
      logicalPosition: pointerPosition.getLogicalPosition(),
      target: konvaEvent.target,
    };
  };

  return {
    // Refs
    stageRef,
    containerRef,
    stageConfig,
    stage,

    // Pointer Position
    getScreenPosition: pointerPosition.getScreenPosition,
    getLogicalPosition: pointerPosition.getLogicalPosition,
    screenToLogical: pointerPosition.screenToLogical,
    logicalToScreen: pointerPosition.logicalToScreen,

    // Panning
    isPanning: panning.isPanning,
    startPan: panning.startPan,
    updatePan: panning.updatePan,
    endPan: panning.endPan,
    setCursor: panning.setCursor,

    // Zoom
    zoomLevel: zoom.zoomLevel,
    zoomIn: zoom.zoomIn,
    zoomOut: zoom.zoomOut,
    resetZoom: zoom.resetZoom,
    setZoom: zoom.setZoom,
    handleWheelZoom: zoom.handleWheelZoom,

    // Stage methods
    getStage,
    updateSize,
    batchDraw,
    createMouseEvent,
  };
}
