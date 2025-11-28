<template>
  <div ref="canvasContainerRef" class="canvas-container">
    <div v-if="ready" ref="containerRef" class="stage-wrapper" @wheel="onWheel">
      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @dblclick="onDblClick"
      >
        <v-layer ref="backgroundLayerRef">
          <slot name="background"></slot>
        </v-layer>

        <v-layer
          ref="annotationsLayerRef"
          :config="{ imageSmoothingEnabled: false }"
        >
          <slot name="annotations"></slot>
        </v-layer>

        <v-layer ref="interactiveLayerRef">
          <slot name="interactive"></slot>
        </v-layer>

        <slot name="layers"></slot>
      </v-stage>
    </div>
    <div v-else class="loading">
      <slot name="loading">Loading...</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import type Konva from "konva";
import type {
  BaseCanvasProps,
  CanvasMouseEvent,
  CanvasWheelEvent,
} from "./types";
import { useStage } from "./composables";

const props = withDefaults(defineProps<BaseCanvasProps>(), {
  enablePan: true,
  enableZoom: true,
  cursor: "default",
  width: 800,
  height: 800,
  fillContainer: false,
});

const emit = defineEmits<{
  (e: "mousedown", event: CanvasMouseEvent): void;
  (e: "mousemove", event: CanvasMouseEvent): void;
  (e: "mouseup", event: CanvasMouseEvent): void;
  (e: "mouseleave", event: CanvasMouseEvent): void;
  (e: "dblclick", event: CanvasMouseEvent): void;
  (e: "wheel", event: CanvasWheelEvent): void;
  (e: "zoom-change", zoomLevel: number): void;
  (e: "stage-ready", stage: Konva.Stage): void;
  (e: "container-resize", size: { width: number; height: number }): void;
}>();

const ready = ref(false);
const canvasContainerRef = ref<HTMLDivElement | null>(null);

const backgroundLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);
const annotationsLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);
const interactiveLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);

const stage = useStage({
  width: typeof props.width === "number" ? props.width : 800,
  height: props.height || 800,
  zoomConfig: props.zoomConfig,
});

const { stageConfig, stageRef, containerRef } = stage;

let resizeObserver: ResizeObserver | null = null;

const measureContainer = () => {
  if (!canvasContainerRef.value || !props.fillContainer) return;

  const rect = canvasContainerRef.value.getBoundingClientRect();
  const newWidth = Math.floor(rect.width);
  const newHeight = Math.floor(rect.height);

  if (newWidth > 0 && newHeight > 0) {
    if (
      stageConfig.value.width !== newWidth ||
      stageConfig.value.height !== newHeight
    ) {
      stage.updateSize(newWidth, newHeight);
      emit("container-resize", { width: newWidth, height: newHeight });
    }
  }
};

const setupResizeObserver = () => {
  if (!props.fillContainer || !canvasContainerRef.value) return;

  resizeObserver = new ResizeObserver(() => {
    measureContainer();
  });

  resizeObserver.observe(canvasContainerRef.value);
  measureContainer();
};

const cleanupResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
};

const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const event = stage.createMouseEvent(e);
  emit("mousedown", event);
};

const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const event = stage.createMouseEvent(e);
  emit("mousemove", event);
};

const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const event = stage.createMouseEvent(e);
  emit("mouseup", event);
};

const onMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const event = stage.createMouseEvent(e);
  emit("mouseleave", event);
};

const onDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const event = stage.createMouseEvent(e);
  emit("dblclick", event);
};

const onWheel = (e: WheelEvent) => {
  if (props.enableZoom) {
    const newZoom = stage.handleWheelZoom(e);
    if (newZoom !== undefined) {
      emit("zoom-change", newZoom);
    }
  }

  const wheelEvent: CanvasWheelEvent = {
    originalEvent: e,
    screenPosition: stage.getScreenPosition(),
    logicalPosition: stage.getLogicalPosition(),
    deltaY: e.deltaY,
  };
  emit("wheel", wheelEvent);
};

watch(
  () => [props.width, props.height] as const,
  ([newWidth, newHeight]) => {
    if (
      !props.fillContainer &&
      typeof newWidth === "number" &&
      typeof newHeight === "number"
    ) {
      stage.updateSize(newWidth, newHeight);
    }
  }
);

watch(
  () => props.fillContainer,
  (fillContainer) => {
    if (fillContainer) {
      setupResizeObserver();
    } else {
      cleanupResizeObserver();
    }
  }
);

onMounted(async () => {
  // Measure container BEFORE setting ready to ensure correct dimensions
  if (props.fillContainer && canvasContainerRef.value) {
    const rect = canvasContainerRef.value.getBoundingClientRect();
    const newWidth = Math.floor(rect.width);
    const newHeight = Math.floor(rect.height);
    if (newWidth > 0 && newHeight > 0) {
      stage.updateSize(newWidth, newHeight);
      emit("container-resize", { width: newWidth, height: newHeight });
    }
  }

  ready.value = true;

  // Use nextTick to ensure DOM is fully rendered before setting up observer
  await nextTick();

  if (props.fillContainer) {
    setupResizeObserver();
  }

  const stageInstance = stage.getStage();
  if (stageInstance) {
    emit("stage-ready", stageInstance);
  }
});

onUnmounted(() => {
  cleanupResizeObserver();
});

defineExpose({
  stageRef: stage.stageRef,
  containerRef: stage.containerRef,
  canvasContainerRef,
  stageConfig: stage.stageConfig,
  getStage: stage.getStage,
  batchDraw: stage.batchDraw,
  backgroundLayerRef,
  annotationsLayerRef,
  interactiveLayerRef,
  getScreenPosition: stage.getScreenPosition,
  getLogicalPosition: stage.getLogicalPosition,
  screenToLogical: stage.screenToLogical,
  logicalToScreen: stage.logicalToScreen,
  isPanning: stage.isPanning,
  startPan: stage.startPan,
  updatePan: stage.updatePan,
  endPan: stage.endPan,
  setCursor: stage.setCursor,
  zoomLevel: stage.zoomLevel,
  zoomIn: stage.zoomIn,
  zoomOut: stage.zoomOut,
  resetZoom: stage.resetZoom,
  setZoom: stage.setZoom,
  measureContainer,
});
</script>

<style scoped>
.canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin: 0 16px;
  position: relative;
  min-height: 0;
  overflow: hidden;
  background-color: white;
}

.stage-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.loading {
  padding: 40px;
  font-size: 18px;
  color: #666;
}
</style>
