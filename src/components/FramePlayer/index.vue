<template>
  <div class="frame-player">
    <div class="controls">
      <div class="control-group">
        <button @click="togglePlay">{{ isPlaying ? "Pause" : "Play" }}</button>
        <button @click="previousFrame">Previous</button>
        <button @click="nextFrame">Next</button>
      </div>

      <div class="control-group">
        <button
          @click="handleJumpToPreviousKeyframe"
          class="keyframe-nav-btn"
          :disabled="!timelineRef?.selectedTrackId"
        >
          ◄◄ Keyframe
        </button>
        <button
          @click="handleJumpToNextKeyframe"
          class="keyframe-nav-btn"
          :disabled="!timelineRef?.selectedTrackId"
        >
          Keyframe ►►
        </button>
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
        <button
          @click="handleDeleteSelected"
          class="delete-btn"
          :disabled="!timelineRef?.selectedTrackId"
        >
          Delete
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

      <div v-if="mode === 'brush'" class="control-group">
        <label>Color:</label>
        <input
          type="color"
          v-model="brushColor"
          class="color-picker"
          @change="handleBrushColorChange"
        />
      </div>

      <div v-if="mode === 'bbox'" class="control-group">
        <label>Color:</label>
        <input type="color" v-model="bboxColor" class="color-picker" />
      </div>

      <div v-if="mode === 'polygon'" class="control-group">
        <label>Color:</label>
        <input type="color" v-model="polygonColor" class="color-picker" />
      </div>

      <div v-if="mode === 'skeleton'" class="control-group">
        <label>Color:</label>
        <input type="color" v-model="skeletonColor" class="color-picker" />
      </div>

      <div class="control-group">
        <label>Zoom: {{ Math.round(zoomLevel * 100) }}%</label>
        <button @click="zoomIn">+</button>
        <button @click="zoomOut">-</button>
        <button @click="resetZoom">Reset</button>
      </div>

      <div class="control-group">
        <button
          @click="handleClearCache"
          class="clear-cache-btn"
          :disabled="isClearingCache"
        >
          {{ isClearingCache ? "Clearing..." : "Clear Cache" }}
        </button>
      </div>

      <div class="control-group">
        <label class="auto-suggest-toggle">
          <input type="checkbox" v-model="autoSuggest" />
          <span>Auto Suggest {{ autoSuggest ? "ON" : "OFF" }}</span>
        </label>
      </div>
    </div>

    <FramePlayerTimeline
      ref="timelineRef"
      :current-frame="currentFrame"
      :total-frames="physicalFrames"
      :fps="30"
      :bbox-tracks="bboxTracks"
      :polygon-tracks="polygonTracks"
      :skeleton-tracks="skeletonTracks"
      :brush-tracks="brushTracks"
      @jump-to-frame="jumpToFrame"
      @select-track="handleSelectTrack"
      @toggle-interpolation="handleToggleInterpolation"
      @add-keyframe="handleAddKeyframe"
      @update-range="handleUpdateRange"
    />

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
                    timelineRef?.selectedTrackId === polygon.id
                      ? '#fff'
                      : polygon.color,
                  strokeWidth:
                    timelineRef?.selectedTrackId === polygon.id ? 2 : 1,
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
                    timelineRef?.selectedTrackId === skeleton.id
                      ? '#fff'
                      : skeleton.color,
                  strokeWidth:
                    timelineRef?.selectedTrackId === skeleton.id ? 2 : 1,
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import Konva from "konva";
import { KonvaBrush } from "./KonvaBrush";
import { useFramesStore } from "../../stores/framesStore";
import { useBoundingBoxTracks } from "../../composables/useBoundingBoxTracks";
import { usePolygonTracks } from "../../composables/usePolygonTracks";
import { useSkeletonTracks } from "../../composables/useSkeletonTracks";
import { useBrushTracks } from "../../composables/useBrushTracks";
import { BBoxTool } from "../../utils/bboxUtils";
import { PolygonTool } from "../../utils/polygonUtils";
import { SkeletonTool } from "../../utils/skeletonUtils";
import { getSegmentationImageContoursForSaving } from "../../utils/opencv-contours";
import type { BoundingBox } from "../../types/boundingBox";
import type { Polygon } from "../../types/polygon";
import type { Skeleton } from "../../types/skeleton";
import type { ToolClass } from "../../types/contours";
import FramePlayerTimeline from "./FramePlayerTimeline.vue";

type TrackType = "bbox" | "polygon" | "skeleton" | "brush";

const router = useRouter();
const framesStore = useFramesStore();

const stageRef = ref<any>(null);
const backgroundLayerRef = ref<any>(null);
const annotationLayerRef = ref<any>(null);
const bboxLayerRef = ref<any>(null);
const polygonLayerRef = ref<any>(null);
const skeletonLayerRef = ref<any>(null);
const brushLayerRef = ref<any>(null);
const cursorLayerRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const timelineRef = ref<InstanceType<typeof FramePlayerTimeline> | null>(null);

const framesLoaded = ref(false);
const currentFrame = ref(0);
const currentImage = ref<HTMLImageElement | null>(null);
const brush = ref<KonvaBrush | null>(null);

const mode = ref<
  "brush" | "eraser" | "pan" | "bbox" | "select" | "polygon" | "skeleton"
>("brush");
const brushSize = ref(20);
const brushColor = ref("#FF0000");
const bboxColor = ref("#FF0000");
const polygonColor = ref("#00FF00");
const skeletonColor = ref("#0000FF");
const opacity = ref(1);
const zoomLevel = ref(1);
const autoSuggest = ref(false);

const isDrawing = ref(false);
const isPanning = ref(false);
const isPlaying = ref(false);
const isClearingCache = ref(false);
const cursorShape = ref<Konva.Circle | null>(null);

const lastPanPoint = ref<{ x: number; y: number } | null>(null);

const frameImages = ref<Map<number, HTMLImageElement>>(new Map());
const frameCanvases = ref<Map<number, HTMLCanvasElement>>(new Map());

const {
  tracks: bboxTracks,
  selectedTrackId: selectedBboxTrackId,
  createTrack: createBboxTrack,
  getBoxAtFrame,
  updateKeyframe: updateBboxKeyframe,
  toggleInterpolation: toggleBboxInterpolation,
  deleteTrack: deleteBboxTrack,
  jumpToNextKeyframe: jumpToNextBboxKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousBboxKeyframe,
} = useBoundingBoxTracks(currentFrame);

const {
  tracks: polygonTracks,
  selectedTrackId: selectedPolygonTrackId,
  createTrack: createPolygonTrack,
  getPolygonAtFrame,
  updateKeyframe: updatePolygonKeyframe,
  toggleInterpolation: togglePolygonInterpolation,
  deleteTrack: deletePolygonTrack,
  jumpToNextKeyframe: jumpToNextPolygonKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousPolygonKeyframe,
} = usePolygonTracks(currentFrame);

const {
  tracks: skeletonTracks,
  selectedTrackId: selectedSkeletonTrackId,
  createTrack: createSkeletonTrack,
  getSkeletonAtFrame,
  updateKeyframe: updateSkeletonKeyframe,
  toggleInterpolation: toggleSkeletonInterpolation,
  deleteTrack: deleteSkeletonTrack,
  jumpToNextKeyframe: jumpToNextSkeletonKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousSkeletonKeyframe,
} = useSkeletonTracks(currentFrame);

const {
  tracks: brushTracks,
  selectedTrackId: selectedBrushTrackId,
  createTrack: createBrushTrack,
  addKeyframe: addBrushKeyframe,
  getContoursAtFrame,
  toggleInterpolation: toggleBrushInterpolation,
  deleteTrack: deleteBrushTrack,
  jumpToNextKeyframe: jumpToNextBrushKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousBrushKeyframe,
} = useBrushTracks(currentFrame);

const brushClasses = computed(() => {
  const classes: ToolClass[] = [];
  const usedColors = new Set<string>();

  for (const [, track] of brushTracks.value) {
    for (const [, contours] of track.keyframes) {
      for (const contour of contours) {
        if (!usedColors.has(contour.classColor)) {
          usedColors.add(contour.classColor);
          classes.push({
            value: contour.classID - 1,
            name: contour.className,
            color: contour.classColor,
          });
        }
      }
    }
  }

  if (!usedColors.has(brushColor.value)) {
    classes.push({
      value: classes.length,
      name: "Brush",
      color: brushColor.value,
    });
  }

  return classes;
});

let bboxTool: BBoxTool | null = null;
let polygonTool: PolygonTool | null = null;
let skeletonTool: SkeletonTool | null = null;

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 800;

let animationId: number | null = null;
let lastFrameTime = 0;

const stageConfig = ref({
  width: 800,
  height: 600,
});

const frames = computed(() => framesStore.allFrames.map((f) => f.imageUrl));
const physicalFrames = computed(() => framesStore.totalFrames);

const imageConfig = computed(() => ({
  image: currentImage.value,
  width: stageConfig.value.width,
  height: stageConfig.value.height,
}));

const currentFrameBboxes = computed(() => {
  const result: BoundingBox[] = [];
  for (const [trackId] of bboxTracks.value) {
    const box = getBoxAtFrame(trackId, currentFrame.value);
    if (box) {
      result.push(box);
    }
  }
  return result;
});

const currentFramePolygons = computed(() => {
  const result: Polygon[] = [];
  for (const [trackId] of polygonTracks.value) {
    const polygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (polygon) {
      result.push(polygon);
    }
  }
  return result;
});

const currentFrameSkeletons = computed(() => {
  const result: Skeleton[] = [];
  for (const [trackId] of skeletonTracks.value) {
    const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (skeleton) {
      result.push(skeleton);
    }
  }
  return result;
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
  if (frameIndex < 0 || frameIndex >= physicalFrames.value) return;

  let img = frameImages.value.get(frameIndex);

  if (!img) {
    img = await loadImage(frames.value[frameIndex]!);
    frameImages.value.set(frameIndex, img);
  }

  currentImage.value = img;
  currentFrame.value = frameIndex;

  const existingCanvas = frameCanvases.value.get(frameIndex);
  if (existingCanvas) {
    updateAnnotationLayer(existingCanvas);
  } else {
    let brushCanvas: HTMLCanvasElement | null = null;

    for (const [trackId] of brushTracks.value) {
      const result = await getContoursAtFrame(
        trackId,
        frameIndex,
        brushClasses.value,
        stageConfig.value.width,
        stageConfig.value.height,
        1
      );

      if (result.canvas && result.contours.length > 0) {
        brushCanvas = result.canvas;
        break;
      }
    }

    if (brushCanvas) {
      updateAnnotationLayer(brushCanvas);
    } else {
      const annotationLayer = annotationLayerRef.value?.getNode();
      if (annotationLayer) {
        annotationLayer.destroyChildren();
        annotationLayer.batchDraw();
      }
    }
  }
};

const animate = async (timestamp: number) => {
  if (!isPlaying.value) return;

  const frameInterval = 1000 / 30;
  const elapsed = timestamp - lastFrameTime;

  if (elapsed >= frameInterval) {
    let nextFrameIndex = currentFrame.value + 1;
    if (nextFrameIndex >= physicalFrames.value) {
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
  const next = currentFrame.value + 1;
  if (next >= physicalFrames.value) {
    await renderFrame(0);
  } else {
    await renderFrame(next);
  }
};

const previousFrame = async () => {
  const prev = currentFrame.value - 1;
  if (prev < 0) {
    await renderFrame(physicalFrames.value - 1);
  } else {
    await renderFrame(prev);
  }
};

const jumpToFrame = async (frame: number) => {
  await renderFrame(Math.max(0, Math.min(frame, physicalFrames.value - 1)));
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

  if (newMode !== "polygon" && polygonTool?.isDrawingActive()) {
    cancelPolygonDrawing();
  }

  if (newMode !== "skeleton" && skeletonTool?.isDrawingActive()) {
    cancelSkeletonDrawing();
  }
};

const handleSizeChange = () => {
  if (brush.value) {
    brush.value.changeSize(brushSize.value);
  }
};

const handleBrushColorChange = () => {
  if (brush.value) {
    brush.value.changeColor(brushColor.value);
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
  bboxTool = new BBoxTool(layer);
  bboxTool.setupTransformer();
};

const updateTransformerSelection = () => {
  if (!bboxTool) return;
  bboxTool.updateTransformerSelection(selectedBboxTrackId.value);
};

const startBboxDrawing = (pos: { x: number; y: number }) => {
  if (!bboxTool) return;
  bboxTool.startDrawing(pos, bboxColor.value);
};

const updateBboxPreview = (pos: { x: number; y: number }) => {
  if (!bboxTool) return;
  bboxTool.updatePreview(pos);
};

const finishBboxDrawing = () => {
  if (!bboxTool) return;

  const bbox = bboxTool.finishDrawing(bboxColor.value);
  if (!bbox) return;

  const trackId = createBboxTrack(
    currentFrame.value,
    bbox,
    undefined,
    physicalFrames.value
  );
  selectedBboxTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, "bbox");
};

const handleBboxClick = (e: any) => {
  if (mode.value !== "select") return;

  const group = e.target.findAncestor("Group");
  if (group) {
    const trackId = group.id();
    selectedBboxTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, "bbox");
    updateTransformerSelection();
  }
};

const handleBboxDragEnd = (e: any) => {
  const group = e.target.findAncestor("Group");
  if (!group) return;

  const trackId = group.id();
  const track = bboxTracks.value.get(trackId);
  if (!track) return;

  const currentBox = getBoxAtFrame(trackId, currentFrame.value);
  if (!currentBox) return;

  const rect = group.findOne("Rect");

  const updatedBox: BoundingBox = {
    ...currentBox,
    x: group.x(),
    y: group.y(),
    width: rect ? rect.width() * rect.scaleX() : currentBox.width,
    height: rect ? rect.height() * rect.scaleY() : currentBox.height,
    rotation: group.rotation(),
  };

  if (rect) {
    rect.scaleX(1);
    rect.scaleY(1);
  }
  group.scaleX(1);
  group.scaleY(1);

  updateBboxKeyframe(trackId, currentFrame.value, updatedBox, autoSuggest.value);

  nextTick(() => {
    updateTransformerSelection();
  });
};

const handleBboxTransformEnd = () => {
  if (!bboxTool || !selectedBboxTrackId.value) return;

  const currentBox = getBoxAtFrame(
    selectedBboxTrackId.value,
    currentFrame.value
  );
  if (!currentBox) return;

  const layer = bboxLayerRef.value?.getNode();
  if (!layer) return;

  const group = layer.findOne(`#${selectedBboxTrackId.value}`);
  if (!group) return;

  const rect = group.findOne("Rect");
  if (!rect) return;

  const groupScaleX = group.scaleX();
  const groupScaleY = group.scaleY();
  const rectScaleX = rect.scaleX();
  const rectScaleY = rect.scaleY();

  const updatedBox: BoundingBox = {
    ...currentBox,
    x: group.x(),
    y: group.y(),
    width: rect.width() * rectScaleX * groupScaleX,
    height: rect.height() * rectScaleY * groupScaleY,
    rotation: group.rotation(),
  };

  rect.scaleX(1);
  rect.scaleY(1);
  group.scaleX(1);
  group.scaleY(1);

  updateBboxKeyframe(selectedBboxTrackId.value, currentFrame.value, updatedBox, autoSuggest.value);

  nextTick(() => {
    updateTransformerSelection();
  });
};

const setupPolygonTool = () => {
  if (!polygonLayerRef.value) return;
  const layer = polygonLayerRef.value.getNode();
  polygonTool = new PolygonTool(layer);
};

const startPolygonDrawing = (pos: { x: number; y: number }) => {
  if (!polygonTool) return;
  polygonTool.startDrawing(pos, polygonColor.value);
};

const addPolygonPoint = (pos: { x: number; y: number }) => {
  if (!polygonTool) return;
  const shouldComplete = polygonTool.addPoint(pos, polygonColor.value);
  if (shouldComplete) {
    completePolygonDrawing();
  }
};

const updatePolygonPreview = () => {
  if (!polygonTool) return;
  polygonTool.updatePreview();
};

const updatePolygonPreviewWithMouse = (pos: { x: number; y: number }) => {
  if (!polygonTool) return;
  polygonTool.updatePreviewWithMouse(pos);
};

const completePolygonDrawing = () => {
  if (!polygonTool) return;

  const polygon = polygonTool.completeDrawing(polygonColor.value);
  if (!polygon) return;

  const trackId = createPolygonTrack(
    currentFrame.value,
    polygon,
    undefined,
    physicalFrames.value
  );
  selectedPolygonTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, "polygon");
};

const cancelPolygonDrawing = () => {
  if (!polygonTool) return;
  polygonTool.cancelDrawing();
};

const handlePolygonClick = (e: any) => {
  if (mode.value !== "select") return;

  const line = e.target;
  if (line && line.id()) {
    const trackId = line.id();
    selectedPolygonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    timelineRef.value?.selectTrack(trackId, "polygon");
  }
};

const handlePolygonDragEnd = (e: any) => {
  const line = e.target;
  if (!line) return;

  const trackId = line.id();
  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const dx = line.x();
  const dy = line.y();
  const scaleX = line.scaleX();
  const scaleY = line.scaleY();

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: currentPolygon.points.map((p) => ({
      x: p.x * scaleX + dx,
      y: p.y * scaleY + dy,
    })),
  };

  line.x(0);
  line.y(0);
  line.scaleX(1);
  line.scaleY(1);

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon, autoSuggest.value);

  const layer = polygonLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const handlePolygonVertexClick = (polygonId: string) => {
  if (mode.value !== "select") return;
  selectedPolygonTrackId.value = polygonId;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  timelineRef.value?.selectTrack(polygonId, "polygon");
};

const handlePolygonVertexDragMove = (
  e: any,
  polygonId: string,
  pointIdx: number
) => {
  const currentPolygon = getPolygonAtFrame(polygonId, currentFrame.value);
  if (!currentPolygon) return;

  const circle = e.target;
  const newPoints = [...currentPolygon.points];
  newPoints[pointIdx] = { x: circle.x(), y: circle.y() };

  const layer = polygonLayerRef.value?.getNode();
  if (layer) {
    const line = layer.findOne(`#${polygonId}`);
    if (line) {
      line.points(newPoints.flatMap((p) => [p.x, p.y]));
      layer.batchDraw();
    }
  }
};

const handlePolygonVertexDragEnd = (
  e: any,
  polygonId: string,
  pointIdx: number
) => {
  const currentPolygon = getPolygonAtFrame(polygonId, currentFrame.value);
  if (!currentPolygon) return;

  const circle = e.target;
  const newPoints = [...currentPolygon.points];
  newPoints[pointIdx] = { x: circle.x(), y: circle.y() };

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: newPoints,
  };

  updatePolygonKeyframe(polygonId, currentFrame.value, updatedPolygon, autoSuggest.value);

  const layer = polygonLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const setupSkeletonTool = () => {
  if (!skeletonLayerRef.value) return;
  const layer = skeletonLayerRef.value.getNode();
  skeletonTool = new SkeletonTool(layer);
};

const startSkeletonDrawing = (pos: { x: number; y: number }) => {
  if (!skeletonTool) return;
  skeletonTool.startDrawing(pos, skeletonColor.value);
};

const addSkeletonPoint = (pos: { x: number; y: number }) => {
  if (!skeletonTool) return;
  skeletonTool.addPoint(pos, skeletonColor.value);
};

const updateSkeletonPreviewWithMouse = (pos: { x: number; y: number }) => {
  if (!skeletonTool) return;
  skeletonTool.updatePreviewWithMouse(pos);
};

const completeSkeletonDrawing = () => {
  if (!skeletonTool) return;

  const skeleton = skeletonTool.completeDrawing(skeletonColor.value);
  if (!skeleton) return;

  const trackId = createSkeletonTrack(
    currentFrame.value,
    skeleton,
    undefined,
    physicalFrames.value
  );
  selectedSkeletonTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, "skeleton");
};

const cancelSkeletonDrawing = () => {
  if (!skeletonTool) return;
  skeletonTool.cancelDrawing();
};

const handleSkeletonClick = (e: any) => {
  if (mode.value !== "select") return;

  const line = e.target;
  if (line && line.id()) {
    const trackId = line.id();
    selectedSkeletonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    timelineRef.value?.selectTrack(trackId, "skeleton");
  }
};

const handleSkeletonDragEnd = (e: any) => {
  const line = e.target;
  if (!line) return;

  const trackId = line.id();
  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const dx = line.x();
  const dy = line.y();
  const scaleX = line.scaleX();
  const scaleY = line.scaleY();

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: currentSkeleton.points.map((p) => ({
      x: p.x * scaleX + dx,
      y: p.y * scaleY + dy,
    })),
  };

  line.x(0);
  line.y(0);
  line.scaleX(1);
  line.scaleY(1);

  updateSkeletonKeyframe(trackId, currentFrame.value, updatedSkeleton, autoSuggest.value);

  const layer = skeletonLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const handleSkeletonKeypointClick = (skeletonId: string) => {
  if (mode.value !== "select") return;
  selectedSkeletonTrackId.value = skeletonId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  timelineRef.value?.selectTrack(skeletonId, "skeleton");
};

const handleSkeletonKeypointDragMove = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const currentSkeleton = getSkeletonAtFrame(skeletonId, currentFrame.value);
  if (!currentSkeleton) return;

  const circle = e.target;
  const newPoints = [...currentSkeleton.points];
  newPoints[pointIdx] = { x: circle.x(), y: circle.y() };

  const layer = skeletonLayerRef.value?.getNode();
  if (layer) {
    const line = layer.findOne(`#${skeletonId}`);
    if (line) {
      line.points(newPoints.flatMap((p) => [p.x, p.y]));
      layer.batchDraw();
    }
  }
};

const handleSkeletonKeypointDragEnd = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const currentSkeleton = getSkeletonAtFrame(skeletonId, currentFrame.value);
  if (!currentSkeleton) return;

  const circle = e.target;
  const newPoints = [...currentSkeleton.points];
  newPoints[pointIdx] = { x: circle.x(), y: circle.y() };

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: newPoints,
  };

  updateSkeletonKeyframe(skeletonId, currentFrame.value, updatedSkeleton, autoSuggest.value);

  const layer = skeletonLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
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

    if (!polygonTool?.isDrawingActive()) {
      startPolygonDrawing(logicalPos);
    } else {
      addPolygonPoint(logicalPos);
    }
    return;
  }

  if (mode.value === "skeleton") {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    if (!skeletonTool?.isDrawingActive()) {
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
      selectedBboxTrackId.value = null;
      selectedPolygonTrackId.value = null;
      selectedSkeletonTrackId.value = null;
      timelineRef.value?.clearSelection();
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

  if (mode.value === "polygon" && polygonTool?.isDrawingActive()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updatePolygonPreviewWithMouse(logicalPos);
    return;
  }

  if (mode.value === "skeleton" && skeletonTool?.isDrawingActive()) {
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

const handleMouseUp = async () => {
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

    for (const [trackId] of brushTracks.value) {
      const result = await getContoursAtFrame(
        trackId,
        currentFrame.value,
        brushClasses.value,
        stageConfig.value.width,
        stageConfig.value.height,
        1
      );

      if (result.canvas && result.contours.length > 0) {
        const ctx = offscreenCanvas.getContext("2d")!;
        ctx.drawImage(result.canvas, 0, 0);
        break;
      }
    }

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

  if (mode.value === "brush") {
    try {
      const contours = await getSegmentationImageContoursForSaving(
        offscreenCanvas,
        1,
        brushClasses.value
      );

      if (contours.length > 0) {
        if (selectedBrushTrackId.value) {
          addBrushKeyframe(selectedBrushTrackId.value, currentFrame.value, contours, autoSuggest.value);
        } else {
          const trackId = createBrushTrack(
            currentFrame.value,
            contours,
            undefined,
            physicalFrames.value
          );
          selectedBrushTrackId.value = trackId;
          timelineRef.value?.selectTrack(trackId, "brush");
        }
      }
    } catch (err) {
      console.error("Failed to extract contours:", err);
    }
  }
};

const handleMouseLeave = () => {
  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    cursorLayerRef.value?.getNode().batchDraw();
  }

  if (mode.value === "polygon" && polygonTool?.isDrawingActive()) {
    updatePolygonPreview();
    return;
  }

  if (mode.value === "bbox" && isDrawing.value) {
    if (bboxTool) {
      bboxTool.cancelDrawing();
    }
    isDrawing.value = false;
    return;
  }

  handleMouseUp();
};

const handleDoubleClick = () => {
  if (mode.value === "polygon" && polygonTool?.isDrawingActive()) {
    const currentPoints = polygonTool.getCurrentPoints();
    if (currentPoints.length >= 3) {
      completePolygonDrawing();
    }
  }
  if (mode.value === "skeleton" && skeletonTool?.isDrawingActive()) {
    const currentPoints = skeletonTool.getCurrentPoints();
    if (currentPoints.length >= 2) {
      completeSkeletonDrawing();
    }
  }
};

const handleSelectTrack = (trackId: string, type: TrackType) => {
  if (type === "bbox") {
    selectedBboxTrackId.value = trackId;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    updateTransformerSelection();
  } else if (type === "polygon") {
    selectedPolygonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedSkeletonTrackId.value = null;
  } else if (type === "skeleton") {
    selectedSkeletonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
  } else if (type === "brush") {
    selectedBrushTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
  }
};

const handleToggleInterpolation = (trackId: string, type: TrackType) => {
  if (type === "bbox") {
    toggleBboxInterpolation(trackId);
  } else if (type === "polygon") {
    togglePolygonInterpolation(trackId);
  } else if (type === "skeleton") {
    toggleSkeletonInterpolation(trackId);
  } else if (type === "brush") {
    toggleBrushInterpolation(trackId);
  }
};

const handleAddKeyframe = (trackId: string, type: TrackType) => {
  if (type === "bbox") {
    const currentBox = getBoxAtFrame(trackId, currentFrame.value);
    if (currentBox) {
      updateBboxKeyframe(trackId, currentFrame.value, currentBox, autoSuggest.value);
    }
  } else if (type === "polygon") {
    const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (currentPolygon) {
      updatePolygonKeyframe(trackId, currentFrame.value, currentPolygon, autoSuggest.value);
    }
  } else if (type === "skeleton") {
    const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (currentSkeleton) {
      updateSkeletonKeyframe(trackId, currentFrame.value, currentSkeleton, autoSuggest.value);
    }
  }
};

const handleUpdateRange = (
  trackId: string,
  type: TrackType,
  rangeIndex: number,
  start: number,
  end: number
) => {
  let track;
  if (type === "bbox") {
    track = bboxTracks.value.get(trackId);
  } else if (type === "polygon") {
    track = polygonTracks.value.get(trackId);
  } else if (type === "skeleton") {
    track = skeletonTracks.value.get(trackId);
  } else if (type === "brush") {
    track = brushTracks.value.get(trackId);
  }

  if (track && track.ranges[rangeIndex]) {
    track.ranges[rangeIndex] = [start, end];
  }
};

const handleDeleteSelected = () => {
  const trackId = timelineRef.value?.selectedTrackId;
  const trackType = timelineRef.value?.selectedTrackType;

  if (!trackId || !trackType) return;

  if (trackType === "bbox") {
    deleteBboxTrack(trackId);
    selectedBboxTrackId.value = null;
  } else if (trackType === "polygon") {
    deletePolygonTrack(trackId);
    selectedPolygonTrackId.value = null;
  } else if (trackType === "skeleton") {
    deleteSkeletonTrack(trackId);
    selectedSkeletonTrackId.value = null;
  } else if (trackType === "brush") {
    deleteBrushTrack(trackId);
    selectedBrushTrackId.value = null;
  }

  timelineRef.value?.clearSelection();
  updateTransformerSelection();
};

const handleJumpToNextKeyframe = () => {
  const trackType = timelineRef.value?.selectedTrackType;

  if (trackType === "bbox") {
    jumpToNextBboxKeyframe(jumpToFrame);
  } else if (trackType === "polygon") {
    jumpToNextPolygonKeyframe(jumpToFrame);
  } else if (trackType === "skeleton") {
    jumpToNextSkeletonKeyframe(jumpToFrame);
  } else if (trackType === "brush") {
    jumpToNextBrushKeyframe(jumpToFrame);
  }
};

const handleJumpToPreviousKeyframe = () => {
  const trackType = timelineRef.value?.selectedTrackType;

  if (trackType === "bbox") {
    jumpToPreviousBboxKeyframe(jumpToFrame);
  } else if (trackType === "polygon") {
    jumpToPreviousPolygonKeyframe(jumpToFrame);
  } else if (trackType === "skeleton") {
    jumpToPreviousSkeletonKeyframe(jumpToFrame);
  } else if (trackType === "brush") {
    jumpToPreviousBrushKeyframe(jumpToFrame);
  }
};

const handleClearCache = async () => {
  isClearingCache.value = true;
  try {
    await framesStore.clearCache();
    framesStore.clearFrames();
    router.push("/");
  } finally {
    isClearingCache.value = false;
  }
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

const initializePlayer = async () => {
  try {
    const firstImg = await loadImage(frames.value[0]!);
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
    setupPolygonTool();
    setupSkeletonTool();

    for (let i = 1; i < Math.min(30, physicalFrames.value); i++) {
      loadImage(frames.value[i]!).then((img) => frameImages.value.set(i, img));
    }
  } catch (error) {
    console.error("Failed to load first frame:", error);
  }
};

onMounted(async () => {
  if (!framesStore.hasFrames) {
    const hasCached = await framesStore.checkCache();

    if (hasCached) {
      const loaded = await framesStore.loadFromCache();

      if (loaded) {
        await initializePlayer();
        return;
      }
    }

    router.push("/");
    return;
  }

  await initializePlayer();
});

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
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
  updateTransformerSelection();

  if (polygonTool?.isDrawingActive()) {
    cancelPolygonDrawing();
  }

  if (skeletonTool?.isDrawingActive()) {
    cancelSkeletonDrawing();
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

.control-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.keyframe-nav-btn {
  padding: 6px 12px !important;
  font-size: 12px;
}

.delete-btn {
  background: #dc3545 !important;
  color: white !important;
  border-color: #dc3545 !important;
}

.delete-btn:hover:not(:disabled) {
  background: #c82333 !important;
}

.clear-cache-btn {
  background: #6b7280 !important;
  color: white !important;
  border-color: #6b7280 !important;
}

.clear-cache-btn:hover:not(:disabled) {
  background: #4b5563 !important;
}

.auto-suggest-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  background: #e9ecef;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s;
}

.auto-suggest-toggle:hover {
  background: #dee2e6;
}

.auto-suggest-toggle input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.auto-suggest-toggle input:checked + span {
  color: #28a745;
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
