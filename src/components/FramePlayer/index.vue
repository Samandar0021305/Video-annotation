<template>
  <div class="frame-player">
    <div class="controls">
      <div class="control-group">
        <button @click="togglePlay">{{ isPlaying ? "Pause" : "Play" }}</button>
        <button @click="previousFrame">Previous</button>
        <button @click="nextFrame">Next</button>
      </div>

      <div class="control-group">
        <label>Mode:</label>
        <button :class="{ active: mode === 'brush' }" @click="setMode('brush')">
          Brush
        </button>
        <button
          :class="{ active: mode === 'eraser' }"
          @click="setMode('eraser')"
        >
          Eraser
        </button>
        <button :class="{ active: mode === 'pan' }" @click="setMode('pan')">
          Pan
        </button>
      </div>

      <div v-if="mode === 'brush' || mode === 'eraser'" class="control-group">
        <label>Size: {{ brushSize }}px</label>
        <input
          type="range"
          min="5"
          max="100"
          v-model.number="brushSize"
          @input="handleSizeChange"
        />
      </div>

      <div class="control-group">
        <label>FPS: {{ fps }}</label>
        <input type="range" min="1" max="60" v-model.number="fps" />
      </div>

      <div class="control-group">
        <label>Zoom: {{ Math.round(zoomLevel * 100) }}%</label>
        <button @click="zoomIn">+</button>
        <button @click="zoomOut">-</button>
        <button @click="resetZoom">Reset</button>
      </div>

      <div class="control-group">
        <button @click="clearCurrentFrame">Clear Frame</button>
      </div>
    </div>

    <div class="frame-info">
      Frame: {{ currentFrame + 1 }} / {{ totalFrames }}
      <span v-if="hasDrawing" class="draw-indicator">✏️</span>
    </div>

    <div class="timeline-container">
      <div
        class="timeline-track"
        @click="handleTimelineClick"
        @mousedown="startTimelineDrag"
        ref="timelineRef"
      >
        <div
          class="timeline-progress"
          :style="{ width: progressPercent + '%' }"
        ></div>
        <div
          class="timeline-handle"
          :style="{ left: progressPercent + '%' }"
        ></div>
      </div>
    </div>

    <div class="canvas-container">
      <div
        v-if="framesLoaded"
        ref="containerRef"
        class="stage-wrapper"
        @wheel="handleWheel"
      >
        <v-stage
          ref="stageRef"
          :config="stageConfig"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseLeave"
        >
          <v-layer ref="backgroundLayerRef">
            <v-image :config="imageConfig" />
          </v-layer>

          <v-layer
            ref="annotationLayerRef"
            :config="{ imageSmoothingEnabled: false }"
          ></v-layer>

          <v-layer
            ref="brushLayerRef"
            :config="{ imageSmoothingEnabled: false }"
          ></v-layer>

          <v-layer ref="cursorLayerRef"></v-layer>
        </v-stage>
      </div>
      <div v-else class="loading">Loading frames...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import Konva from "konva";
import { KonvaBrush } from "./KonvaBrush";

const stageRef = ref<any>(null);
const backgroundLayerRef = ref<any>(null);
const annotationLayerRef = ref<any>(null);
const brushLayerRef = ref<any>(null);
const cursorLayerRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const timelineRef = ref<HTMLDivElement | null>(null);

const framesLoaded = ref(false);
const currentFrame = ref(0);
const currentImage = ref<HTMLImageElement | null>(null);
const brush = ref<KonvaBrush | null>(null);

const mode = ref<"brush" | "eraser" | "pan">("brush");
const brushSize = ref(20);
const opacity = ref(1);
const zoomLevel = ref(1);
const fps = ref(9);

const isDrawing = ref(false);
const isPanning = ref(false);
const isPlaying = ref(false);
const cursorShape = ref<Konva.Circle | null>(null);

const lastPanPoint = ref<{ x: number; y: number } | null>(null);

const frameImages = ref<Map<number, HTMLImageElement>>(new Map());
const frameCanvases = ref<Map<number, HTMLCanvasElement>>(new Map());

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 800;

let animationId: number | null = null;
let lastFrameTime = 0;

const stageConfig = ref({
  width: 800,
  height: 600,
});

const getFrames = (): string[] => {
  const frameList: string[] = [];
  for (let i = 1; i <= 145; i++) {
    const frameNumber = String(i).padStart(3, "0");
    try {
      const url = new URL(
        `../../assets/Hakimi/ezgif-frame-${frameNumber}.jpg`,
        import.meta.url
      ).href;
      frameList.push(url);
    } catch (e) {
      console.error(`Failed to load frame ${frameNumber}`);
    }
  }
  return frameList;
};

const frames = getFrames();
const totalFrames = frames.length;

const imageConfig = computed(() => ({
  image: currentImage.value,
  width: stageConfig.value.width,
  height: stageConfig.value.height,
}));

const progressPercent = computed(() => {
  if (totalFrames === 0) return 0;
  return (currentFrame.value / (totalFrames - 1)) * 100;
});

const hasDrawing = computed(() => {
  return frameCanvases.value.has(currentFrame.value);
});

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const initializeBrush = async () => {
  brush.value = new KonvaBrush();
  await brush.value.initialize();
  brush.value.changeColor("#FF0000");
  brush.value.changeSize(brushSize.value);
  brush.value.changeOpacity(opacity.value);
};

const createOffscreenCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = stageConfig.value.width;
  const logicalHeight = stageConfig.value.height;

  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: false,
  })!;

  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);

  return canvas;
};

const renderFrame = async (frameIndex: number) => {
  if (frameIndex < 0 || frameIndex >= totalFrames) return;

  let img = frameImages.value.get(frameIndex);

  if (!img) {
    img = await loadImage(frames[frameIndex]!);
    frameImages.value.set(frameIndex, img);
  }

  currentImage.value = img;
  currentFrame.value = frameIndex;

  const existingCanvas = frameCanvases.value.get(frameIndex);
  if (existingCanvas) {
    updateAnnotationLayer(existingCanvas);
  } else {
    const annotationLayer = annotationLayerRef.value?.getNode();
    if (annotationLayer) {
      annotationLayer.destroyChildren();
      annotationLayer.batchDraw();
    }
  }
};

const animate = async (timestamp: number) => {
  if (!isPlaying.value) return;

  const frameInterval = 1000 / fps.value;
  const elapsed = timestamp - lastFrameTime;

  if (elapsed >= frameInterval) {
    let nextFrameIndex = currentFrame.value + 1;

    if (nextFrameIndex >= totalFrames) {
      nextFrameIndex = 0;
    }

    await renderFrame(nextFrameIndex);
    lastFrameTime = timestamp - (elapsed % frameInterval);
  }

  animationId = requestAnimationFrame(animate);
};

const togglePlay = () => {
  isPlaying.value = !isPlaying.value;

  if (isPlaying.value) {
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(animate);
  } else if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

const nextFrame = async () => {
  const next = (currentFrame.value + 1) % totalFrames;
  await renderFrame(next);
};

const previousFrame = async () => {
  const prev =
    currentFrame.value - 1 < 0 ? totalFrames - 1 : currentFrame.value - 1;
  await renderFrame(prev);
};

const handleTimelineClick = (e: MouseEvent) => {
  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;
  const targetFrame = Math.floor(percent * (totalFrames - 1));

  renderFrame(Math.max(0, Math.min(targetFrame, totalFrames - 1)));
};

let isTimelineDragging = false;

const startTimelineDrag = (e: MouseEvent) => {
  isTimelineDragging = true;
  e.preventDefault();

  const handleMove = (moveEvent: MouseEvent) => {
    if (!isTimelineDragging || !timelineRef.value) return;

    const rect = timelineRef.value.getBoundingClientRect();
    const x = moveEvent.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const targetFrame = Math.floor(percent * (totalFrames - 1));

    renderFrame(targetFrame);
  };

  const handleUp = () => {
    isTimelineDragging = false;
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleUp);
  };

  document.addEventListener("mousemove", handleMove);
  document.addEventListener("mouseup", handleUp);
};

const setMode = (newMode: "brush" | "eraser" | "pan") => {
  mode.value = newMode;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  if (newMode === "pan") {
    stage.container().style.cursor = "grab";
    if (cursorShape.value) {
      cursorShape.value.destroy();
      cursorShape.value = null;
      cursorLayerRef.value?.getNode().batchDraw();
    }
  } else {
    stage.container().style.cursor = "none";
  }

  if (newMode === "eraser" && brush.value) {
    brush.value.setDeleteMode(true);
  } else if (brush.value) {
    brush.value.changeColor("#FF0000");
  }
};

const handleSizeChange = () => {
  if (brush.value) {
    brush.value.changeSize(brushSize.value);
  }
};

const getStagePointerPosition = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return null;
  return stage.getPointerPosition();
};

const getLogicalPointerPosition = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return null;
  return stage.getRelativePointerPosition();
};

const handleMouseDown = (e: any) => {
  if (!brush.value || !brush.value.isLoaded()) return;

  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const screenPos = getStagePointerPosition();
  if (!screenPos) return;

  if (mode.value === "pan" || e.evt.altKey) {
    isPanning.value = true;
    lastPanPoint.value = screenPos;
    stage.container().style.cursor = "grabbing";
    return;
  }

  if (mode.value === "brush" || mode.value === "eraser") {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    isDrawing.value = true;
    brush.value.startStroke(logicalPos);

    const brushLayer = brushLayerRef.value?.getNode();
    if (brushLayer) {
      brushLayer.destroyChildren();
    }
  }
};

const handleMouseMove = () => {
  const screenPos = getStagePointerPosition();
  if (!screenPos) return;

  if (isPanning.value && lastPanPoint.value) {
    const stage = stageRef.value?.getStage();
    if (!stage) return;

    const dx = screenPos.x - lastPanPoint.value.x;
    const dy = screenPos.y - lastPanPoint.value.y;

    const newPos = {
      x: stage.x() + dx,
      y: stage.y() + dy,
    };

    stage.position(newPos);
    stage.batchDraw();

    lastPanPoint.value = screenPos;
    return;
  }

  if (mode.value !== "pan" && brush.value) {
    const logicalPos = getLogicalPointerPosition();
    if (logicalPos) {
      updateCursor(logicalPos);
    }
  }

  if (isDrawing.value && brush.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    brush.value.continueStroke(logicalPos);

    const brushLayer = brushLayerRef.value?.getNode();
    if (brushLayer) {
      brushLayer.destroyChildren();
      const shape = brush.value.renderStrokeShape(
        brush.value.getCurrentPoints(),
        1
      );
      brushLayer.add(shape);
      brushLayer.batchDraw();
    }
  }
};

const handleMouseUp = () => {
  const stage = stageRef.value?.getStage();
  if (stage && isPanning.value) {
    stage.container().style.cursor =
      mode.value === "pan" ? "grab" : "none";
  }

  isPanning.value = false;
  lastPanPoint.value = null;

  if (!isDrawing.value || !brush.value || !currentImage.value) return;

  const points = brush.value.endStroke();
  isDrawing.value = false;

  if (points.length === 0) return;

  let offscreenCanvas = frameCanvases.value.get(currentFrame.value);

  if (!offscreenCanvas) {
    offscreenCanvas = createOffscreenCanvas(currentImage.value);
    frameCanvases.value.set(currentFrame.value, offscreenCanvas);
  }

  const ctx = offscreenCanvas.getContext("2d")!;
  ctx.save();

  if (mode.value === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
  }

  brush.value.renderToCanvas(offscreenCanvas, points, 1);
  ctx.restore();

  const brushLayer = brushLayerRef.value?.getNode();
  if (brushLayer) {
    brushLayer.destroyChildren();
    brushLayer.batchDraw();
  }

  updateAnnotationLayer(offscreenCanvas);
};

const handleMouseLeave = () => {
  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    cursorLayerRef.value?.getNode().batchDraw();
  }
  handleMouseUp();
};

const handleKeyDown = (_e: KeyboardEvent) => {
  // Reserved for future keyboard shortcuts
};

const updateCursor = (pos: { x: number; y: number }) => {
  if (!brush.value) return;

  const cursorLayer = cursorLayerRef.value?.getNode();
  if (!cursorLayer) return;

  if (cursorShape.value) {
    cursorShape.value.destroy();
  }

  cursorShape.value = brush.value.createCursorShape(pos.x, pos.y, 1);
  cursorLayer.add(cursorShape.value);
  cursorLayer.batchDraw();
};

const updateAnnotationLayer = (offscreenCanvas: HTMLCanvasElement) => {
  const annotationLayer = annotationLayerRef.value?.getNode();
  if (!annotationLayer) return;

  annotationLayer.destroyChildren();

  const snapshotCanvas = document.createElement("canvas");
  snapshotCanvas.width = offscreenCanvas.width;
  snapshotCanvas.height = offscreenCanvas.height;

  const ctx = snapshotCanvas.getContext("2d", { alpha: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreenCanvas, 0, 0);

  const konvaImage = new Konva.Image({
    image: snapshotCanvas,
    x: 0,
    y: 0,
    width: stageConfig.value.width,
    height: stageConfig.value.height,
    listening: false,
    opacity: opacity.value,
  });

  annotationLayer.add(konvaImage);
  annotationLayer.batchDraw();
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();

  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const scaleBy = 1.05;
  const oldScale = stage.scaleX();

  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  const clampedScale = Math.max(0.1, Math.min(20, newScale));

  stage.scale({ x: clampedScale, y: clampedScale });

  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  };
  stage.position(newPos);
  stage.batchDraw();

  zoomLevel.value = clampedScale;
};

const zoomIn = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const newScale = stage.scaleX() * 1.2;
  const clampedScale = Math.min(20, newScale);

  stage.scale({ x: clampedScale, y: clampedScale });
  stage.batchDraw();
  zoomLevel.value = clampedScale;
};

const zoomOut = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const newScale = stage.scaleX() / 1.2;
  const clampedScale = Math.max(0.1, newScale);

  stage.scale({ x: clampedScale, y: clampedScale });
  stage.batchDraw();
  zoomLevel.value = clampedScale;
};

const resetZoom = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  zoomLevel.value = 1;
};

const clearCurrentFrame = () => {
  frameCanvases.value.delete(currentFrame.value);

  const annotationLayer = annotationLayerRef.value?.getNode();
  if (annotationLayer) {
    annotationLayer.destroyChildren();
    annotationLayer.batchDraw();
  }
};

onMounted(async () => {
  try {
    const firstImg = await loadImage(frames[0]!);
    frameImages.value.set(0, firstImg);

    const scale = Math.min(
      MAX_WIDTH / firstImg.width,
      MAX_HEIGHT / firstImg.height,
      1
    );

    stageConfig.value.width = Math.floor(firstImg.width * scale);
    stageConfig.value.height = Math.floor(firstImg.height * scale);

    currentImage.value = firstImg;
    framesLoaded.value = true;

    await initializeBrush();

    for (let i = 1; i < Math.min(30, totalFrames); i++) {
      loadImage(frames[i]!).then((img) => frameImages.value.set(i, img));
    }

    window.addEventListener("keydown", handleKeyDown);
  } catch (error) {
    console.error("Failed to load first frame:", error);
  }
});

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener("keydown", handleKeyDown);
});

watch(zoomLevel, () => {
  if (cursorShape.value && brush.value) {
    const pos = getLogicalPointerPosition();
    if (pos) {
      updateCursor(pos);
    }
  }
});

watch(opacity, () => {
  const annotationLayer = annotationLayerRef.value?.getNode();
  if (!annotationLayer) return;

  const images = annotationLayer.getChildren();
  images.forEach((img: any) => {
    img.opacity(opacity.value);
  });
  annotationLayer.batchDraw();
});
</script>

<style scoped>
.frame-player {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 100%;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  color: black;
}

.control-group label {
  font-weight: 600;
  min-width: 80px;
  color: #333;
}

.control-group button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: #333;
}

.control-group button:hover {
  background: #e9ecef;
}

.control-group button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.control-group input[type="range"] {
  width: 150px;
}

.frame-info {
  font-weight: 600;
  color: #333;
  padding: 10px 15px;
  background: #f5f5f5;
  border-radius: 4px;
  text-align: center;
}

.draw-indicator {
  color: #007bff;
  margin-left: 5px;
}

.timeline-container {
  width: 100%;
  padding: 10px 0;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.timeline-progress {
  position: absolute;
  height: 100%;
  background: #007bff;
  border-radius: 4px;
  transition: width 0.1s;
  pointer-events: none;
}

.timeline-handle {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  background: #007bff;
  border: 3px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s;
}

.timeline-handle:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.timeline-handle:active {
  cursor: grabbing;
}

.canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.stage-wrapper {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: #fff;
  position: relative;
}

.loading {
  padding: 40px;
  font-size: 18px;
  color: #666;
}
</style>
