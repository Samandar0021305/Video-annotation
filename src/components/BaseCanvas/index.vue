<template>
  <div class="canvas-container">
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
        <!-- Background Layer -->
        <v-layer ref="backgroundLayerRef">
          <slot name="background"></slot>
        </v-layer>

        <!-- Annotations Layer -->
        <v-layer
          ref="annotationsLayerRef"
          :config="{ imageSmoothingEnabled: false }"
        >
          <slot name="annotations"></slot>
        </v-layer>

        <!-- Interactive Layer (cursor, preview, etc.) -->
        <v-layer ref="interactiveLayerRef">
          <slot name="interactive"></slot>
        </v-layer>

        <!-- Additional custom layers -->
        <slot name="layers"></slot>
      </v-stage>
    </div>
    <div v-else class="loading">
      <slot name="loading">Loading...</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
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
}>();

// Internal state
const ready = ref(false);

// Layer refs
const backgroundLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);
const annotationsLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);
const interactiveLayerRef = ref<{ getNode: () => Konva.Layer } | null>(null);

// Stage composable
const stage = useStage({
  width: props.width,
  height: props.height,
  zoomConfig: props.zoomConfig,
});

// Destructure stageConfig for template access
const { stageConfig, stageRef, containerRef } = stage;

// Event handlers
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

// Watch for size changes
watch(
  () => [props.width, props.height] as const,
  ([newWidth, newHeight]) => {
    stage.updateSize(newWidth as number, newHeight as number);
  }
);

// Lifecycle
onMounted(() => {
  ready.value = true;

  // Wait for next tick to ensure stage is mounted
  setTimeout(() => {
    const stageInstance = stage.getStage();
    if (stageInstance) {
      emit("stage-ready", stageInstance);
    }
  }, 0);
});

// Expose stage utilities and refs for parent component
defineExpose({
  // Stage
  stageRef: stage.stageRef,
  containerRef: stage.containerRef,
  stageConfig: stage.stageConfig,
  getStage: stage.getStage,
  batchDraw: stage.batchDraw,

  // Layers
  backgroundLayerRef,
  annotationsLayerRef,
  interactiveLayerRef,

  // Pointer position
  getScreenPosition: stage.getScreenPosition,
  getLogicalPosition: stage.getLogicalPosition,
  screenToLogical: stage.screenToLogical,
  logicalToScreen: stage.logicalToScreen,

  // Panning
  isPanning: stage.isPanning,
  startPan: stage.startPan,
  updatePan: stage.updatePan,
  endPan: stage.endPan,
  setCursor: stage.setCursor,

  // Zoom
  zoomLevel: stage.zoomLevel,
  zoomIn: stage.zoomIn,
  zoomOut: stage.zoomOut,
  resetZoom: stage.resetZoom,
  setZoom: stage.setZoom,
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
