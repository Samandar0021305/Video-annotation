<template>
  <div class="frame-player">
    <div class="main-content">
      <!-- Vertical Toolbar -->
      <div class="vertical-toolbar">
        <div class="toolbar-section">
          <div class="toolbar-title">Tools</div>
          <button
            :class="['tool-btn', { active: mode === 'pan' }]"
            @click="setMode('pan')"
            title="Pan"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"
              />
            </svg>
            <span>Pan</span>
          </button>
          <button
            :class="['tool-btn', { active: mode === 'brush' }]"
            @click="setMode('brush')"
            title="Brush"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"
              />
            </svg>
            <span>Brush</span>
          </button>
          <button
            :class="['tool-btn', { active: mode === 'eraser' }]"
            @click="setMode('eraser')"
            title="Eraser"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 01-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z"
              />
            </svg>
            <span>Eraser</span>
          </button>
          <button
            :class="['tool-btn', { active: mode === 'bbox' }]"
            @click="setMode('bbox')"
            title="Bounding Box"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
              />
            </svg>
            <span>BBox</span>
          </button>
          <button
            :class="['tool-btn', { active: mode === 'polygon' }]"
            @click="setMode('polygon')"
            title="Polygon"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M17.63 5.84C17.27 5.33 16.67 5 16 5H8c-.67 0-1.27.33-1.63.84L2 12l4.37 6.16c.36.51.96.84 1.63.84h8c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"
              />
            </svg>
            <span>Polygon</span>
          </button>
          <button
            :class="['tool-btn', { active: mode === 'skeleton' }]"
            @click="setMode('skeleton')"
            title="Skeleton"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
              />
            </svg>
            <span>Skeleton</span>
          </button>
          <button
            @click="handleDeleteSelected"
            class="tool-btn delete-btn"
            :disabled="!timelineRef?.selectedTrackId"
            title="Delete Selected"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
            <span>Delete</span>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div
          v-if="mode === 'brush' || mode === 'eraser'"
          class="toolbar-section"
        >
          <div class="toolbar-title">Size</div>
          <div class="size-control">
            <input
              type="range"
              min="5"
              max="100"
              v-model.number="brushSize"
              @input="handleSizeChange"
              class="vertical-slider"
            />
            <span class="size-value">{{ brushSize }}px</span>
          </div>
        </div>

        <!-- Color Picker -->
        <div v-if="mode === 'brush'" class="toolbar-section">
          <div class="toolbar-title">Color</div>
          <input
            type="color"
            v-model="brushColor"
            class="color-picker"
            @change="handleBrushColorChange"
          />
        </div>
        <div v-if="mode === 'bbox'" class="toolbar-section">
          <div class="toolbar-title">Color</div>
          <input type="color" v-model="bboxColor" class="color-picker" />
        </div>
        <div v-if="mode === 'polygon'" class="toolbar-section">
          <div class="toolbar-title">Color</div>
          <input type="color" v-model="polygonColor" class="color-picker" />
        </div>
        <div v-if="mode === 'skeleton'" class="toolbar-section">
          <div class="toolbar-title">Color</div>
          <input type="color" v-model="skeletonColor" class="color-picker" />
        </div>

        <div class="toolbar-divider"></div>

        <!-- Opacity -->
        <div class="toolbar-section">
          <div class="toolbar-title">Opacity</div>
          <div class="opacity-control">
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              v-model.number="opacity"
              @input="handleOpacityChange"
              class="vertical-slider"
            />
            <span class="opacity-value">{{ Math.round(opacity * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- Canvas Container -->
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
              ref="annotationsLayerRef"
              :config="{ imageSmoothingEnabled: false }"
            >
              <v-group ref="brushAnnotationGroupRef"></v-group>

              <v-group ref="bboxGroupRef">
                <v-group
                  v-for="bbox in currentFrameBboxes"
                  :key="bbox.id"
                  :config="{
                    id: bbox.id,
                    x: bbox.x,
                    y: bbox.y,
                    rotation: bbox.rotation,
                    draggable: mode === 'pan',
                    name: 'boundingBox',
                    opacity: opacity,
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
              </v-group>

              <v-group ref="polygonGroupRef">
                <template
                  v-for="polygon in currentFramePolygons"
                  :key="polygon.id"
                >
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
                      draggable: canEditPolygon,
                      name: 'polygon',
                      opacity: opacity,
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
                      draggable: canEditPolygon,
                      name: 'polygonVertex',
                      opacity: opacity,
                    }"
                    @dragmove="(e: any) => handlePolygonVertexDragMove(e, polygon.id, pointIdx)"
                    @dragend="(e: any) => handlePolygonVertexDragEnd(e, polygon.id, pointIdx)"
                    @click="() => handlePolygonVertexClick(polygon.id)"
                  />
                </template>
              </v-group>

              <v-group ref="skeletonGroupRef">
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
                      draggable: canEditSkeleton,
                      name: 'skeleton',
                      opacity: opacity,
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
                      draggable: canEditSkeleton,
                      name: 'skeletonKeypoint',
                      opacity: opacity,
                    }"
                    @dragstart="(e: any) => handleSkeletonKeypointDragStart(e, skeleton.id, pointIdx)"
                    @dragmove="(e: any) => handleSkeletonKeypointDragMove(e, skeleton.id, pointIdx)"
                    @dragend="(e: any) => handleSkeletonKeypointDragEnd(e, skeleton.id, pointIdx)"
                    @click="() => handleSkeletonKeypointClick(skeleton.id)"
                  />
                </template>
              </v-group>
            </v-layer>

            <v-layer ref="interactiveLayerRef">
              <v-group
                ref="brushPreviewGroupRef"
                :config="{ imageSmoothingEnabled: false }"
              ></v-group>
              <v-group ref="cursorGroupRef"></v-group>
            </v-layer>
          </v-stage>
        </div>
        <div v-else class="loading">Loading frames...</div>

        <SegmentationToolbar
          :visible="showSegmentationToolbar"
          :position="selectedSegmentationPosition"
          :edit-mode="segmentationEditMode"
          :color="selectedSegmentationColor"
          :stage-offset="stageOffset"
          :stage-scale="zoomLevel"
          @set-mode="handleSegmentationEditMode"
          @change-color="handleSegmentationColorChange"
          @deselect="handleDeselectSegmentation"
        />
      </div>

      <!-- Right Side Panel for BrushMergePopup -->
      <div
        class="right-panel"
        :class="{ visible: showBrushMergePopup }"
        @mousedown.stop
        @click.stop
      >
        <BrushMergePopup
          v-if="showBrushMergePopup"
          :stroke-count="
            tempStrokesConvertedToCanvas ? 1 : tempBrushStrokes.length
          "
          :color="mergeColor"
          :edit-mode="tempStrokesEditMode"
          @update:color="handleTempStrokesColorChange"
          @merge="handleMergeStrokes"
          @clear="handleClearStrokes"
          @set-edit-mode="handleTempStrokesEditModeChange"
        />
      </div>
    </div>

    <div class="playback-controls">
      <button @click="previousFrame" class="playback-btn">⏮ Previous</button>
      <button @click="togglePlay" class="playback-btn play-btn">
        {{ isPlaying ? "⏸ Pause" : "▶ Play" }}
      </button>
      <button @click="nextFrame" class="playback-btn">Next ⏭</button>
      <span class="frame-info"
        >Frame: {{ currentFrame + 1 }} / {{ physicalFrames }}</span
      >

      <div class="playback-divider"></div>

      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <span class="zoom-label">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="zoomIn" class="utility-btn" title="Zoom In">+</button>
        <button @click="zoomOut" class="utility-btn" title="Zoom Out">-</button>
        <button @click="resetZoom" class="utility-btn" title="Reset Zoom">
          Reset
        </button>
      </div>

      <div class="playback-divider"></div>

      <!-- Utility Controls -->
      <button
        @click="handleClearCache"
        class="utility-btn clear-cache-btn"
        :disabled="isClearingCache"
        title="Clear Cache"
      >
        {{ isClearingCache ? "Clearing..." : "Clear Cache" }}
      </button>

      <label class="auto-suggest-toggle" title="Auto Suggest">
        <input type="checkbox" v-model="autoSuggest" />
        <span>Auto {{ autoSuggest ? "ON" : "OFF" }}</span>
      </label>
    </div>

    <!-- Timeline Scrubber -->
    <div class="timeline-scrubber-container">
      <input
        type="range"
        class="timeline-scrubber"
        :min="0"
        :max="physicalFrames - 1"
        :value="currentFrame"
        @input="handleScrubberInput"
      />
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
      @resize-end="handleRangeResizeEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import Konva from "konva";
import { KonvaBrush } from "./KonvaBrush";
import { useFramesStore } from "../../stores/framesStore";
import { useAnnotationStore } from "../../stores/annotationStore";
import { useBoundingBoxTracks } from "../../composables/useBoundingBoxTracks";
import { usePolygonTracks } from "../../composables/usePolygonTracks";
import { useSkeletonTracks } from "../../composables/useSkeletonTracks";
import { useBrushTracks } from "../../composables/useBrushTracks";
import { BBoxTool } from "../../utils/bboxUtils";
import { PolygonTool } from "../../utils/polygonUtils";
import { SkeletonTool } from "../../utils/skeletonUtils";
import {
  getSegmentationImageContoursForSaving,
  renderContoursToTargetCanvas,
} from "../../utils/opencv-contours";
import {
  canvasToMaskData,
  renderMaskToCanvas,
  renderMasksToCanvas,
} from "../../utils/rle";
import type { MaskData } from "../../types/mask";
import { isMaskData } from "../../composables/useBrushTracks";
import type { BoundingBox } from "../../types/boundingBox";
import type { Polygon } from "../../types/polygon";
import type { Skeleton } from "../../types/skeleton";
import type { ToolClass } from "../../types/contours";
import FramePlayerTimeline from "./FramePlayerTimeline.vue";
import BrushMergePopup from "./BrushMergePopup.vue";
import SegmentationToolbar from "./SegmentationToolbar.vue";

type TrackType = "bbox" | "polygon" | "skeleton" | "brush";

const router = useRouter();
const framesStore = useFramesStore();
const annotationStore = useAnnotationStore();

const stageRef = ref<any>(null);
const backgroundLayerRef = ref<any>(null);
const annotationsLayerRef = ref<any>(null);
const interactiveLayerRef = ref<any>(null);
const brushAnnotationGroupRef = ref<any>(null);
const bboxGroupRef = ref<any>(null);
const polygonGroupRef = ref<any>(null);
const skeletonGroupRef = ref<any>(null);
const brushPreviewGroupRef = ref<any>(null);
const cursorGroupRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const timelineRef = ref<InstanceType<typeof FramePlayerTimeline> | null>(null);

const framesLoaded = ref(false);
const currentFrame = ref(0);
const currentImage = ref<HTMLImageElement | null>(null);
const brush = ref<KonvaBrush | null>(null);

const mode = ref<"brush" | "eraser" | "pan" | "bbox" | "polygon" | "skeleton">(
  "pan"
);
const brushSize = ref(20);
const brushColor = ref("#FF0000");
const bboxColor = ref("#FF0000");
const polygonColor = ref("#00FF00");
const skeletonColor = ref("#0000FF");
const opacity = ref(0.7);
const zoomLevel = ref(1);
const autoSuggest = ref(false);

const isDrawing = ref(false);
const isPanning = ref(false);
const isPlaying = ref(false);
const isClearingCache = ref(false);
const isSaving = ref(false);
const cursorShape = ref<Konva.Circle | null>(null);
const drawingStartFrame = ref<number | null>(null);

const lastPanPoint = ref<{ x: number; y: number } | null>(null);

// Hover detection throttling (20 FPS to balance responsiveness vs performance)
const HOVER_THROTTLE_MS = 50;
let lastHoverCheckTime = 0;

interface TempBrushStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  frame: number;
}
const tempBrushStrokes = ref<TempBrushStroke[]>([]);
const showBrushMergePopup = ref(false);
const mergeColor = ref("#FF0000");
const bufferFrame = ref<number | null>(null);

// Temp strokes canvas editing state (for eraser in BrushMergePopup)
const tempStrokesCanvas = ref<HTMLCanvasElement | null>(null);
const tempStrokesEditMode = ref<"brush" | "eraser">("brush");
const tempStrokesConvertedToCanvas = ref(false);

const frameImages = ref<Map<number, HTMLImageElement>>(new Map());

// Segmentation selection state
const selectedSegmentationPosition = ref<{ x: number; y: number }>({
  x: 0,
  y: 0,
});
const showSegmentationToolbar = ref(false);
const selectedSegmentationColor = ref("#FF0000");

let workingCanvas: HTMLCanvasElement | null = null;
let displayCanvas: HTMLCanvasElement | null = null;
let currentDisplayFrame = -1;

const initializeCanvases = (width: number, height: number) => {
  workingCanvas = document.createElement("canvas");
  workingCanvas.width = width;
  workingCanvas.height = height;

  displayCanvas = document.createElement("canvas");
  displayCanvas.width = width;
  displayCanvas.height = height;
};

const clearCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const {
  tracks: bboxTracks,
  selectedTrackId: selectedBboxTrackId,
  createTrack: createBboxTrack,
  getBoxAtFrame,
  updateKeyframe: updateBboxKeyframe,
  toggleInterpolation: toggleBboxInterpolation,
  deleteTrack: deleteBboxTrack,
} = useBoundingBoxTracks(currentFrame);

const {
  tracks: polygonTracks,
  selectedTrackId: selectedPolygonTrackId,
  createTrack: createPolygonTrack,
  getPolygonAtFrame,
  updateKeyframe: updatePolygonKeyframe,
  toggleInterpolation: togglePolygonInterpolation,
  deleteTrack: deletePolygonTrack,
} = usePolygonTracks(currentFrame);

const {
  tracks: skeletonTracks,
  selectedTrackId: selectedSkeletonTrackId,
  createTrack: createSkeletonTrack,
  getSkeletonAtFrame,
  updateKeyframe: updateSkeletonKeyframe,
  toggleInterpolation: toggleSkeletonInterpolation,
  deleteTrack: deleteSkeletonTrack,
} = useSkeletonTracks(currentFrame);

const {
  tracks: brushTracks,
  selectedTrackId: selectedBrushTrackId,
  hoveredTrackId: hoveredBrushTrackId,
  segmentationEditMode,
  trackEditStates,
  createTrack: createBrushTrack,
  getContoursAtFrame,
  toggleInterpolation: toggleBrushInterpolation,
  deleteTrack: deleteBrushTrack,
  updateKeyframe: updateBrushKeyframe,
  deleteKeyframe: deleteBrushKeyframe,
  findTrackAtPoint,
  selectTrackForEditing,
  deselectTrack,
  setHoveredTrack,
  setSegmentationEditMode,
  changeSelectedTrackColor,
  getSelectedTrackColor,
} = useBrushTracks(currentFrame);

const brushClasses = computed(() => {
  const classes: ToolClass[] = [];
  const usedColors = new Set<string>();

  for (const [, track] of brushTracks.value) {
    for (const [, keyframeData] of track.keyframes) {
      for (const item of keyframeData) {
        // Handle both MaskData (has 'color') and SegmentationContour (has 'classColor')
        const color = "color" in item ? item.color : item.classColor;
        if (!usedColors.has(color)) {
          usedColors.add(color);
          classes.push({
            value: item.classID - 1,
            name: item.className,
            color: color,
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

const isPolygonDrawing = ref(false);
const isSkeletonDrawing = ref(false);

const canEditPolygon = computed(
  () =>
    mode.value === "pan" ||
    (mode.value === "polygon" && !isPolygonDrawing.value)
);

const canEditSkeleton = computed(
  () =>
    mode.value === "pan" ||
    (mode.value === "skeleton" && !isSkeletonDrawing.value)
);

// Stage offset for toolbar positioning
const stageOffset = computed(() => {
  const stage = stageRef.value?.getStage();
  if (!stage) return { x: 0, y: 0 };
  return { x: stage.x(), y: stage.y() };
});

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

  if (isDrawing.value) {
    return;
  }

  await renderBrushAnnotations(frameIndex);
};

const renderBrushAnnotations = async (frameIndex: number) => {
  if (!workingCanvas || !displayCanvas) {
    initializeCanvases(stageConfig.value.width, stageConfig.value.height);
  }

  // Skip re-render if frame hasn't changed and no selection/hover state changes
  const hoveredTrackIdValue = hoveredBrushTrackId.value;
  if (
    currentDisplayFrame === frameIndex &&
    !showSegmentationToolbar.value &&
    !hoveredTrackIdValue
  ) {
    return;
  }

  // Render to workingCanvas first (off-screen)
  clearCanvas(workingCanvas!);

  let hasAnnotations = false;
  const selectedTrackIdValue = selectedBrushTrackId.value;

  // Create a separate canvas for the selected track (to render with different opacity)
  let selectedTrackCanvas: HTMLCanvasElement | null = null;
  if (selectedTrackIdValue && showSegmentationToolbar.value) {
    selectedTrackCanvas = document.createElement("canvas");
    selectedTrackCanvas.width = stageConfig.value.width;
    selectedTrackCanvas.height = stageConfig.value.height;
  }

  // Create a separate canvas for hovered track (highlight effect)
  let hoveredTrackCanvas: HTMLCanvasElement | null = null;
  if (hoveredTrackIdValue && !showSegmentationToolbar.value) {
    hoveredTrackCanvas = document.createElement("canvas");
    hoveredTrackCanvas.width = stageConfig.value.width;
    hoveredTrackCanvas.height = stageConfig.value.height;
  }

  for (const [trackId] of brushTracks.value) {
    const track = brushTracks.value.get(trackId);
    if (!track) continue;

    // Check ranges - if no ranges defined, show on all frames
    const ranges = track.ranges || [];
    const isInRange =
      ranges.length === 0
        ? true
        : ranges.some(
            ([start, end]) => frameIndex >= start && frameIndex < end
          );
    if (!isInRange) continue;

    // Determine target canvas (selected/hovered tracks go to separate canvas)
    const isSelected =
      trackId === selectedTrackIdValue && showSegmentationToolbar.value;
    const isHovered =
      trackId === hoveredTrackIdValue && !showSegmentationToolbar.value;

    let targetCanvas: HTMLCanvasElement;
    if (isSelected && selectedTrackCanvas) {
      targetCanvas = selectedTrackCanvas;
    } else if (isHovered && hoveredTrackCanvas) {
      targetCanvas = hoveredTrackCanvas;
    } else {
      targetCanvas = workingCanvas!;
    }

    const keyframeData = track.keyframes.get(frameIndex);
    if (keyframeData && keyframeData.length > 0) {
      // Check if this is RLE data or contour data
      if (isMaskData(keyframeData)) {
        // RLE-based rendering (fast, pixel-perfect)
        renderMasksToCanvas(keyframeData, targetCanvas, false, 1);
      } else {
        // Legacy contour-based rendering
        await renderContoursToTargetCanvas(
          brushClasses.value,
          keyframeData,
          1,
          targetCanvas,
          false
        );
      }
      hasAnnotations = true;
    } else if (track.interpolationEnabled) {
      const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
      let beforeFrame: number | null = null;
      for (const f of frames) {
        if (f <= frameIndex) beforeFrame = f;
        else break;
      }
      if (beforeFrame !== null) {
        const beforeData = track.keyframes.get(beforeFrame);
        if (beforeData && beforeData.length > 0) {
          // Check if this is RLE data or contour data
          if (isMaskData(beforeData)) {
            // RLE-based rendering (fast, pixel-perfect)
            renderMasksToCanvas(beforeData, targetCanvas, false, 1);
          } else {
            // Legacy contour-based rendering
            await renderContoursToTargetCanvas(
              brushClasses.value,
              beforeData,
              1,
              targetCanvas,
              false
            );
          }
          hasAnnotations = true;
        }
      }
    }
  }

  if (hasAnnotations) {
    // Atomic swap: copy workingCanvas to displayCanvas and update Konva
    updateAnnotationLayerWithSelectionAndHover(
      workingCanvas!,
      selectedTrackCanvas,
      hoveredTrackCanvas,
      frameIndex
    );
  } else {
    const brushGroup = brushAnnotationGroupRef.value?.getNode();
    if (brushGroup) {
      brushGroup.destroyChildren();
      annotationsLayerRef.value?.getNode()?.batchDraw();
    }
  }

  currentDisplayFrame = frameIndex;
};

const renderBrushAnnotationsWithTempStrokes = async (frameIndex: number) => {
  if (!workingCanvas) {
    initializeCanvases(stageConfig.value.width, stageConfig.value.height);
  }

  clearCanvas(workingCanvas!);

  // First render existing data from tracks (supports both RLE and contour formats)
  for (const [trackId] of brushTracks.value) {
    const track = brushTracks.value.get(trackId);
    if (!track) continue;

    // Check ranges - if no ranges defined, show on all frames
    const ranges = track.ranges || [];
    const isInRange =
      ranges.length === 0
        ? true
        : ranges.some(
            ([start, end]) => frameIndex >= start && frameIndex < end
          );
    if (!isInRange) continue;

    const keyframeData = track.keyframes.get(frameIndex);
    if (keyframeData && keyframeData.length > 0) {
      // Check if this is RLE data or contour data
      if (isMaskData(keyframeData)) {
        // RLE-based rendering (fast, pixel-perfect)
        renderMasksToCanvas(keyframeData, workingCanvas!, false, 1);
      } else {
        // Legacy contour-based rendering
        await renderContoursToTargetCanvas(
          brushClasses.value,
          keyframeData,
          1,
          workingCanvas!,
          false
        );
      }
    } else if (track.interpolationEnabled) {
      const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
      let beforeFrame: number | null = null;
      for (const f of frames) {
        if (f <= frameIndex) beforeFrame = f;
        else break;
      }
      if (beforeFrame !== null) {
        const beforeData = track.keyframes.get(beforeFrame);
        if (beforeData && beforeData.length > 0) {
          // Check if this is RLE data or contour data
          if (isMaskData(beforeData)) {
            // RLE-based rendering (fast, pixel-perfect)
            renderMasksToCanvas(beforeData, workingCanvas!, false, 1);
          } else {
            // Legacy contour-based rendering
            await renderContoursToTargetCanvas(
              brushClasses.value,
              beforeData,
              1,
              workingCanvas!,
              false
            );
          }
        }
      }
    }
  }

  // Then render temp brush strokes on top
  const ctx = workingCanvas!.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (const stroke of tempBrushStrokes.value) {
    if (stroke.frame !== frameIndex || stroke.points.length < 2) continue;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    const firstPoint = stroke.points[0];
    if (firstPoint) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        if (point) {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
  }

  // Binarize alpha to eliminate anti-aliasing noise (match RLE encoding behavior)
  if (tempBrushStrokes.value.length > 0) {
    binarizeAlpha(workingCanvas!);
  }

  // Update display
  currentDisplayFrame = -1; // Force update
  updateAnnotationLayer(workingCanvas!, frameIndex);
};

const forceRenderFrame = async (frameIndex: number) => {
  if (frameIndex < 0 || frameIndex >= physicalFrames.value) return;

  currentDisplayFrame = -1;
  await renderBrushAnnotations(frameIndex);
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

const handleScrubberInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  jumpToFrame(parseInt(target.value, 10));
};

const setMode = (
  newMode: "brush" | "eraser" | "pan" | "bbox" | "polygon" | "skeleton"
) => {
  mode.value = newMode;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    interactiveLayerRef.value?.getNode()?.batchDraw();
  }

  if (newMode === "pan") {
    stage.container().style.cursor = "default";
  } else if (newMode === "bbox" || newMode === "polygon") {
    stage.container().style.cursor = "crosshair";
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

const handleOpacityChange = () => {
  updateAllLayersOpacity();
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
  if (!annotationsLayerRef.value) return;
  const layer = annotationsLayerRef.value.getNode();
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
  saveAnnotations();
};

const handleBboxClick = (e: any) => {
  if (mode.value !== "pan") return;

  const group = e.target.findAncestor("Group");
  if (group) {
    const trackId = group.id();
    selectedBboxTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, "bbox");
    updateTransformerSelection();
  }
};

const handleBboxDragEnd = (e: any) => {
  const target = e.target;
  const group =
    target.getClassName() === "Group" ? target : target.findAncestor("Group");
  if (!group) return;

  const trackId = group.id();
  if (!trackId) return;
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

  updateBboxKeyframe(
    trackId,
    currentFrame.value,
    updatedBox,
    autoSuggest.value
  );
  saveAnnotations();

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

  const layer = annotationsLayerRef.value?.getNode();
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

  updateBboxKeyframe(
    selectedBboxTrackId.value,
    currentFrame.value,
    updatedBox,
    autoSuggest.value
  );
  saveAnnotations();

  nextTick(() => {
    updateTransformerSelection();
  });
};

const setupPolygonTool = () => {
  if (!annotationsLayerRef.value) return;
  const layer = annotationsLayerRef.value.getNode();
  polygonTool = new PolygonTool(layer);
};

const startPolygonDrawing = (pos: { x: number; y: number }) => {
  if (!polygonTool) return;
  polygonTool.startDrawing(pos, polygonColor.value);
  isPolygonDrawing.value = true;
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
  isPolygonDrawing.value = false;
  if (!polygon) return;

  const trackId = createPolygonTrack(
    currentFrame.value,
    polygon,
    undefined,
    physicalFrames.value
  );
  selectedPolygonTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, "polygon");
  saveAnnotations();
};

const cancelPolygonDrawing = () => {
  if (!polygonTool) return;
  polygonTool.cancelDrawing();
  isPolygonDrawing.value = false;
};

const handlePolygonClick = (e: any) => {
  if (!canEditPolygon.value) return;

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

  updatePolygonKeyframe(
    trackId,
    currentFrame.value,
    updatedPolygon,
    autoSuggest.value
  );
  saveAnnotations();

  const layer = annotationsLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const handlePolygonVertexClick = (polygonId: string) => {
  if (!canEditPolygon.value) return;
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

  const layer = annotationsLayerRef.value?.getNode();
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

  updatePolygonKeyframe(
    polygonId,
    currentFrame.value,
    updatedPolygon,
    autoSuggest.value
  );
  saveAnnotations();

  const layer = annotationsLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const setupSkeletonTool = () => {
  if (!annotationsLayerRef.value) return;
  const layer = annotationsLayerRef.value.getNode();
  skeletonTool = new SkeletonTool(layer);
};

const startSkeletonDrawing = (pos: { x: number; y: number }) => {
  if (!skeletonTool) return;
  skeletonTool.startDrawing(pos, skeletonColor.value);
  isSkeletonDrawing.value = true;
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
  isSkeletonDrawing.value = false;
  if (!skeleton) return;

  const trackId = createSkeletonTrack(
    currentFrame.value,
    skeleton,
    undefined,
    physicalFrames.value
  );
  selectedSkeletonTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, "skeleton");
  saveAnnotations();
};

const cancelSkeletonDrawing = () => {
  if (!skeletonTool) return;
  skeletonTool.cancelDrawing();
  isSkeletonDrawing.value = false;
};

const handleSkeletonClick = (e: any) => {
  if (!canEditSkeleton.value) return;

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

  updateSkeletonKeyframe(
    trackId,
    currentFrame.value,
    updatedSkeleton,
    autoSuggest.value
  );
  saveAnnotations();

  const layer = annotationsLayerRef.value?.getNode();
  if (layer) layer.batchDraw();
};

const handleSkeletonKeypointClick = (skeletonId: string) => {
  if (!canEditSkeleton.value) return;
  selectedSkeletonTrackId.value = skeletonId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  timelineRef.value?.selectTrack(skeletonId, "skeleton");
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
};

const applyColorToCanvas = (
  canvas: HTMLCanvasElement,
  newColor: string
): void => {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [r, g, b] = hexToRgb(newColor);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    if (alpha !== undefined && alpha > 0) {
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Binarize alpha channel to match RLE encoding behavior.
 * Converts all pixels with alpha > 0 to alpha = 255 (fully opaque).
 * This eliminates anti-aliasing "noise" from canvas stroke operations.
 */
const binarizeAlpha = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 3; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i];
    if (alpha !== undefined && alpha > 0) {
      imageData.data[i] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const handleMergeStrokes = async () => {
  // Check if we have anything to merge (either canvas or points)
  const hasCanvasData =
    tempStrokesConvertedToCanvas.value && tempStrokesCanvas.value;
  const hasPointsData = tempBrushStrokes.value.length > 0;

  if (!hasCanvasData && !hasPointsData) return;
  if (!currentImage.value) return;

  const targetFrame = bufferFrame.value ?? currentFrame.value;

  let combinedCanvas: HTMLCanvasElement;

  if (hasCanvasData && tempStrokesCanvas.value) {
    // Use the existing temp strokes canvas directly
    combinedCanvas = tempStrokesCanvas.value;
  } else {
    // Create a temporary canvas to render strokes from points
    combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = stageConfig.value.width;
    combinedCanvas.height = stageConfig.value.height;
    const combinedCtx = combinedCanvas.getContext("2d")!;
    combinedCtx.imageSmoothingEnabled = false;

    // Render all strokes from their points
    for (const stroke of tempBrushStrokes.value) {
      if (stroke.points.length < 2) continue;

      combinedCtx.strokeStyle = stroke.color;
      combinedCtx.lineWidth = stroke.size;
      combinedCtx.lineCap = "round";
      combinedCtx.lineJoin = "round";
      combinedCtx.globalCompositeOperation = "source-over";

      combinedCtx.beginPath();
      const firstPoint = stroke.points[0];
      if (firstPoint) {
        combinedCtx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const point = stroke.points[i];
          if (point) {
            combinedCtx.lineTo(point.x, point.y);
          }
        }
        combinedCtx.stroke();
      }
    }

    // Apply the merge color to all strokes
    applyColorToCanvas(combinedCanvas, mergeColor.value);
  }

  try {
    // Convert canvas to RLE-based MaskData (pixel-perfect, fast)
    const maskData = canvasToMaskData(
      combinedCanvas,
      mergeColor.value,
      "Brush",
      0
    );

    if (maskData) {
      // Check if mask has content
      const hasContent = maskData.rle.some(
        (val, idx) => idx % 2 === 1 && val > 0
      );

      if (!hasContent) {
        // No content to merge - just clean up
        tempBrushStrokes.value = [];
        tempStrokesCanvas.value = null;
        tempStrokesConvertedToCanvas.value = false;
        tempStrokesEditMode.value = "brush";
        showBrushMergePopup.value = false;
        bufferFrame.value = null;
        return;
      }

      // Create array with single mask
      const masks: MaskData[] = [maskData];

      // Step 1: Create track with the NEW RLE mask data
      const trackId = createBrushTrack(
        targetFrame,
        masks,
        undefined,
        physicalFrames.value
      );
      selectedBrushTrackId.value = null;
      timelineRef.value?.selectTrack(trackId, "brush");

      // Step 2: Render ONLY the NEW mask to workingCanvas
      if (!workingCanvas || !displayCanvas) {
        initializeCanvases(stageConfig.value.width, stageConfig.value.height);
      }
      clearCanvas(workingCanvas!);

      // Render only the newly created mask (RLE-based, pixel-perfect)
      renderMaskToCanvas(maskData, workingCanvas!, false, 1);

      // Step 3: ADD new mask ON TOP of existing displayCanvas (don't clear it!)
      const displayCtx = displayCanvas!.getContext("2d")!;
      displayCtx.drawImage(workingCanvas!, 0, 0);

      // Step 4: Update Konva display (displayCanvas now has old + new)
      const brushGroup = brushAnnotationGroupRef.value?.getNode();
      if (brushGroup) {
        brushGroup.destroyChildren();
        const konvaImage = new Konva.Image({
          image: displayCanvas!,
          x: 0,
          y: 0,
          width: stageConfig.value.width,
          height: stageConfig.value.height,
          listening: false,
          opacity: opacity.value,
        });
        brushGroup.add(konvaImage);
        annotationsLayerRef.value?.getNode()?.batchDraw();
      }

      // Step 5: Clear temp strokes and canvas state
      tempBrushStrokes.value = [];
      tempStrokesCanvas.value = null;
      tempStrokesConvertedToCanvas.value = false;
      tempStrokesEditMode.value = "brush";
      showBrushMergePopup.value = false;
      bufferFrame.value = null;
      currentDisplayFrame = targetFrame;

      // Step 6: Save
      saveAnnotations();
    }
  } catch (err) {
    console.error("Failed to merge strokes:", err);
    // On error, still clean up
    tempBrushStrokes.value = [];
    tempStrokesCanvas.value = null;
    tempStrokesConvertedToCanvas.value = false;
    tempStrokesEditMode.value = "brush";
    showBrushMergePopup.value = false;
    bufferFrame.value = null;
  }
};

const handleClearStrokes = async () => {
  const targetFrame = bufferFrame.value ?? currentFrame.value;

  tempBrushStrokes.value = [];
  tempStrokesCanvas.value = null;
  tempStrokesConvertedToCanvas.value = false;
  tempStrokesEditMode.value = "brush";
  showBrushMergePopup.value = false;
  bufferFrame.value = null;

  // Force re-render to clear temp strokes
  currentDisplayFrame = -1;
  await renderFrame(targetFrame);
};

// Convert temp brush strokes from points to canvas (for eraser support)
const convertTempStrokesToCanvas = () => {
  if (tempStrokesConvertedToCanvas.value || tempBrushStrokes.value.length === 0)
    return;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = stageConfig.value.width;
  canvas.height = stageConfig.value.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Render all strokes from points
  for (const stroke of tempBrushStrokes.value) {
    if (stroke.points.length < 2) continue;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    const firstPoint = stroke.points[0];
    if (firstPoint) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        if (point) {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
  }

  // Apply merge color to ensure consistency
  applyColorToCanvas(canvas, mergeColor.value);

  // Binarize alpha to eliminate anti-aliasing noise
  binarizeAlpha(canvas);

  // Store canvas and clear points
  tempStrokesCanvas.value = canvas;
  tempBrushStrokes.value = [];
  tempStrokesConvertedToCanvas.value = true;
};

// Handle edit mode change in BrushMergePopup
const handleTempStrokesEditModeChange = async (newMode: "brush" | "eraser") => {
  // If switching to eraser and not yet converted, convert points to canvas
  if (newMode === "eraser" && !tempStrokesConvertedToCanvas.value) {
    convertTempStrokesToCanvas();
  }

  tempStrokesEditMode.value = newMode;

  // Update cursor style
  const stage = stageRef.value?.getStage();
  if (stage) {
    stage.container().style.cursor = "none";
  }
};

// Handle color change in BrushMergePopup
const handleTempStrokesColorChange = async (newColor: string) => {
  mergeColor.value = newColor;

  // If already converted to canvas, recolor the canvas
  if (tempStrokesConvertedToCanvas.value && tempStrokesCanvas.value) {
    applyColorToCanvas(tempStrokesCanvas.value, newColor);

    // Re-render to show updated color
    const targetFrame = bufferFrame.value ?? currentFrame.value;
    await renderTempStrokesCanvasToDisplay(targetFrame);
  }
};

// Render temp strokes canvas to display
const renderTempStrokesCanvasToDisplay = async (frameIndex: number) => {
  if (!tempStrokesCanvas.value) return;

  if (!workingCanvas) {
    initializeCanvases(stageConfig.value.width, stageConfig.value.height);
  }

  clearCanvas(workingCanvas!);

  // First render existing track data
  for (const [trackId] of brushTracks.value) {
    const track = brushTracks.value.get(trackId);
    if (!track) continue;

    const ranges = track.ranges || [];
    const isInRange =
      ranges.length === 0
        ? true
        : ranges.some(
            ([start, end]) => frameIndex >= start && frameIndex < end
          );
    if (!isInRange) continue;

    const keyframeData = track.keyframes.get(frameIndex);
    if (keyframeData && keyframeData.length > 0) {
      if (isMaskData(keyframeData)) {
        renderMasksToCanvas(keyframeData, workingCanvas!, false, 1);
      } else {
        await renderContoursToTargetCanvas(
          brushClasses.value,
          keyframeData,
          1,
          workingCanvas!,
          false
        );
      }
    } else if (track.interpolationEnabled) {
      const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
      let beforeFrame: number | null = null;
      for (const f of frames) {
        if (f <= frameIndex) beforeFrame = f;
        else break;
      }
      if (beforeFrame !== null) {
        const beforeData = track.keyframes.get(beforeFrame);
        if (beforeData && beforeData.length > 0) {
          if (isMaskData(beforeData)) {
            renderMasksToCanvas(beforeData, workingCanvas!, false, 1);
          } else {
            await renderContoursToTargetCanvas(
              brushClasses.value,
              beforeData,
              1,
              workingCanvas!,
              false
            );
          }
        }
      }
    }
  }

  // Then render the temp strokes canvas on top
  const ctx = workingCanvas!.getContext("2d")!;
  ctx.drawImage(tempStrokesCanvas.value, 0, 0);

  // Update display
  currentDisplayFrame = -1;
  updateAnnotationLayer(workingCanvas!, frameIndex);
};

const SKELETON_SNAP_THRESHOLD = 10;
const COLOCATED_EPSILON = 0.5;
const snapIndicator = ref<Konva.Circle | null>(null);

interface ColocatedPoint {
  skeletonId: string;
  pointIdx: number;
}

const colocatedPoints = ref<ColocatedPoint[]>([]);
const dragStartPosition = ref<{ x: number; y: number } | null>(null);

const findColocatedPoints = (
  pos: { x: number; y: number },
  primarySkeletonId: string,
  primaryPointIdx: number
): ColocatedPoint[] => {
  const result: ColocatedPoint[] = [];
  const allSkeletons = currentFrameSkeletons.value;

  for (const skeleton of allSkeletons) {
    for (let i = 0; i < skeleton.points.length; i++) {
      if (skeleton.id === primarySkeletonId && i === primaryPointIdx) {
        continue;
      }

      const point = skeleton.points[i];
      if (!point) continue;

      const distance = Math.sqrt(
        Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
      );

      if (distance < COLOCATED_EPSILON) {
        result.push({ skeletonId: skeleton.id, pointIdx: i });
      }
    }
  }

  return result;
};

const findNearbySkeletonPoint = (
  pos: { x: number; y: number },
  excludeSkeletonId: string,
  excludePointIdx: number
): { x: number; y: number } | null => {
  const allSkeletons = currentFrameSkeletons.value;

  for (const skeleton of allSkeletons) {
    for (let i = 0; i < skeleton.points.length; i++) {
      if (skeleton.id === excludeSkeletonId && i === excludePointIdx) {
        continue;
      }

      const isColocated = colocatedPoints.value.some(
        (cp) => cp.skeletonId === skeleton.id && cp.pointIdx === i
      );
      if (isColocated) {
        continue;
      }

      const point = skeleton.points[i];
      if (!point) continue;

      const distance = Math.sqrt(
        Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
      );

      if (distance < SKELETON_SNAP_THRESHOLD) {
        return { x: point.x, y: point.y };
      }
    }
  }

  return null;
};

const colocatedCircleRefs = ref<Konva.Circle[]>([]);

const handleSkeletonKeypointDragStart = (
  _e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const currentSkeleton = getSkeletonAtFrame(skeletonId, currentFrame.value);
  if (!currentSkeleton) return;

  const point = currentSkeleton.points[pointIdx];
  if (!point) return;

  dragStartPosition.value = { x: point.x, y: point.y };
  colocatedPoints.value = findColocatedPoints(point, skeletonId, pointIdx);

  const layer = annotationsLayerRef.value?.getNode();
  if (!layer) return;

  colocatedCircleRefs.value = [];
  const allCircles = layer.find(".skeletonKeypoint") as Konva.Circle[];

  for (const c of allCircles) {
    const circlePos = { x: c.x(), y: c.y() };
    const dist = Math.sqrt(
      Math.pow(circlePos.x - point.x, 2) + Math.pow(circlePos.y - point.y, 2)
    );

    if (dist < COLOCATED_EPSILON) {
      colocatedCircleRefs.value.push(c);
    }
  }
};

const handleSkeletonKeypointDragMove = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  const currentSkeleton = getSkeletonAtFrame(skeletonId, currentFrame.value);
  if (!currentSkeleton) return;

  const circle = e.target;
  const currentPos = { x: circle.x(), y: circle.y() };

  const layer = annotationsLayerRef.value?.getNode();
  if (!layer) return;

  const newPoints = [...currentSkeleton.points];
  newPoints[pointIdx] = currentPos;
  const line = layer.findOne(`#${skeletonId}`);
  if (line) {
    line.points(newPoints.flatMap((p) => [p.x, p.y]));
  }

  for (const c of colocatedCircleRefs.value) {
    if (c !== circle) {
      c.x(currentPos.x);
      c.y(currentPos.y);
    }
  }

  for (const cp of colocatedPoints.value) {
    const cpSkeleton = getSkeletonAtFrame(cp.skeletonId, currentFrame.value);
    if (!cpSkeleton) continue;

    const cpPoints = [...cpSkeleton.points];
    cpPoints[cp.pointIdx] = currentPos;
    const cpLine = layer.findOne(`#${cp.skeletonId}`);
    if (cpLine) {
      (cpLine as Konva.Line).points(cpPoints.flatMap((p) => [p.x, p.y]));
    }
  }

  if (snapIndicator.value) {
    snapIndicator.value.destroy();
    snapIndicator.value = null;
  }

  const nearbyPoint = findNearbySkeletonPoint(currentPos, skeletonId, pointIdx);

  if (nearbyPoint) {
    snapIndicator.value = new Konva.Circle({
      x: nearbyPoint.x,
      y: nearbyPoint.y,
      radius: 12,
      stroke: "#00FF00",
      strokeWidth: 3,
      dash: [4, 4],
      listening: false,
    });
    layer.add(snapIndicator.value);
  }

  layer.batchDraw();
};

const handleSkeletonKeypointDragEnd = (
  e: any,
  skeletonId: string,
  pointIdx: number
) => {
  if (snapIndicator.value) {
    snapIndicator.value.destroy();
    snapIndicator.value = null;
  }

  const currentSkeleton = getSkeletonAtFrame(skeletonId, currentFrame.value);
  if (!currentSkeleton) return;

  const circle = e.target;
  let newX = circle.x();
  let newY = circle.y();

  const nearbyPoint = findNearbySkeletonPoint(
    { x: newX, y: newY },
    skeletonId,
    pointIdx
  );

  if (nearbyPoint) {
    newX = nearbyPoint.x;
    newY = nearbyPoint.y;
    circle.x(newX);
    circle.y(newY);
  }

  const newPoints = [...currentSkeleton.points];
  newPoints[pointIdx] = { x: newX, y: newY };

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: newPoints,
  };

  updateSkeletonKeyframe(
    skeletonId,
    currentFrame.value,
    updatedSkeleton,
    autoSuggest.value
  );

  for (const cp of colocatedPoints.value) {
    const cpSkeleton = getSkeletonAtFrame(cp.skeletonId, currentFrame.value);
    if (!cpSkeleton) continue;

    const cpPoints = [...cpSkeleton.points];
    cpPoints[cp.pointIdx] = { x: newX, y: newY };

    const updatedCpSkeleton: Skeleton = {
      ...cpSkeleton,
      points: cpPoints,
    };

    updateSkeletonKeyframe(
      cp.skeletonId,
      currentFrame.value,
      updatedCpSkeleton,
      autoSuggest.value
    );
  }

  colocatedPoints.value = [];
  colocatedCircleRefs.value = [];
  dragStartPosition.value = null;

  saveAnnotations();

  const layer = annotationsLayerRef.value?.getNode();
  if (layer) {
    layer.batchDraw();
  }
};

const handleMouseDown = (e: any) => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const screenPos = getStagePointerPosition();
  if (!screenPos) return;

  // Check for temp strokes edit mode (BrushMergePopup eraser) FIRST
  if (showBrushMergePopup.value && brush.value?.isLoaded()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    isDrawing.value = true;
    drawingStartFrame.value = currentFrame.value;
    brush.value.startStroke(logicalPos);

    // Set brush color for drawing
    if (tempStrokesEditMode.value === "brush") {
      brush.value.changeColor(mergeColor.value);
    }

    const brushLayer = brushPreviewGroupRef.value?.getNode();
    if (brushLayer) {
      brushLayer.destroyChildren();
    }
    return;
  }

  // Check for segmentation edit mode FIRST - this takes priority over pan mode
  const isInSegmentationBrushMode = segmentationEditMode.value === "brush";
  const isInSegmentationEraserMode = segmentationEditMode.value === "eraser";

  if (
    (isInSegmentationBrushMode || isInSegmentationEraserMode) &&
    brush.value?.isLoaded()
  ) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    isDrawing.value = true;
    drawingStartFrame.value = currentFrame.value;
    brush.value.startStroke(logicalPos);

    // Set brush color to match selected segmentation when in brush edit mode
    if (isInSegmentationBrushMode && selectedSegmentationColor.value) {
      brush.value.changeColor(selectedSegmentationColor.value);
    }

    const brushLayer = brushPreviewGroupRef.value?.getNode();
    if (brushLayer) {
      brushLayer.destroyChildren();
    }
    return;
  }

  if (mode.value === "pan" || e.evt.altKey) {
    const target = e.target;
    const isClickOnAnnotation =
      target !== stage &&
      target.getClassName() !== "Image" &&
      (target.findAncestor("Group") ||
        target.name() === "polygon" ||
        target.name() === "polygonVertex" ||
        target.name() === "skeleton" ||
        target.name() === "skeletonKeypoint" ||
        target.name() === "boundingBox");

    if (!isClickOnAnnotation) {
      // Check if clicking on a segmentation mask (RLE-based hit test)
      const logicalPos = getLogicalPointerPosition();
      if (logicalPos) {
        const trackId = findTrackAtPoint(
          logicalPos.x,
          logicalPos.y,
          currentFrame.value
        );
        if (trackId) {
          // Clicked on a segmentation - select it
          handleSelectSegmentationAtPoint(logicalPos.x, logicalPos.y);
          return;
        }
      }

      // Not on segmentation - start panning or deselect
      if (showSegmentationToolbar.value) {
        handleDeselectSegmentation();
      }

      isPanning.value = true;
      lastPanPoint.value = screenPos;
      stage.container().style.cursor = "grabbing";
      selectedBboxTrackId.value = null;
      selectedPolygonTrackId.value = null;
      selectedSkeletonTrackId.value = null;
      timelineRef.value?.clearSelection();
      updateTransformerSelection();
    }
    if (!isClickOnAnnotation) {
      return;
    }
  }

  if (mode.value === "polygon") {
    const target = e.target;
    const isClickOnPolygonVertex = target.name() === "polygonVertex";
    const isClickOnPolygon = target.name() === "polygon";

    if (
      !polygonTool?.isDrawingActive() &&
      (isClickOnPolygonVertex || isClickOnPolygon)
    ) {
      return;
    }

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
    const target = e.target;
    const isClickOnSkeletonKeypoint = target.name() === "skeletonKeypoint";
    const isClickOnSkeleton = target.name() === "skeleton";

    if (
      !skeletonTool?.isDrawingActive() &&
      (isClickOnSkeletonKeypoint || isClickOnSkeleton)
    ) {
      return;
    }

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

  // Check for main brush/eraser mode OR segmentation edit mode from toolbar
  const isInBrushMode =
    mode.value === "brush" || segmentationEditMode.value === "brush";
  const isInEraserMode =
    mode.value === "eraser" || segmentationEditMode.value === "eraser";

  if ((isInBrushMode || isInEraserMode) && brush.value?.isLoaded()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    isDrawing.value = true;
    drawingStartFrame.value = currentFrame.value;
    brush.value.startStroke(logicalPos);

    // Set brush color to match selected segmentation when in edit mode
    if (
      segmentationEditMode.value === "brush" &&
      selectedSegmentationColor.value
    ) {
      brush.value.changeColor(selectedSegmentationColor.value);
    }

    const brushLayer = brushPreviewGroupRef.value?.getNode();
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

  // Check for brush/eraser mode (main or segmentation edit)
  const isInBrushMode =
    mode.value === "brush" || segmentationEditMode.value === "brush";
  const isInEraserMode =
    mode.value === "eraser" || segmentationEditMode.value === "eraser";

  if (
    (mode.value !== "pan" || isInBrushMode || isInEraserMode) &&
    mode.value !== "bbox" &&
    mode.value !== "polygon" &&
    mode.value !== "skeleton" &&
    brush.value
  ) {
    const logicalPos = getLogicalPointerPosition();
    if (logicalPos) {
      updateCursor(logicalPos);
    }
  }

  if (isDrawing.value && (isInBrushMode || isInEraserMode) && brush.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    brush.value.continueStroke(logicalPos);

    const brushGroup = brushPreviewGroupRef.value?.getNode();
    if (brushGroup) {
      brushGroup.destroyChildren();
      const shape = brush.value.renderStrokeShape(
        brush.value.getCurrentPoints(),
        1
      );
      brushGroup.add(shape);
      interactiveLayerRef.value?.getNode()?.batchDraw();
    }
  }

  // Throttled hover detection for segmentation masks (Pan mode only)
  if (
    mode.value === "pan" &&
    !isPanning.value &&
    !isDrawing.value &&
    !showSegmentationToolbar.value
  ) {
    const now = performance.now();
    if (now - lastHoverCheckTime >= HOVER_THROTTLE_MS) {
      lastHoverCheckTime = now;
      const logicalPos = getLogicalPointerPosition();
      if (logicalPos) {
        const trackId = findTrackAtPoint(
          logicalPos.x,
          logicalPos.y,
          currentFrame.value
        );
        if (trackId !== hoveredBrushTrackId.value) {
          setHoveredTrack(trackId);
          // Update cursor to indicate hoverable segmentation
          const stage = stageRef.value?.getStage();
          if (stage) {
            stage.container().style.cursor = trackId ? "pointer" : "default";
          }
        }
      }
    }
  }
};

const handleMouseUp = async () => {
  const stage = stageRef.value?.getStage();
  if (stage && isPanning.value) {
    stage.container().style.cursor =
      mode.value === "pan"
        ? "default"
        : mode.value === "bbox" || mode.value === "polygon"
        ? "crosshair"
        : "none";
  }

  isPanning.value = false;
  lastPanPoint.value = null;

  if (mode.value === "bbox" && isDrawing.value) {
    isDrawing.value = false;
    finishBboxDrawing();
    return;
  }

  // Handle temp strokes editing (BrushMergePopup brush/eraser)
  if (showBrushMergePopup.value && isDrawing.value && brush.value) {
    const points = brush.value.endStroke();

    if (points.length === 0) {
      isDrawing.value = false;
      drawingStartFrame.value = null;
      return;
    }

    const targetFrame = drawingStartFrame.value ?? currentFrame.value;
    drawingStartFrame.value = null;

    // Clear brush preview
    const brushGroup = brushPreviewGroupRef.value?.getNode();
    if (brushGroup) {
      brushGroup.destroyChildren();
      interactiveLayerRef.value?.getNode()?.batchDraw();
    }

    if (tempStrokesEditMode.value === "brush") {
      // Brush mode - add stroke
      if (tempStrokesConvertedToCanvas.value && tempStrokesCanvas.value) {
        // Already converted to canvas - draw directly on it
        const ctx = tempStrokesCanvas.value.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.strokeStyle = mergeColor.value;
        ctx.lineWidth = brushSize.value;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "source-over";

        if (points.length >= 2) {
          ctx.beginPath();
          const firstPoint = points[0];
          if (firstPoint) {
            ctx.moveTo(firstPoint.x, firstPoint.y);
            for (let i = 1; i < points.length; i++) {
              const point = points[i];
              if (point) {
                ctx.lineTo(point.x, point.y);
              }
            }
            ctx.stroke();
          }
        }

        // Binarize alpha to eliminate anti-aliasing noise
        binarizeAlpha(tempStrokesCanvas.value);

        // Re-render display
        await renderTempStrokesCanvasToDisplay(targetFrame);
      } else {
        // Still using points - add to array
        tempBrushStrokes.value.push({
          points: [...points],
          color: mergeColor.value,
          size: brushSize.value,
          frame: targetFrame,
        });

        if (bufferFrame.value === null) {
          bufferFrame.value = targetFrame;
        }

        // Re-render display
        await renderBrushAnnotationsWithTempStrokes(targetFrame);
      }
    } else {
      // Eraser mode - must be on canvas
      if (!tempStrokesConvertedToCanvas.value) {
        // Convert to canvas first
        convertTempStrokesToCanvas();
      }

      if (tempStrokesCanvas.value) {
        // Create eraser stroke canvas
        const eraserStrokeCanvas = document.createElement("canvas");
        eraserStrokeCanvas.width = stageConfig.value.width;
        eraserStrokeCanvas.height = stageConfig.value.height;
        brush.value.renderToCanvas(eraserStrokeCanvas, points, 1, 1.0);

        // Apply eraser to temp strokes canvas
        const ctx = tempStrokesCanvas.value.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(eraserStrokeCanvas, 0, 0);
        ctx.globalCompositeOperation = "source-over";

        // Re-render display
        await renderTempStrokesCanvasToDisplay(targetFrame);
      }
    }

    isDrawing.value = false;
    return;
  }

  // Check for brush/eraser mode (main or segmentation edit)
  const isInBrushMode =
    mode.value === "brush" || segmentationEditMode.value === "brush";
  const isInEraserMode =
    mode.value === "eraser" || segmentationEditMode.value === "eraser";

  if (!isDrawing.value || !brush.value || !currentImage.value) return;
  if (!isInBrushMode && !isInEraserMode) return;

  const points = brush.value.endStroke();

  if (points.length === 0) {
    isDrawing.value = false;
    drawingStartFrame.value = null;
    return;
  }

  const targetFrame = drawingStartFrame.value ?? currentFrame.value;
  drawingStartFrame.value = null;

  const strokeCanvas = createOffscreenCanvas(currentImage.value);
  const strokeCtx = strokeCanvas.getContext("2d")!;
  strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
  strokeCtx.globalCompositeOperation = "source-over";

  const eraserOpacity = isInEraserMode ? 1.0 : undefined;
  brush.value.renderToCanvas(strokeCanvas, points, 1, eraserOpacity);

  const brushGroup = brushPreviewGroupRef.value?.getNode();
  if (brushGroup) {
    brushGroup.destroyChildren();
    interactiveLayerRef.value?.getNode()?.batchDraw();
  }

  if (isInBrushMode) {
    // Check if we're in segmentation edit mode - auto-merge into selected track
    if (segmentationEditMode.value === "brush" && selectedBrushTrackId.value) {
      const selectedTrackId = selectedBrushTrackId.value;
      const strokeColor = selectedSegmentationColor.value;

      // Get the current track data
      const track = brushTracks.value.get(selectedTrackId);
      if (!track) {
        isDrawing.value = false;
        return;
      }

      // Create a canvas with the existing mask + new stroke
      const mergedCanvas = document.createElement("canvas");
      mergedCanvas.width = stageConfig.value.width;
      mergedCanvas.height = stageConfig.value.height;
      const mergedCtx = mergedCanvas.getContext("2d")!;
      mergedCtx.imageSmoothingEnabled = false;

      // First, render existing mask data for this track at this frame
      let existingKeyframeData = track.keyframes.get(targetFrame);

      // If no keyframe at this frame but interpolation is enabled, get from previous keyframe
      if (!existingKeyframeData && track.interpolationEnabled) {
        const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
        let beforeFrame: number | null = null;
        for (const f of frames) {
          if (f <= targetFrame) beforeFrame = f;
          else break;
        }
        if (beforeFrame !== null) {
          existingKeyframeData = track.keyframes.get(beforeFrame);
        }
      }

      // Render existing mask if present
      if (existingKeyframeData && isMaskData(existingKeyframeData)) {
        renderMasksToCanvas(existingKeyframeData, mergedCanvas, false, 1);
      }

      // Now draw the new stroke on top
      mergedCtx.strokeStyle = strokeColor;
      mergedCtx.lineWidth = brushSize.value;
      mergedCtx.lineCap = "round";
      mergedCtx.lineJoin = "round";
      mergedCtx.globalCompositeOperation = "source-over";

      if (points.length >= 2) {
        mergedCtx.beginPath();
        const firstPoint = points[0];
        if (firstPoint) {
          mergedCtx.moveTo(firstPoint.x, firstPoint.y);
          for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (point) {
              mergedCtx.lineTo(point.x, point.y);
            }
          }
          mergedCtx.stroke();
        }
      }

      // Apply the color to ensure consistency
      applyColorToCanvas(mergedCanvas, strokeColor);

      // Binarize alpha to eliminate anti-aliasing noise
      binarizeAlpha(mergedCanvas);

      // Convert the merged canvas to RLE MaskData
      const newMaskData = canvasToMaskData(
        mergedCanvas,
        strokeColor,
        "Brush",
        0
      );

      if (newMaskData) {
        // Update the track keyframe with merged data
        updateBrushKeyframe(
          selectedTrackId,
          targetFrame,
          [newMaskData],
          autoSuggest.value
        );

        // IMPORTANT: Also update the editCanvas in trackEditStates
        // This ensures deselectTrack() will save the correct data when "Done" is clicked
        const editState = trackEditStates.value.get(selectedTrackId);
        if (editState) {
          const editCtx = editState.editCanvas.getContext("2d");
          if (editCtx) {
            editCtx.clearRect(
              0,
              0,
              editState.editCanvas.width,
              editState.editCanvas.height
            );
            editCtx.drawImage(mergedCanvas, 0, 0);
          }
        }

        // Force re-render to show the merged result
        currentDisplayFrame = -1;
        await forceRenderFrame(targetFrame);
      }
    } else {
      // Regular brush mode - use the popup workflow
      const strokeColor = brushColor.value;

      // Store the stroke points for later merging
      tempBrushStrokes.value.push({
        points: [...points],
        color: strokeColor,
        size: brushSize.value,
        frame: targetFrame,
      });

      if (bufferFrame.value === null) {
        bufferFrame.value = targetFrame;
      }

      // Re-render the display with existing contours + temp strokes
      await renderBrushAnnotationsWithTempStrokes(targetFrame);

      mergeColor.value = strokeColor;
      showBrushMergePopup.value = true;
    }
  }

  if (isInEraserMode) {
    const selectedTrackId =
      selectedBrushTrackId.value || timelineRef.value?.selectedTrackId;
    const selectedType = timelineRef.value?.selectedTrackType;
    const isInSegmentationEditMode = segmentationEditMode.value === "eraser";

    // Allow erasing if in segmentation edit mode with a selected track, or if track is selected in timeline
    if (
      !selectedTrackId ||
      (!isInSegmentationEditMode && selectedType !== "brush")
    ) {
      isDrawing.value = false;
      return;
    }

    // Check if we're in segmentation edit mode - use RLE-based erasing
    if (isInSegmentationEditMode && selectedBrushTrackId.value) {
      const trackId = selectedBrushTrackId.value;
      const strokeColor = selectedSegmentationColor.value;

      // Get the current track data
      const track = brushTracks.value.get(trackId);
      if (!track) {
        isDrawing.value = false;
        return;
      }

      // Create a canvas with the existing mask
      const modifiedCanvas = document.createElement("canvas");
      modifiedCanvas.width = stageConfig.value.width;
      modifiedCanvas.height = stageConfig.value.height;
      const modifiedCtx = modifiedCanvas.getContext("2d")!;

      // First, render existing mask data for this track at this frame
      let existingKeyframeData = track.keyframes.get(targetFrame);

      // If no keyframe at this frame but interpolation is enabled, get from previous keyframe
      if (!existingKeyframeData && track.interpolationEnabled) {
        const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
        let beforeFrame: number | null = null;
        for (const f of frames) {
          if (f <= targetFrame) beforeFrame = f;
          else break;
        }
        if (beforeFrame !== null) {
          existingKeyframeData = track.keyframes.get(beforeFrame);
        }
      }

      // If no existing data, nothing to erase
      if (!existingKeyframeData || !isMaskData(existingKeyframeData)) {
        isDrawing.value = false;
        return;
      }

      // Render existing mask to the canvas
      renderMasksToCanvas(existingKeyframeData, modifiedCanvas, false, 1);

      // Create eraser stroke canvas
      const eraserStrokeCanvas = document.createElement("canvas");
      eraserStrokeCanvas.width = stageConfig.value.width;
      eraserStrokeCanvas.height = stageConfig.value.height;
      brush.value.renderToCanvas(eraserStrokeCanvas, points, 1, 1.0);

      // Apply eraser using destination-out composite operation
      modifiedCtx.globalCompositeOperation = "destination-out";
      modifiedCtx.drawImage(eraserStrokeCanvas, 0, 0);

      // Convert the modified canvas to RLE MaskData
      const newMaskData = canvasToMaskData(
        modifiedCanvas,
        strokeColor,
        "Brush",
        0
      );

      if (newMaskData) {
        // Check if the mask is empty (all erased)
        const hasContent = newMaskData.rle.some(
          (val, idx) => idx % 2 === 1 && val > 0
        );

        if (hasContent) {
          // Update the track keyframe with modified data
          updateBrushKeyframe(
            trackId,
            targetFrame,
            [newMaskData],
            autoSuggest.value
          );
        } else {
          // All content erased - delete the keyframe
          deleteBrushKeyframe(trackId, targetFrame, autoSuggest.value);
        }

        // IMPORTANT: Also update the editCanvas in trackEditStates
        // This ensures deselectTrack() will save the correct data when "Done" is clicked
        const editState = trackEditStates.value.get(trackId);
        if (editState) {
          const editCtx = editState.editCanvas.getContext("2d");
          if (editCtx) {
            editCtx.clearRect(
              0,
              0,
              editState.editCanvas.width,
              editState.editCanvas.height
            );
            editCtx.drawImage(modifiedCanvas, 0, 0);
          }
        }

        // Force re-render to show the erased result
        currentDisplayFrame = -1;
        await forceRenderFrame(targetFrame);
      }
    } else {
      // Legacy eraser mode for contour-based tracks (non-segmentation edit mode)
      const trackResult = await getContoursAtFrame(
        selectedTrackId,
        targetFrame,
        brushClasses.value,
        stageConfig.value.width,
        stageConfig.value.height,
        1
      );

      if (!trackResult.canvas || trackResult.contours.length === 0) {
        isDrawing.value = false;
        return;
      }

      const eraserStrokeCanvas = document.createElement("canvas");
      eraserStrokeCanvas.width = stageConfig.value.width;
      eraserStrokeCanvas.height = stageConfig.value.height;
      const eraserCtx = eraserStrokeCanvas.getContext("2d")!;
      eraserCtx.imageSmoothingEnabled = false;
      brush.value.renderToCanvas(eraserStrokeCanvas, points, 1, 1.0);

      const modifiedCanvas = document.createElement("canvas");
      modifiedCanvas.width = trackResult.canvas.width;
      modifiedCanvas.height = trackResult.canvas.height;
      const modifiedCtx = modifiedCanvas.getContext("2d")!;

      modifiedCtx.drawImage(trackResult.canvas, 0, 0);
      modifiedCtx.globalCompositeOperation = "destination-out";
      modifiedCtx.drawImage(eraserStrokeCanvas, 0, 0);

      const trackContourColor =
        trackResult.contours[0]?.classColor || brushColor.value;
      const eraserClasses: ToolClass[] = [
        {
          value: 0,
          name: "Brush",
          color: trackContourColor,
        },
      ];

      const originalContours = trackResult.contours;

      try {
        const newContours = await getSegmentationImageContoursForSaving(
          modifiedCanvas,
          1,
          eraserClasses
        );

        if (newContours.length > 0) {
          updateBrushKeyframe(
            selectedTrackId,
            targetFrame,
            newContours,
            autoSuggest.value,
            originalContours
          );
        } else {
          deleteBrushKeyframe(
            selectedTrackId,
            targetFrame,
            autoSuggest.value,
            originalContours
          );
        }

        // Force re-render with updated contours
        currentDisplayFrame = -1;
        await forceRenderFrame(targetFrame);

        saveAnnotations();
      } catch (err) {
        console.error("Failed to update erased contours:", err);
      }
    }
  }

  isDrawing.value = false;
};

const handleMouseLeave = () => {
  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    interactiveLayerRef.value?.getNode()?.batchDraw();
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
      updateBboxKeyframe(
        trackId,
        currentFrame.value,
        currentBox,
        autoSuggest.value
      );
    }
  } else if (type === "polygon") {
    const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (currentPolygon) {
      updatePolygonKeyframe(
        trackId,
        currentFrame.value,
        currentPolygon,
        autoSuggest.value
      );
    }
  } else if (type === "skeleton") {
    const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (currentSkeleton) {
      updateSkeletonKeyframe(
        trackId,
        currentFrame.value,
        currentSkeleton,
        autoSuggest.value
      );
    }
  }
  saveAnnotations();
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

const handleRangeResizeEnd = (
  _trackId: string,
  _type: TrackType,
  _rangeIndex: number,
  _start: number,
  _end: number
) => {
  saveAnnotations();
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
  saveAnnotations();
};

const handleClearCache = async () => {
  isClearingCache.value = true;
  try {
    const videoFileName = framesStore.videoFileName;
    if (videoFileName) {
      annotationStore.setVideoFileName(videoFileName);
      await annotationStore.clearAll();
    }
    await framesStore.clearCache();
    framesStore.clearFrames();
    router.push("/");
  } finally {
    isClearingCache.value = false;
  }
};

// ========== Segmentation Selection Handlers ==========

const handleSegmentationEditMode = (newEditMode: "brush" | "eraser") => {
  setSegmentationEditMode(newEditMode);

  // Update cursor style for brush/eraser mode
  const stage = stageRef.value?.getStage();
  if (stage) {
    stage.container().style.cursor = "none";
  }
};

const handleSegmentationColorChange = async (newColor: string) => {
  selectedSegmentationColor.value = newColor;
  changeSelectedTrackColor(newColor);

  // Re-render the display with updated color
  await forceRenderFrame(currentFrame.value);
};

const handleDeselectSegmentation = async () => {
  deselectTrack();
  showSegmentationToolbar.value = false;
  setSegmentationEditMode("none");

  // Restore default cursor
  const stage = stageRef.value?.getStage();
  if (stage) {
    stage.container().style.cursor = "default";
  }

  // Re-render to show saved changes
  await forceRenderFrame(currentFrame.value);
  saveAnnotations();
};

const handleSelectSegmentationAtPoint = async (x: number, y: number) => {
  const trackId = findTrackAtPoint(x, y, currentFrame.value);

  if (trackId) {
    // Select this track for editing
    selectTrackForEditing(
      trackId,
      stageConfig.value.width,
      stageConfig.value.height
    );

    // Get the color of selected track
    const color = getSelectedTrackColor();
    if (color) {
      selectedSegmentationColor.value = color;
    }

    // Position toolbar at click location
    selectedSegmentationPosition.value = { x, y };
    showSegmentationToolbar.value = true;

    // Update timeline selection
    selectedBrushTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, "brush");

    // Force re-render to show selection with reduced opacity
    currentDisplayFrame = -1;
    await renderBrushAnnotations(currentFrame.value);
  } else {
    // Clicked outside any segmentation - deselect
    if (showSegmentationToolbar.value) {
      await handleDeselectSegmentation();
    }
  }
};

const saveAnnotations = async () => {
  if (isSaving.value) return;

  const videoFileName = framesStore.videoFileName;
  if (!videoFileName) {
    console.error("No video file name available for saving");
    return;
  }

  isSaving.value = true;
  try {
    annotationStore.setVideoFileName(videoFileName);
    annotationStore.setAllTracks({
      bbox: bboxTracks.value,
      polygon: polygonTracks.value,
      skeleton: skeletonTracks.value,
      brush: brushTracks.value,
    });
    await annotationStore.save();
  } catch (error) {
    console.error("Failed to save annotations:", error);
  } finally {
    isSaving.value = false;
  }
};

const updateCursor = (pos: { x: number; y: number }) => {
  if (!brush.value) return;

  const cursorGroup = cursorGroupRef.value?.getNode();
  if (!cursorGroup) return;

  if (cursorShape.value) {
    cursorShape.value.destroy();
  }

  cursorShape.value = brush.value.createCursorShape(pos.x, pos.y, 1);
  cursorGroup.add(cursorShape.value);
  interactiveLayerRef.value?.getNode()?.batchDraw();
};

const updateAnnotationLayer = (
  offscreenCanvas: HTMLCanvasElement,
  frameNumber: number
) => {
  if (currentDisplayFrame === frameNumber) {
    return;
  }

  const brushGroup = brushAnnotationGroupRef.value?.getNode();
  if (!brushGroup) return;

  brushGroup.destroyChildren();

  // Use the displayCanvas for Konva rendering
  if (!displayCanvas) {
    initializeCanvases(stageConfig.value.width, stageConfig.value.height);
  }

  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreenCanvas, 0, 0);

  const konvaImage = new Konva.Image({
    image: displayCanvas!,
    x: 0,
    y: 0,
    width: stageConfig.value.width,
    height: stageConfig.value.height,
    listening: false,
    opacity: opacity.value,
  });

  brushGroup.add(konvaImage);
  currentDisplayFrame = frameNumber;
  annotationsLayerRef.value?.getNode()?.batchDraw();
};

/**
 * Update annotation layer with separate rendering for selected and hovered segmentations
 */
const updateAnnotationLayerWithSelectionAndHover = (
  nonSelectedCanvas: HTMLCanvasElement,
  selectedCanvas: HTMLCanvasElement | null,
  hoveredCanvas: HTMLCanvasElement | null,
  frameNumber: number
) => {
  const brushGroup = brushAnnotationGroupRef.value?.getNode();
  if (!brushGroup) return;

  brushGroup.destroyChildren();

  // Use the displayCanvas for Konva rendering
  if (!displayCanvas) {
    initializeCanvases(stageConfig.value.width, stageConfig.value.height);
  }

  // Render non-selected/non-hovered tracks at normal opacity
  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(nonSelectedCanvas, 0, 0);

  const nonSelectedImage = new Konva.Image({
    image: displayCanvas!,
    x: 0,
    y: 0,
    width: stageConfig.value.width,
    height: stageConfig.value.height,
    listening: false,
    opacity: opacity.value,
  });
  brushGroup.add(nonSelectedImage);

  // Render hovered track with brightness boost effect
  if (hoveredCanvas) {
    const hoveredDisplayCanvas = document.createElement("canvas");
    hoveredDisplayCanvas.width = stageConfig.value.width;
    hoveredDisplayCanvas.height = stageConfig.value.height;
    const hoveredCtx = hoveredDisplayCanvas.getContext("2d", { alpha: true })!;
    hoveredCtx.imageSmoothingEnabled = false;
    hoveredCtx.drawImage(hoveredCanvas, 0, 0);

    const hoveredImage = new Konva.Image({
      image: hoveredDisplayCanvas,
      x: 0,
      y: 0,
      width: stageConfig.value.width,
      height: stageConfig.value.height,
      listening: false,
      opacity: Math.min(1, opacity.value * 1.3), // Slightly brighter on hover
    });
    brushGroup.add(hoveredImage);

    // Add a subtle white outline/glow effect for hover
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = stageConfig.value.width;
    glowCanvas.height = stageConfig.value.height;
    const glowCtx = glowCanvas.getContext("2d", { alpha: true })!;
    glowCtx.imageSmoothingEnabled = false;

    // Create outline by drawing the mask slightly expanded with white
    glowCtx.filter = "blur(2px)";
    glowCtx.drawImage(hoveredCanvas, 0, 0);
    glowCtx.globalCompositeOperation = "source-in";
    glowCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    glowCtx.fillRect(0, 0, glowCanvas.width, glowCanvas.height);

    const glowImage = new Konva.Image({
      image: glowCanvas,
      x: 0,
      y: 0,
      width: stageConfig.value.width,
      height: stageConfig.value.height,
      listening: false,
      opacity: 0.4,
    });
    brushGroup.add(glowImage);
  }

  // Render selected track with reduced opacity (50% of normal)
  if (selectedCanvas) {
    const selectedDisplayCanvas = document.createElement("canvas");
    selectedDisplayCanvas.width = stageConfig.value.width;
    selectedDisplayCanvas.height = stageConfig.value.height;
    const selectedCtx = selectedDisplayCanvas.getContext("2d", {
      alpha: true,
    })!;
    selectedCtx.imageSmoothingEnabled = false;
    selectedCtx.drawImage(selectedCanvas, 0, 0);

    const selectedImage = new Konva.Image({
      image: selectedDisplayCanvas,
      x: 0,
      y: 0,
      width: stageConfig.value.width,
      height: stageConfig.value.height,
      listening: false,
      opacity: opacity.value * 0.5, // 50% reduced opacity for selected
    });
    brushGroup.add(selectedImage);
  }

  currentDisplayFrame = frameNumber;
  annotationsLayerRef.value?.getNode()?.batchDraw();
};

const updateAllLayersOpacity = () => {
  const annotationsLayer = annotationsLayerRef.value?.getNode();
  if (annotationsLayer) {
    const updateChildOpacity = (node: any) => {
      if (node.opacity && node.name() !== "transformer") {
        node.opacity(opacity.value);
      }
      if (node.children) {
        node.children.forEach(updateChildOpacity);
      }
    };
    annotationsLayer.children?.forEach(updateChildOpacity);
    annotationsLayer.batchDraw();
  }
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

const loadAnnotationsFromStore = async () => {
  let videoFileName = framesStore.videoFileName;

  if (!videoFileName) {
    videoFileName = annotationStore.videoFileName;
  }

  if (!videoFileName) {
    console.warn(
      "No video filename available, skipping annotation load. Please clear cache and re-extract video."
    );
    return;
  }

  if (!framesStore.videoFileName) {
    framesStore.setVideoFileName(videoFileName);
  }

  try {
    await annotationStore.load(videoFileName);

    bboxTracks.value = new Map(annotationStore.bboxTracks);
    polygonTracks.value = new Map(annotationStore.polygonTracks);
    skeletonTracks.value = new Map(annotationStore.skeletonTracks);
    brushTracks.value = new Map(annotationStore.brushTracks);

    await renderFrame(currentFrame.value);
  } catch (error) {
    console.error("Failed to load annotations:", error);
  }
};

onMounted(async () => {
  if (!framesStore.hasFrames) {
    const hasCached = await framesStore.checkCache();

    if (hasCached) {
      const loaded = await framesStore.loadFromCache();

      if (loaded) {
        await initializePlayer();
        await loadAnnotationsFromStore();
        return;
      }
    }

    router.push("/");
    return;
  }

  await initializePlayer();
  await loadAnnotationsFromStore();
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
  const brushGroup = brushAnnotationGroupRef.value?.getNode();
  if (!brushGroup) return;

  const images = brushGroup.getChildren();
  images.forEach((img: any) => {
    img.opacity(opacity.value);
  });
  annotationsLayerRef.value?.getNode()?.batchDraw();
});

watch(mode, async (_newMode, oldMode) => {
  if (tempBrushStrokes.value.length > 0 && oldMode === "brush") {
    await handleClearStrokes();
  }
});

watch(currentFrame, async (newFrame, _oldFrame) => {
  if (
    tempBrushStrokes.value.length > 0 &&
    bufferFrame.value !== null &&
    newFrame !== bufferFrame.value
  ) {
    await handleClearStrokes();
  }
});

// Re-render when hover state changes to show visual feedback
watch(hoveredBrushTrackId, async () => {
  if (framesLoaded.value && !isDrawing.value) {
    currentDisplayFrame = -1; // Force re-render
    await renderBrushAnnotations(currentFrame.value);
  }
});
</script>

<style scoped>
.frame-player {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100%;
}

.main-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  position: relative;
}

/* Vertical Toolbar */
.vertical-toolbar {
  display: flex;
  flex-direction: column;
  background: #2d3748;
  border-radius: 12px;
  padding: 12px;
  gap: 8px;
  min-width: 100px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toolbar-title {
  font-size: 11px;
  font-weight: 600;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.toolbar-divider {
  height: 1px;
  background: #4a5568;
  margin: 8px 0;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  font-weight: 500;
}

.tool-btn:hover {
  background: #4a5568;
  color: white;
}

.tool-btn.active {
  background: #4299e1;
  color: white;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.delete-btn {
  color: #fc8181;
}

.tool-btn.delete-btn:hover:not(:disabled) {
  background: #e53e3e;
  color: white;
}

.tool-btn svg {
  flex-shrink: 0;
}

/* Size and Opacity Controls */
.size-control,
.opacity-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px;
}

.vertical-slider {
  width: 80px;
  cursor: pointer;
}

.size-value,
.opacity-value {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

/* Color Picker in Toolbar */
.vertical-toolbar .color-picker {
  width: 100%;
  height: 32px;
  border: 2px solid #4a5568;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: transparent;
}

.vertical-toolbar .color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.vertical-toolbar .color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

/* Canvas Container */
.canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Right Panel for BrushMergePopup - positioned absolutely to not shift canvas */
.right-panel {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%) translateX(100%);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 100;
  pointer-events: none;
}

.right-panel.visible {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
  pointer-events: auto;
  margin-right: 16px;
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

/* Playback Controls */
.playback-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #2d3748;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-wrap: wrap;
}

.playback-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  background: #4a5568;
  color: white;
}

.playback-btn:hover {
  background: #5a6778;
  transform: translateY(-1px);
}

.playback-btn:active {
  transform: translateY(0);
}

.playback-btn.play-btn {
  background: #48bb78;
  padding: 10px 30px;
}

.playback-btn.play-btn:hover {
  background: #38a169;
}

.frame-info {
  color: #a0aec0;
  font-size: 14px;
  font-weight: 500;
  padding: 0 10px;
  min-width: 140px;
  text-align: center;
}

.playback-divider {
  width: 1px;
  height: 24px;
  background: #4a5568;
}

/* Zoom Controls */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.zoom-label {
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
  min-width: 45px;
  text-align: right;
}

.utility-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  background: #4a5568;
  color: white;
}

.utility-btn:hover {
  background: #5a6778;
}

.utility-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.utility-btn.clear-cache-btn {
  background: #6b7280;
}

.utility-btn.clear-cache-btn:hover:not(:disabled) {
  background: #4b5563;
}

/* Auto Suggest Toggle */
.auto-suggest-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  background: #4a5568;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #a0aec0;
  transition: all 0.2s;
}

.auto-suggest-toggle:hover {
  background: #5a6778;
}

.auto-suggest-toggle input {
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.auto-suggest-toggle input:checked + span {
  color: #48bb78;
}

/* Legacy styles for backward compatibility */
.keyframe-nav-btn {
  padding: 6px 12px !important;
  font-size: 12px;
}

/* Timeline Scrubber */
.timeline-scrubber-container {
  padding: 8px 16px;
  background: #1a1a2e;
  border-radius: 8px;
}

.timeline-scrubber {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #16213e;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.timeline-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #e94560;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.timeline-scrubber::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #e94560;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
