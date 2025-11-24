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
        <button :class="{ active: mode === 'bbox' }" @click="setMode('bbox')">
          BBox
        </button>
        <button
          :class="{ active: mode === 'select' }"
          @click="setMode('select')"
        >
          Select
        </button>
        <button
          :class="{ active: mode === 'polygon' }"
          @click="setMode('polygon')"
        >
          Polygon
        </button>
        <button
          :class="{ active: mode === 'skeleton' }"
          @click="setMode('skeleton')"
        >
          Skeleton
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
        <input type="range" min="0.25" max="30" step="0.25" v-model.number="fps" />
      </div>

      <div v-if="mode === 'bbox'" class="control-group">
        <label>Color:</label>
        <input type="color" v-model="bboxColor" class="color-picker" />
      </div>

      <div class="control-group">
        <label>Zoom: {{ Math.round(zoomLevel * 100) }}%</label>
        <button @click="zoomIn">+</button>
        <button @click="zoomOut">-</button>
        <button @click="resetZoom">Reset</button>
      </div>

      <div class="control-group">
        <button @click="clearCurrentFrame">Clear Frame</button>
        <button v-if="selectedBboxId" @click="deleteSelectedBbox">
          Delete BBox
        </button>
        <button v-if="selectedPolygonId" @click="deleteSelectedPolygon">
          Delete Polygon
        </button>
        <button v-if="selectedSkeletonId" @click="deleteSelectedSkeleton">
          Delete Skeleton
        </button>
      </div>
    </div>

    <div class="frame-info">
      Second: {{ currentSecond }} / {{ totalFrames }}
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
          @dblclick="handleDoubleClick"
        >
          <v-layer ref="backgroundLayerRef">
            <v-image :config="imageConfig" />
          </v-layer>

          <v-layer
            ref="annotationLayerRef"
            :config="{ imageSmoothingEnabled: false }"
          ></v-layer>

          <v-layer ref="bboxLayerRef">
            <v-group
              v-for="bbox in currentFrameBboxes"
              :key="bbox.id"
              :config="{
                id: bbox.id,
                x: bbox.x,
                y: bbox.y,
                rotation: bbox.rotation,
                draggable: mode === 'select',
                name: 'boundingBox',
              }"
              @click="handleBboxClick"
              @dragend="handleBboxDragEnd"
              @transformend="handleBboxTransformEnd"
            >
              <v-rect
                :config="{
                  width: bbox.width,
                  height: bbox.height,
                  stroke: bbox.color,
                  strokeWidth: 2,
                  fill: bbox.color + '20',
                }"
              />
            </v-group>
          </v-layer>

          <v-layer ref="polygonLayerRef">
            <template v-for="polygon in currentFramePolygons" :key="polygon.id">
              <v-line
                :config="{
                  id: polygon.id,
                  x: 0,
                  y: 0,
                  points: polygon.points.flatMap((p) => [p.x, p.y]),
                  fill: polygon.color + '30',
                  stroke: polygon.color,
                  strokeWidth: 2,
                  closed: true,
                  draggable: mode === 'select',
                  name: 'polygon',
                }"
                @click="handlePolygonClick"
                @dragend="handlePolygonDragEnd"
              />
              <v-circle
                v-for="(point, pointIdx) in polygon.points"
                :key="`${polygon.id}-pt-${pointIdx}`"
                :config="{
                  x: point.x,
                  y: point.y,
                  radius: 6,
                  fill: polygon.color,
                  stroke:
                    selectedPolygonId === polygon.id ? '#fff' : polygon.color,
                  strokeWidth: selectedPolygonId === polygon.id ? 2 : 1,
                  draggable: mode === 'select',
                  name: 'polygonVertex',
                }"
                @dragmove="(e: any) => handlePolygonVertexDragMove(e, polygon.id, pointIdx)"
                @dragend="(e: any) => handlePolygonVertexDragEnd(e, polygon.id, pointIdx)"
                @click="() => handlePolygonVertexClick(polygon.id)"
              />
            </template>
          </v-layer>

          <v-layer ref="skeletonLayerRef">
            <template
              v-for="skeleton in currentFrameSkeletons"
              :key="skeleton.id"
            >
              <v-line
                :config="{
                  id: skeleton.id,
                  x: 0,
                  y: 0,
                  points: skeleton.points.flatMap((p) => [p.x, p.y]),
                  stroke: skeleton.color,
                  strokeWidth: 2,
                  lineCap: 'round',
                  lineJoin: 'round',
                  draggable: mode === 'select',
                  name: 'skeleton',
                }"
                @click="handleSkeletonClick"
                @dragend="handleSkeletonDragEnd"
              />
              <v-circle
                v-for="(point, pointIdx) in skeleton.points"
                :key="`${skeleton.id}-kp-${pointIdx}`"
                :config="{
                  x: point.x,
                  y: point.y,
                  radius: 6,
                  fill: skeleton.color,
                  stroke:
                    selectedSkeletonId === skeleton.id
                      ? '#fff'
                      : skeleton.color,
                  strokeWidth: selectedSkeletonId === skeleton.id ? 2 : 1,
                  draggable: mode === 'select',
                  name: 'skeletonKeypoint',
                }"
                @dragmove="(e: any) => handleSkeletonKeypointDragMove(e, skeleton.id, pointIdx)"
                @dragend="(e: any) => handleSkeletonKeypointDragEnd(e, skeleton.id, pointIdx)"
                @click="() => handleSkeletonKeypointClick(skeleton.id)"
              />
            </template>
          </v-layer>

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
import type { BoundingBox } from "../../types/boundingBox";
import type { Polygon, PolygonPoint } from "../../types/polygon";
import type { Skeleton, SkeletonPoint } from "../../types/skeleton";

const stageRef = ref<any>(null);
const backgroundLayerRef = ref<any>(null);
const annotationLayerRef = ref<any>(null);
const bboxLayerRef = ref<any>(null);
const polygonLayerRef = ref<any>(null);
const skeletonLayerRef = ref<any>(null);
const brushLayerRef = ref<any>(null);
const cursorLayerRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const timelineRef = ref<HTMLDivElement | null>(null);

const framesLoaded = ref(false);
const currentFrame = ref(0);
const currentImage = ref<HTMLImageElement | null>(null);
const brush = ref<KonvaBrush | null>(null);

const mode = ref<
  "brush" | "eraser" | "pan" | "bbox" | "select" | "polygon" | "skeleton"
>("brush");
const brushSize = ref(20);
const bboxColor = ref("#FF0000");
const polygonColor = ref("#00FF00");
const skeletonColor = ref("#0000FF");
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

const frameBboxes = ref<Map<number, BoundingBox[]>>(new Map());
const selectedBboxId = ref<string | null>(null);
const bboxStartPos = ref<{ x: number; y: number } | null>(null);
const bboxPreview = ref<Konva.Rect | null>(null);
const transformerRef = ref<Konva.Transformer | null>(null);

const framePolygons = ref<Map<number, Polygon[]>>(new Map());
const selectedPolygonId = ref<string | null>(null);
const isDrawingPolygon = ref(false);
const currentPolygonPoints = ref<PolygonPoint[]>([]);
const polygonPreviewLine = ref<Konva.Line | null>(null);
const polygonPreviewCircles = ref<Konva.Circle[]>([]);

const frameSkeletons = ref<Map<number, Skeleton[]>>(new Map());
const selectedSkeletonId = ref<string | null>(null);
const isDrawingSkeleton = ref(false);
const currentSkeletonPoints = ref<SkeletonPoint[]>([]);
const skeletonPreviewLine = ref<Konva.Line | null>(null);
const skeletonPreviewCircles = ref<Konva.Circle[]>([]);

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
const physicalFrames = frames.length;

const totalFrames = computed(() => {
  return Math.ceil(physicalFrames / fps.value);
});

const imageConfig = computed(() => ({
  image: currentImage.value,
  width: stageConfig.value.width,
  height: stageConfig.value.height,
}));

const progressPercent = computed(() => {
  if (physicalFrames === 0) return 0;
  return (currentFrame.value / (physicalFrames - 1)) * 100;
});

const currentSecond = computed(() => {
  return Math.floor(currentFrame.value / fps.value) + 1;
});

const hasDrawing = computed(() => {
  return frameCanvases.value.has(currentFrame.value);
});

const currentFrameBboxes = computed(() => {
  return frameBboxes.value.get(currentFrame.value) || [];
});

const currentFramePolygons = computed(() => {
  return framePolygons.value.get(currentFrame.value) || [];
});

const currentFrameSkeletons = computed(() => {
  return frameSkeletons.value.get(currentFrame.value) || [];
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
  if (frameIndex < 0 || frameIndex >= physicalFrames) return;

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

    if (nextFrameIndex >= physicalFrames) {
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
  const next = currentFrame.value + Math.floor(fps.value);
  if (next >= physicalFrames) {
    await renderFrame(0);
  } else {
    await renderFrame(next);
  }
};

const previousFrame = async () => {
  const prev = currentFrame.value - Math.floor(fps.value);
  if (prev < 0) {
    await renderFrame(physicalFrames - 1);
  } else {
    await renderFrame(prev);
  }
};

const handleTimelineClick = (e: MouseEvent) => {
  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;
  const targetFrame = Math.floor(percent * (physicalFrames - 1));

  renderFrame(Math.max(0, Math.min(targetFrame, physicalFrames - 1)));
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
    const targetFrame = Math.floor(percent * (physicalFrames - 1));

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

const setMode = (
  newMode:
    | "brush"
    | "eraser"
    | "pan"
    | "bbox"
    | "select"
    | "polygon"
    | "skeleton"
) => {
  mode.value = newMode;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    cursorLayerRef.value?.getNode().batchDraw();
  }

  if (newMode === "pan") {
    stage.container().style.cursor = "grab";
  } else if (newMode === "bbox" || newMode === "polygon") {
    stage.container().style.cursor = "crosshair";
  } else if (newMode === "select") {
    stage.container().style.cursor = "default";
  } else if (newMode === "brush" || newMode === "eraser") {
    stage.container().style.cursor = "none";
  }

  if (newMode === "eraser" && brush.value) {
    brush.value.setDeleteMode(true);
  } else if (newMode === "brush" && brush.value) {
    brush.value.changeColor("#FF0000");
  }

  if (newMode !== "polygon" && isDrawingPolygon.value) {
    cancelPolygonDrawing();
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

const setupTransformer = () => {
  if (!bboxLayerRef.value) return;

  const layer = bboxLayerRef.value.getNode();

  transformerRef.value = new Konva.Transformer({
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

  layer.add(transformerRef.value);
};

const updateTransformerSelection = () => {
  if (!transformerRef.value || !bboxLayerRef.value) return;

  if (!selectedBboxId.value) {
    transformerRef.value.nodes([]);
    bboxLayerRef.value.getNode().batchDraw();
    return;
  }

  const layer = bboxLayerRef.value.getNode();
  const group = layer.findOne(`#${selectedBboxId.value}`);

  if (group) {
    transformerRef.value.nodes([group]);
  } else {
    transformerRef.value.nodes([]);
  }

  layer.batchDraw();
};

const startBboxDrawing = (pos: { x: number; y: number }) => {
  bboxStartPos.value = pos;
  const layer = bboxLayerRef.value?.getNode();
  if (!layer) return;

  bboxPreview.value = new Konva.Rect({
    x: pos.x,
    y: pos.y,
    width: 0,
    height: 0,
    stroke: bboxColor.value,
    strokeWidth: 2,
    dash: [5, 5],
    listening: false,
  });

  layer.add(bboxPreview.value);
  layer.batchDraw();
};

const updateBboxPreview = (pos: { x: number; y: number }) => {
  if (!bboxPreview.value || !bboxStartPos.value || !bboxLayerRef.value) return;

  const width = pos.x - bboxStartPos.value.x;
  const height = pos.y - bboxStartPos.value.y;

  bboxPreview.value.setAttrs({
    x: width < 0 ? pos.x : bboxStartPos.value.x,
    y: height < 0 ? pos.y : bboxStartPos.value.y,
    width: Math.abs(width),
    height: Math.abs(height),
  });

  bboxLayerRef.value.getNode().batchDraw();
};

const finishBboxDrawing = () => {
  if (!bboxPreview.value || !bboxStartPos.value) return;

  const width = bboxPreview.value.width();
  const height = bboxPreview.value.height();

  if (width < 10 || height < 10) {
    bboxPreview.value.destroy();
    bboxPreview.value = null;
    bboxStartPos.value = null;
    bboxLayerRef.value?.getNode().batchDraw();
    return;
  }

  const bbox: BoundingBox = {
    id: `bbox_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    x: bboxPreview.value.x(),
    y: bboxPreview.value.y(),
    width: width,
    height: height,
    rotation: 0,
    color: bboxColor.value,
    classId: 0,
  };

  const currentBboxes = frameBboxes.value.get(currentFrame.value) || [];
  frameBboxes.value.set(currentFrame.value, [...currentBboxes, bbox]);

  bboxPreview.value.destroy();
  bboxPreview.value = null;
  bboxStartPos.value = null;
  bboxLayerRef.value?.getNode().batchDraw();
};

const handleBboxClick = (e: any) => {
  if (mode.value !== "select") return;

  const group = e.target.findAncestor("Group");
  if (group) {
    selectedBboxId.value = group.id();
    updateTransformerSelection();
  }
};

const handleBboxDragEnd = (e: any) => {
  const group = e.target;
  const bboxId = group.id();

  const currentBboxes = frameBboxes.value.get(currentFrame.value);
  if (!currentBboxes) return;

  const bboxIndex = currentBboxes.findIndex((b) => b.id === bboxId);
  if (bboxIndex === -1) return;

  const oldBbox = currentBboxes[bboxIndex];
  if (!oldBbox) return;

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

  currentBboxes[bboxIndex] = updatedBbox;
  frameBboxes.value.set(currentFrame.value, [...currentBboxes]);
};

const handleBboxTransformEnd = () => {
  const nodes = transformerRef.value?.nodes();
  if (!nodes || nodes.length === 0) return;

  const group = nodes[0] as Konva.Group;
  const bboxId = group.id();

  const currentBboxes = frameBboxes.value.get(currentFrame.value);
  if (!currentBboxes) return;

  const bboxIndex = currentBboxes.findIndex((b) => b.id === bboxId);
  if (bboxIndex === -1) return;

  const oldBbox = currentBboxes[bboxIndex];
  if (!oldBbox) return;

  const rect = group.findOne("Rect");
  if (!rect) return;

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

  currentBboxes[bboxIndex] = updatedBbox;
  frameBboxes.value.set(currentFrame.value, [...currentBboxes]);
};

const deleteSelectedBbox = () => {
  if (!selectedBboxId.value) return;

  const currentBboxes = frameBboxes.value.get(currentFrame.value);
  if (!currentBboxes) return;

  const filtered = currentBboxes.filter((b) => b.id !== selectedBboxId.value);

  if (filtered.length > 0) {
    frameBboxes.value.set(currentFrame.value, filtered);
  } else {
    frameBboxes.value.delete(currentFrame.value);
  }

  selectedBboxId.value = null;
  updateTransformerSelection();
};

const createPolygonPreviewCircle = (x: number, y: number): Konva.Circle => {
  return new Konva.Circle({
    x,
    y,
    radius: 6,
    fill: polygonColor.value,
    stroke: "#fff",
    strokeWidth: 2,
    listening: false,
  });
};

const clearPolygonPreviewCircles = () => {
  for (const circle of polygonPreviewCircles.value) {
    circle.destroy();
  }
  polygonPreviewCircles.value = [];
};

const startPolygonDrawing = (pos: { x: number; y: number }) => {
  isDrawingPolygon.value = true;
  currentPolygonPoints.value = [{ x: pos.x, y: pos.y }];

  const layer = polygonLayerRef.value?.getNode();
  if (!layer) return;

  polygonPreviewLine.value = new Konva.Line({
    points: [pos.x, pos.y],
    stroke: polygonColor.value,
    strokeWidth: 2,
    dash: [5, 5],
    closed: true,
    fill: polygonColor.value + "30",
    listening: false,
  });
  layer.add(polygonPreviewLine.value);

  const circle = createPolygonPreviewCircle(pos.x, pos.y);
  layer.add(circle);
  polygonPreviewCircles.value.push(circle);

  layer.batchDraw();
};

const addPolygonPoint = (pos: { x: number; y: number }) => {
  const firstPoint = currentPolygonPoints.value[0];
  if (!firstPoint) return;

  const distance = Math.sqrt(
    Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
  );

  if (distance < 15 && currentPolygonPoints.value.length >= 3) {
    completePolygonDrawing();
  } else {
    currentPolygonPoints.value.push({ x: pos.x, y: pos.y });

    const layer = polygonLayerRef.value?.getNode();
    if (!layer) return;

    const circle = createPolygonPreviewCircle(pos.x, pos.y);
    layer.add(circle);
    polygonPreviewCircles.value.push(circle);

    updatePolygonPreview();
  }
};

const updatePolygonPreview = () => {
  if (!polygonPreviewLine.value || !polygonLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentPolygonPoints.value) {
    points.push(p.x, p.y);
  }

  polygonPreviewLine.value.points(points);
  polygonLayerRef.value.getNode().batchDraw();
};

const updatePolygonPreviewWithMouse = (pos: { x: number; y: number }) => {
  if (!polygonPreviewLine.value || !polygonLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentPolygonPoints.value) {
    points.push(p.x, p.y);
  }
  points.push(pos.x, pos.y);

  polygonPreviewLine.value.points(points);
  polygonLayerRef.value.getNode().batchDraw();
};

const completePolygonDrawing = () => {
  if (currentPolygonPoints.value.length < 3) {
    cancelPolygonDrawing();
    return;
  }

  const polygon: Polygon = {
    id: `polygon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    points: [...currentPolygonPoints.value],
    color: polygonColor.value,
    classId: 0,
  };

  if (polygonPreviewLine.value) {
    polygonPreviewLine.value.destroy();
    polygonPreviewLine.value = null;
  }

  clearPolygonPreviewCircles();

  const currentPolygons = framePolygons.value.get(currentFrame.value) || [];
  framePolygons.value.set(currentFrame.value, [...currentPolygons, polygon]);

  console.log("Polygon completed and saved:", polygon.id);
  console.log(
    "Total polygons on frame",
    currentFrame.value,
    ":",
    currentPolygons.length + 1
  );

  selectedPolygonId.value = polygon.id;
  isDrawingPolygon.value = false;
  currentPolygonPoints.value = [];

  if (polygonLayerRef.value) {
    polygonLayerRef.value.getNode().batchDraw();
  }
};

const cancelPolygonDrawing = () => {
  if (polygonPreviewLine.value) {
    polygonPreviewLine.value.destroy();
    polygonPreviewLine.value = null;
  }
  clearPolygonPreviewCircles();
  isDrawingPolygon.value = false;
  currentPolygonPoints.value = [];
  if (polygonLayerRef.value) {
    polygonLayerRef.value.getNode().batchDraw();
  }
};

const handlePolygonClick = (e: any) => {
  if (mode.value !== "select") return;

  const line = e.target;
  if (line && line.id()) {
    selectedPolygonId.value = line.id();
    selectedBboxId.value = null;
  }
};

const handlePolygonDragEnd = (e: any) => {
  const line = e.target;
  const polygonId = line.id();

  const currentPolygons = framePolygons.value.get(currentFrame.value);
  if (!currentPolygons) return;

  const polygonIndex = currentPolygons.findIndex((p) => p.id === polygonId);
  if (polygonIndex === -1) return;

  const oldPolygon = currentPolygons[polygonIndex];
  if (!oldPolygon) return;

  const dx = line.x();
  const dy = line.y();

  const updatedPoints = oldPolygon.points.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
  }));

  line.x(0);
  line.y(0);

  const updatedPolygon: Polygon = {
    id: oldPolygon.id,
    points: updatedPoints,
    color: oldPolygon.color,
    classId: oldPolygon.classId,
    label: oldPolygon.label,
  };

  currentPolygons[polygonIndex] = updatedPolygon;
  framePolygons.value.set(currentFrame.value, [...currentPolygons]);
};

const handlePolygonVertexClick = (polygonId: string) => {
  if (mode.value !== "select") return;
  selectedPolygonId.value = polygonId;
  selectedBboxId.value = null;
};

const handlePolygonVertexDragMove = (
  e: any,
  polygonId: string,
  pointIdx: number
) => {
  const circle = e.target;
  if (!polygonLayerRef.value) return;

  const currentPolygons = framePolygons.value.get(currentFrame.value);
  if (!currentPolygons) return;

  const polygon = currentPolygons.find((p) => p.id === polygonId);
  if (!polygon) return;

  const layer = polygonLayerRef.value.getNode();
  const line = layer.findOne(`#${polygonId}`);
  if (!line) return;

  const points = [...polygon.points];
  points[pointIdx] = {
    x: circle.x(),
    y: circle.y(),
  };

  const flatPoints: number[] = [];
  for (const p of points) {
    flatPoints.push(p.x, p.y);
  }
  line.points(flatPoints);

  layer.batchDraw();
};

const handlePolygonVertexDragEnd = (
  e: any,
  polygonId: string,
  pointIdx: number
) => {
  const circle = e.target;

  const currentPolygons = framePolygons.value.get(currentFrame.value);
  if (!currentPolygons) return;

  const polygonIndex = currentPolygons.findIndex((p) => p.id === polygonId);
  if (polygonIndex === -1) return;

  const oldPolygon = currentPolygons[polygonIndex];
  if (!oldPolygon) return;

  const updatedPoints = oldPolygon.points.map((p, i) =>
    i === pointIdx ? { x: circle.x(), y: circle.y() } : p
  );

  const updatedPolygon: Polygon = {
    id: oldPolygon.id,
    points: updatedPoints,
    color: oldPolygon.color,
    classId: oldPolygon.classId,
    label: oldPolygon.label,
  };

  currentPolygons[polygonIndex] = updatedPolygon;
  framePolygons.value.set(currentFrame.value, [...currentPolygons]);
};

const deleteSelectedPolygon = () => {
  if (!selectedPolygonId.value) return;

  const currentPolygons = framePolygons.value.get(currentFrame.value);
  if (!currentPolygons) return;

  const filtered = currentPolygons.filter(
    (p) => p.id !== selectedPolygonId.value
  );

  if (filtered.length > 0) {
    framePolygons.value.set(currentFrame.value, filtered);
  } else {
    framePolygons.value.delete(currentFrame.value);
  }

  selectedPolygonId.value = null;
};

const SKELETON_MERGE_THRESHOLD = 5;

const createSkeletonPreviewCircle = (x: number, y: number): Konva.Circle => {
  return new Konva.Circle({
    x,
    y,
    radius: 6,
    fill: skeletonColor.value,
    stroke: "#fff",
    strokeWidth: 2,
    listening: false,
  });
};

const clearSkeletonPreviewCircles = () => {
  for (const circle of skeletonPreviewCircles.value) {
    circle.destroy();
  }
  skeletonPreviewCircles.value = [];
};

const shouldMergeWithExistingPoint = (pos: {
  x: number;
  y: number;
}): boolean => {
  for (const existingPoint of currentSkeletonPoints.value) {
    const distance = Math.sqrt(
      Math.pow(pos.x - existingPoint.x, 2) +
        Math.pow(pos.y - existingPoint.y, 2)
    );
    if (distance < SKELETON_MERGE_THRESHOLD) {
      return true;
    }
  }
  return false;
};

const startSkeletonDrawing = (pos: { x: number; y: number }) => {
  isDrawingSkeleton.value = true;
  currentSkeletonPoints.value = [{ x: pos.x, y: pos.y }];

  const layer = skeletonLayerRef.value?.getNode();
  if (!layer) return;

  skeletonPreviewLine.value = new Konva.Line({
    points: [pos.x, pos.y],
    stroke: skeletonColor.value,
    strokeWidth: 2,
    dash: [5, 5],
    lineCap: "round",
    lineJoin: "round",
    listening: false,
  });
  layer.add(skeletonPreviewLine.value);

  const circle = createSkeletonPreviewCircle(pos.x, pos.y);
  layer.add(circle);
  skeletonPreviewCircles.value.push(circle);

  layer.batchDraw();
};

const addSkeletonPoint = (pos: { x: number; y: number }) => {
  if (shouldMergeWithExistingPoint(pos)) {
    return;
  }

  currentSkeletonPoints.value.push({ x: pos.x, y: pos.y });

  const layer = skeletonLayerRef.value?.getNode();
  if (!layer) return;

  const circle = createSkeletonPreviewCircle(pos.x, pos.y);
  layer.add(circle);
  skeletonPreviewCircles.value.push(circle);

  updateSkeletonPreview();
};

const updateSkeletonPreview = () => {
  if (!skeletonPreviewLine.value || !skeletonLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentSkeletonPoints.value) {
    points.push(p.x, p.y);
  }

  skeletonPreviewLine.value.points(points);
  skeletonLayerRef.value.getNode().batchDraw();
};

const updateSkeletonPreviewWithMouse = (pos: { x: number; y: number }) => {
  if (!skeletonPreviewLine.value || !skeletonLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentSkeletonPoints.value) {
    points.push(p.x, p.y);
  }
  points.push(pos.x, pos.y);

  skeletonPreviewLine.value.points(points);
  skeletonLayerRef.value.getNode().batchDraw();
};

const completeSkeletonDrawing = () => {
  if (currentSkeletonPoints.value.length < 2) {
    cancelSkeletonDrawing();
    return;
  }

  const skeleton: Skeleton = {
    id: `skeleton_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    points: [...currentSkeletonPoints.value],
    color: skeletonColor.value,
    classId: 0,
  };

  if (skeletonPreviewLine.value) {
    skeletonPreviewLine.value.destroy();
    skeletonPreviewLine.value = null;
  }

  clearSkeletonPreviewCircles();

  const currentSkeletons = frameSkeletons.value.get(currentFrame.value) || [];
  frameSkeletons.value.set(currentFrame.value, [...currentSkeletons, skeleton]);

  selectedSkeletonId.value = skeleton.id;
  isDrawingSkeleton.value = false;
  currentSkeletonPoints.value = [];

  if (skeletonLayerRef.value) {
    skeletonLayerRef.value.getNode().batchDraw();
  }
};

const cancelSkeletonDrawing = () => {
  if (skeletonPreviewLine.value) {
    skeletonPreviewLine.value.destroy();
    skeletonPreviewLine.value = null;
  }
  clearSkeletonPreviewCircles();
  isDrawingSkeleton.value = false;
  currentSkeletonPoints.value = [];
  if (skeletonLayerRef.value) {
    skeletonLayerRef.value.getNode().batchDraw();
  }
};

const handleSkeletonClick = (e: any) => {
  if (mode.value !== "select") return;

  const line = e.target;
  if (line && line.id()) {
    selectedSkeletonId.value = line.id();
    selectedBboxId.value = null;
    selectedPolygonId.value = null;
  }
};

const handleSkeletonDragEnd = (e: any) => {
  const line = e.target;
  const skeletonId = line.id();

  const currentSkeletons = frameSkeletons.value.get(currentFrame.value);
  if (!currentSkeletons) return;

  const skeletonIndex = currentSkeletons.findIndex((s) => s.id === skeletonId);
  if (skeletonIndex === -1) return;

  const oldSkeleton = currentSkeletons[skeletonIndex];
  if (!oldSkeleton) return;

  const dx = line.x();
  const dy = line.y();

  const updatedPoints = oldSkeleton.points.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
  }));

  line.x(0);
  line.y(0);

  const updatedSkeleton: Skeleton = {
    id: oldSkeleton.id,
    points: updatedPoints,
    color: oldSkeleton.color,
    classId: oldSkeleton.classId,
    label: oldSkeleton.label,
  };

  currentSkeletons[skeletonIndex] = updatedSkeleton;
  frameSkeletons.value.set(currentFrame.value, [...currentSkeletons]);
};

const handleSkeletonKeypointClick = (skeletonId: string) => {
  if (mode.value !== "select") return;
  selectedSkeletonId.value = skeletonId;
  selectedBboxId.value = null;
  selectedPolygonId.value = null;
};

const handleSkeletonKeypointDragMove = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const circle = e.target;
  if (!skeletonLayerRef.value) return;

  const currentSkeletons = frameSkeletons.value.get(currentFrame.value);
  if (!currentSkeletons) return;

  const skeleton = currentSkeletons.find((s) => s.id === skeletonId);
  if (!skeleton) return;

  const layer = skeletonLayerRef.value.getNode();
  const line = layer.findOne(`#${skeletonId}`);
  if (!line) return;

  const points = [...skeleton.points];
  points[pointIdx] = {
    x: circle.x(),
    y: circle.y(),
  };

  const flatPoints: number[] = [];
  for (const p of points) {
    flatPoints.push(p.x, p.y);
  }
  line.points(flatPoints);

  layer.batchDraw();
};

const handleSkeletonKeypointDragEnd = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const circle = e.target;

  const currentSkeletons = frameSkeletons.value.get(currentFrame.value);
  if (!currentSkeletons) return;

  const skeletonIndex = currentSkeletons.findIndex((s) => s.id === skeletonId);
  if (skeletonIndex === -1) return;

  const oldSkeleton = currentSkeletons[skeletonIndex];
  if (!oldSkeleton) return;

  const updatedPoints = oldSkeleton.points.map((p, i) =>
    i === pointIdx ? { x: circle.x(), y: circle.y() } : p
  );

  const updatedSkeleton: Skeleton = {
    id: oldSkeleton.id,
    points: updatedPoints,
    color: oldSkeleton.color,
    classId: oldSkeleton.classId,
    label: oldSkeleton.label,
  };

  currentSkeletons[skeletonIndex] = updatedSkeleton;
  frameSkeletons.value.set(currentFrame.value, [...currentSkeletons]);
};

const deleteSelectedSkeleton = () => {
  if (!selectedSkeletonId.value) return;

  const currentSkeletons = frameSkeletons.value.get(currentFrame.value);
  if (!currentSkeletons) return;

  const filtered = currentSkeletons.filter(
    (s) => s.id !== selectedSkeletonId.value
  );

  if (filtered.length > 0) {
    frameSkeletons.value.set(currentFrame.value, filtered);
  } else {
    frameSkeletons.value.delete(currentFrame.value);
  }

  selectedSkeletonId.value = null;
};

const handleMouseDown = (e: any) => {
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

  if (mode.value === "polygon") {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    if (!isDrawingPolygon.value) {
      startPolygonDrawing(logicalPos);
    } else {
      addPolygonPoint(logicalPos);
    }
    return;
  }

  if (mode.value === "skeleton") {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    if (!isDrawingSkeleton.value) {
      startSkeletonDrawing(logicalPos);
    } else {
      addSkeletonPoint(logicalPos);
    }
    return;
  }

  if (mode.value === "bbox") {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    isDrawing.value = true;
    startBboxDrawing(logicalPos);
    return;
  }

  if (mode.value === "select") {
    const target = e.target;
    if (target === stage || target.getClassName() === "Image") {
      selectedBboxId.value = null;
      selectedPolygonId.value = null;
      selectedSkeletonId.value = null;
      updateTransformerSelection();
    }
    return;
  }

  if (
    (mode.value === "brush" || mode.value === "eraser") &&
    brush.value?.isLoaded()
  ) {
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

  if (mode.value === "polygon" && isDrawingPolygon.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updatePolygonPreviewWithMouse(logicalPos);
    return;
  }

  if (mode.value === "skeleton" && isDrawingSkeleton.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updateSkeletonPreviewWithMouse(logicalPos);
    return;
  }

  if (mode.value === "bbox" && isDrawing.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updateBboxPreview(logicalPos);
    return;
  }

  if (
    mode.value !== "pan" &&
    mode.value !== "bbox" &&
    mode.value !== "select" &&
    mode.value !== "polygon" &&
    mode.value !== "skeleton" &&
    brush.value
  ) {
    const logicalPos = getLogicalPointerPosition();
    if (logicalPos) {
      updateCursor(logicalPos);
    }
  }

  if (
    isDrawing.value &&
    (mode.value === "brush" || mode.value === "eraser") &&
    brush.value
  ) {
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
      mode.value === "pan"
        ? "grab"
        : mode.value === "bbox"
        ? "crosshair"
        : mode.value === "select"
        ? "default"
        : "none";
  }

  isPanning.value = false;
  lastPanPoint.value = null;

  if (mode.value === "bbox" && isDrawing.value) {
    isDrawing.value = false;
    finishBboxDrawing();
    return;
  }

  if (!isDrawing.value || !brush.value || !currentImage.value) return;
  if (mode.value !== "brush" && mode.value !== "eraser") return;

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

  if (mode.value === "polygon" && isDrawingPolygon.value) {
    if (polygonPreviewLine.value) {
      updatePolygonPreview();
    }
    return;
  }

  if (mode.value === "bbox" && isDrawing.value && bboxPreview.value) {
    bboxPreview.value.destroy();
    bboxPreview.value = null;
    bboxStartPos.value = null;
    isDrawing.value = false;
    bboxLayerRef.value?.getNode().batchDraw();
    return;
  }

  handleMouseUp();
};

const handleDoubleClick = () => {
  if (mode.value === "polygon" && isDrawingPolygon.value) {
    if (currentPolygonPoints.value.length >= 3) {
      completePolygonDrawing();
    }
  }
  if (mode.value === "skeleton" && isDrawingSkeleton.value) {
    if (currentSkeletonPoints.value.length >= 2) {
      completeSkeletonDrawing();
    }
  }
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
  frameBboxes.value.delete(currentFrame.value);
  framePolygons.value.delete(currentFrame.value);
  frameSkeletons.value.delete(currentFrame.value);

  const annotationLayer = annotationLayerRef.value?.getNode();
  if (annotationLayer) {
    annotationLayer.destroyChildren();
    annotationLayer.batchDraw();
  }

  selectedBboxId.value = null;
  selectedPolygonId.value = null;
  selectedSkeletonId.value = null;
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

    await new Promise((resolve) => setTimeout(resolve, 100));
    setupTransformer();

    for (let i = 1; i < Math.min(30, physicalFrames); i++) {
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

watch(currentFrame, () => {
  selectedBboxId.value = null;
  selectedPolygonId.value = null;
  updateTransformerSelection();

  if (isDrawingPolygon.value) {
    cancelPolygonDrawing();
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

.control-group .color-picker {
  cursor: pointer;
  border: 1px solid #ddd;
  border-radius: 4px;
  height: 32px;
  width: 60px;
}

.control-group .drawing-hint {
  margin-left: 10px;
  color: #007bff;
  font-size: 13px;
  font-style: italic;
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
