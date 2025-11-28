<template>
  <div class="frame-player">
    <div class="main-content">
      <div class="class-manager-panel">
        <AnnotationClassManager
          v-model="annotationClasses"
          v-model:selectedClassId="selectedClassId"
          @select="handleClassSelect"
          @add="handleClassAdd"
          @delete="handleClassDelete"
        />
      </div>
      <VerticalToolbar
        v-model:mode="mode"
        v-model:brushSize="brushSize"
        v-model:bboxColor="bboxColor"
        v-model:polygonColor="polygonColor"
        v-model:skeletonColor="skeletonColor"
        v-model:opacity="opacity"
        :tools-disabled="toolsDisabled"
        :can-delete="!!timelineRef?.selectedTrackId"
        @delete="handleDeleteSelected"
        @update:mode="setMode"
        @update:brush-size="handleSizeChange"
        @update:opacity="handleOpacityChange"
      />

      <BaseCanvas
        v-if="framesLoaded"
        ref="baseCanvasRef"
        :fill-container="true"
        :enable-zoom="true"
        :enable-pan="true"
        :style="{ minHeight: imageSize.height + 'px' }"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleCanvasMouseMove"
        @mouseup="handleCanvasMouseUp"
        @mouseleave="handleCanvasMouseLeave"
        @dblclick="handleCanvasDoubleClick"
        @wheel="handleCanvasWheel"
        @zoom-change="handleZoomChange"
        @stage-ready="handleStageReady"
        @container-resize="handleContainerResize"
      >
        <template #background>
          <v-image :config="imageConfig" />
        </template>

        <template #annotations>
          <BrushAnnotationLayer
            ref="brushAnnotationLayerRef"
            :non-selected-canvas="brushAnnotationCanvasData.nonSelectedCanvas"
            :selected-canvas="brushAnnotationCanvasData.selectedCanvas"
            :hovered-canvas="brushAnnotationCanvasData.hoveredCanvas"
            :opacity="opacity"
            :stage-width="containerSize.width"
            :stage-height="containerSize.height"
            :offset-x="0"
            :offset-y="0"
            :frame-number="brushAnnotationCanvasData.frameNumber"
            :render-version="brushAnnotationCanvasData.renderVersion"
            @render-complete="handleBrushAnnotationRenderComplete"
          />

          <v-group ref="annotationOffsetGroupRef" :config="{ x: imageOffset.x, y: imageOffset.y }">
            <BoundingBoxLayer
              ref="bboxLayerRef"
              :bboxes="currentFrameBboxes"
              :selected-track-id="selectedBboxTrackId"
              :mode="mode"
              :opacity="opacity"
              :classes="annotationClasses"
              @click="handleBboxLayerClick"
              @drag-end="handleBboxLayerDragEnd"
              @transform-end="handleBboxTransformEnd"
            />

            <PolygonLayer
              ref="polygonLayerRef"
              :polygons="currentFramePolygons"
              :selected-track-id="selectedPolygonTrackId"
              :mode="mode"
              :opacity="opacity"
              @click="handlePolygonLayerClick"
              @drag-end="handlePolygonLayerDragEnd"
              @vertex-drag-move="handlePolygonLayerVertexDragMove"
              @vertex-drag-end="handlePolygonLayerVertexDragEnd"
              @vertex-click="handlePolygonLayerVertexClick"
            />

            <SkeletonLayer
              ref="skeletonLayerRef"
              :skeletons="currentFrameSkeletons"
              :selected-track-id="selectedSkeletonTrackId"
              :mode="mode"
              :opacity="opacity"
              @click="handleSkeletonLayerClick"
              @drag-end="handleSkeletonLayerDragEnd"
              @keypoint-drag-start="handleSkeletonLayerKeypointDragStart"
              @keypoint-drag-move="handleSkeletonLayerKeypointDragMove"
              @keypoint-drag-end="handleSkeletonLayerKeypointDragEnd"
              @keypoint-click="handleSkeletonLayerKeypointClick"
            />
          </v-group>
        </template>

        <template #interactive>
          <BrushPreviewLayer
            ref="brushPreviewLayerRef"
            :stage-width="imageSize.width"
            :stage-height="imageSize.height"
          />
          <v-group
            ref="cursorGroupRef"
            :config="{ x: imageOffset.x, y: imageOffset.y }"
          ></v-group>
        </template>

        <template #loading> Loading frames... </template>
      </BaseCanvas>
      <div v-else class="canvas-container">
        <div class="loading">Loading frames...</div>
      </div>
    </div>

    <ClassSelector
      v-show="showClassSelector"
      :classes="annotationClasses"
      :initial-position="classSelectorPosition"
      :filter-markup-type="classSelectorMarkupType"
      :initial-class="classSelectorInitialClass"
      @select="handleClassSelectorSelect"
      @create="handleClassSelectorCreate"
      @close="handleClassSelectorClose"
      @delete="handleClassSelectorDelete"
    />

    <PlaybackControls
      :current-frame="currentFrame"
      :total-frames="physicalFrames"
      :is-playing="isPlaying"
      :zoom-level="zoomLevel"
      v-model:auto-suggest="autoSuggest"
      :is-clearing-cache="isClearingCache"
      @previous-frame="previousFrame"
      @next-frame="nextFrame"
      @toggle-play="togglePlay"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @clear-cache="handleClearCache"
      @scrub="jumpToFrame"
    />

    <FramePlayerTimeline
      ref="timelineRef"
      :current-frame="currentFrame"
      :total-frames="physicalFrames"
      :fps="30"
      :bbox-tracks="visibleBboxTracks"
      :polygon-tracks="visiblePolygonTracks"
      :skeleton-tracks="visibleSkeletonTracks"
      :brush-tracks="visibleBrushTracks"
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
import {
  KonvaBrush,
  BoundingBoxLayer,
  PolygonLayer,
  SkeletonLayer,
  BrushAnnotationLayer,
  BrushPreviewLayer,
  BBoxTool,
  PolygonTool,
  SkeletonTool,
  type BoundingBox,
  type Polygon,
  type Skeleton,
} from "../../components/layers";
import { useFramesStore } from "../../stores/framesStore";
import { useAnnotationStore } from "../../stores/annotationStore";
import { useBoundingBoxTracks } from "../../composables/useBoundingBoxTracks";
import { usePolygonTracks } from "../../composables/usePolygonTracks";
import { useSkeletonTracks } from "../../composables/useSkeletonTracks";
import {
  useBrushTracks,
  type BrushTrack,
} from "../../composables/useBrushTracks";
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
import type { ToolClass } from "../../types/contours";
import FramePlayerTimeline from "../../components/FramePlayerTimeline/index.vue";
import VerticalToolbar from "../../components/VerticalToolbar/index.vue";
import type { ToolMode } from "../../components/VerticalToolbar/index.vue";
import PlaybackControls from "../../components/PlaybackControls/index.vue";
import { BaseCanvas } from "../../components/BaseCanvas";
import type {
  CanvasMouseEvent,
  CanvasWheelEvent,
} from "../../components/BaseCanvas";
import AnnotationClassManager from "../../components/AnnotationClassManager.vue";
import type { AnnotationClass } from "../../components/AnnotationClassManager.vue";
import ClassSelector from "../../components/ClassSelector.vue";
import type {
  TrackType,
  PendingBbox,
  PendingPolygon,
  PendingSkeleton,
  PendingBrush,
  TempBrushStroke,
  ColocatedPoint,
} from "./types";
import {
  HOVER_THROTTLE_MS,
  MAX_WIDTH,
  MAX_HEIGHT,
  COLOCATED_EPSILON,
  MarkupType,
  TrackType as TrackTypeEnum,
  ToolMode as ToolModeEnum,
  SegmentationEditMode as SegEditMode,
  type MarkupTypeValue,
} from "./enums";
import { useLayerRefs } from "./layers";
import {
  clearCanvas,
  applyColorToCanvas,
  binarizeAlpha,
  createOffscreenCanvas,
  initializeCanvases,
  loadImage,
  findColocatedPoints,
  findNearbySkeletonPoint,
} from "./utils";

const router = useRouter();
const framesStore = useFramesStore();
const annotationStore = useAnnotationStore();

const baseCanvasRef = ref<InstanceType<typeof BaseCanvas> | null>(null);
const stageRef = ref<any>(null);
const {
  backgroundLayerRef,
  annotationsLayerRef,
  interactiveLayerRef,
  annotationOffsetGroupRef,
  bboxLayerRef,
  polygonLayerRef,
  skeletonLayerRef,
  brushAnnotationLayerRef,
  brushPreviewLayerRef,
  cursorGroupRef,
} = useLayerRefs();
const containerRef = ref<HTMLDivElement | null>(null);
const timelineRef = ref<InstanceType<typeof FramePlayerTimeline> | null>(null);

const framesLoaded = ref(false);
const currentFrame = ref(0);
const currentImage = ref<HTMLImageElement | null>(null);
const brush = ref<KonvaBrush | null>(null);

// Brush annotation layer display data
// renderVersion is incremented to force re-render when canvas content changes
let brushRenderVersion = 0;
const brushAnnotationCanvasData = ref<{
  nonSelectedCanvas: HTMLCanvasElement | null;
  selectedCanvas: HTMLCanvasElement | null;
  hoveredCanvas: HTMLCanvasElement | null;
  frameNumber: number;
  renderVersion: number;
}>({
  nonSelectedCanvas: null,
  selectedCanvas: null,
  hoveredCanvas: null,
  frameNumber: -1,
  renderVersion: 0,
});

const mode = ref<ToolMode>(ToolModeEnum.PAN);
const brushSize = ref(20);
const brushColor = ref("#FF0000");
const bboxColor = ref("#FF0000");
const polygonColor = ref("#00FF00");
const skeletonColor = ref("#0000FF");
const opacity = ref(0.7);
const zoomLevel = ref(1);
const autoSuggest = ref(false);

const annotationClasses = ref<AnnotationClass[]>([]);
const selectedClassId = ref<string | null>(null);

const hasBboxClasses = computed(() =>
  annotationClasses.value.some((c) => c.markupType === MarkupType.BBOX)
);
const hasPolygonClasses = computed(() =>
  annotationClasses.value.some((c) => c.markupType === MarkupType.POLYGON)
);
const hasSkeletonClasses = computed(() =>
  annotationClasses.value.some((c) => c.markupType === MarkupType.SKELETON)
);
const hasMaskClasses = computed(() =>
  annotationClasses.value.some((c) => c.markupType === MarkupType.MASK)
);

const visibleBboxTracks = computed(() =>
  hasBboxClasses.value ? bboxTracks.value : new Map()
);
const visiblePolygonTracks = computed(() =>
  hasPolygonClasses.value ? polygonTracks.value : new Map()
);
const visibleSkeletonTracks = computed(() =>
  hasSkeletonClasses.value ? skeletonTracks.value : new Map()
);
const visibleBrushTracks = computed(
  (): Map<string, BrushTrack> =>
    hasMaskClasses.value ? brushTracks.value : new Map<string, BrushTrack>()
);

// Check if we're editing an existing segmentation
const isEditingSegmentation = computed(
  () =>
    editingBrushTrackId.value !== null || selectedBrushTrackId.value !== null
);

// Check if tools should be disabled (when editing segmentation or ClassSelector is open)
const toolsDisabled = computed(
  () => isEditingSegmentation.value || showClassSelector.value
);

const handleClassSelect = (cls: AnnotationClass) => {
  selectedClassId.value = cls.id;
  if (cls.markupType === MarkupType.BBOX) {
    bboxColor.value = cls.color;
    setMode(ToolModeEnum.BBOX);
  } else if (cls.markupType === MarkupType.MASK) {
    brushColor.value = cls.color;
    brush.value?.changeColor(cls.color);
    setMode(ToolModeEnum.BRUSH);
  } else if (cls.markupType === MarkupType.POLYGON) {
    polygonColor.value = cls.color;
    setMode(ToolModeEnum.POLYGON);
  } else if (cls.markupType === MarkupType.SKELETON) {
    skeletonColor.value = cls.color;
    setMode(ToolModeEnum.SKELETON);
  }
};

const handleClassAdd = () => {
  saveAnnotations();
};

const handleClassDelete = () => {
  saveAnnotations();
};

// Class Selector state
const showClassSelector = ref(false);
const classSelectorMarkupType = ref<MarkupTypeValue>(MarkupType.BBOX);
const classSelectorPosition = ref({ x: 100, y: 100 });
const classSelectorInitialClass = ref<AnnotationClass | null>(null);
const editingBboxTrackId = ref<string | null>(null);
const editingPolygonTrackId = ref<string | null>(null);
const editingSkeletonTrackId = ref<string | null>(null);
const editingBrushTrackId = ref<string | null>(null);

const pendingBbox = ref<PendingBbox | null>(null);
const pendingPolygon = ref<PendingPolygon | null>(null);
const pendingSkeleton = ref<PendingSkeleton | null>(null);
const pendingBrush = ref<PendingBrush | null>(null);

const getNextClassValue = () => {
  if (annotationClasses.value.length === 0) return 0;
  const maxValue = Math.max(
    ...annotationClasses.value.map((c) => c.value ?? 0)
  );
  return maxValue + 1;
};

const handleClassSelectorSelect = (cls: AnnotationClass) => {
  selectedClassId.value = cls.id;

  // Handle editing existing bbox class
  if (editingBboxTrackId.value) {
    const track = bboxTracks.value.get(editingBboxTrackId.value);
    if (track) {
      for (const [frame, bbox] of track.keyframes) {
        track.keyframes.set(frame, {
          ...bbox,
          color: cls.color,
          value: cls.value,
        });
      }
      track.color = cls.color;
      track.classId = cls.value;
      bboxTracks.value.set(editingBboxTrackId.value, { ...track });
    }
    editingBboxTrackId.value = null;
    classSelectorInitialClass.value = null;
    showClassSelector.value = false;
    saveAnnotations();
    return;
  }

  // Handle editing existing polygon class
  if (editingPolygonTrackId.value) {
    const track = polygonTracks.value.get(editingPolygonTrackId.value);
    if (track) {
      for (const [frame, polygon] of track.keyframes) {
        track.keyframes.set(frame, {
          ...polygon,
          color: cls.color,
          value: cls.value,
        });
      }
      track.color = cls.color;
      track.classId = cls.value;
      polygonTracks.value.set(editingPolygonTrackId.value, { ...track });
    }
    editingPolygonTrackId.value = null;
    classSelectorInitialClass.value = null;
    showClassSelector.value = false;
    saveAnnotations();
    return;
  }

  // Handle editing existing skeleton class
  if (editingSkeletonTrackId.value) {
    const track = skeletonTracks.value.get(editingSkeletonTrackId.value);
    if (track) {
      for (const [frame, skeleton] of track.keyframes) {
        track.keyframes.set(frame, {
          ...skeleton,
          color: cls.color,
          value: cls.value,
        });
      }
      track.color = cls.color;
      track.classId = cls.value;
      skeletonTracks.value.set(editingSkeletonTrackId.value, { ...track });
    }
    editingSkeletonTrackId.value = null;
    classSelectorInitialClass.value = null;
    showClassSelector.value = false;
    saveAnnotations();
    return;
  }

  // Handle pending mask drag confirmation
  if (pendingMaskDrag.value) {
    const { trackId, dx, dy, frame } = pendingMaskDrag.value;

    // Now actually update the mask position in the data
    updateMaskPosition(trackId, dx, dy, frame, autoSuggest.value);

    // Clear pending drag state
    pendingMaskDrag.value = null;
    editingBrushTrackId.value = null;
    classSelectorInitialClass.value = null;
    showClassSelector.value = false;

    // Re-render and save
    currentDisplayFrame = -1;
    renderFrame(frame);
    saveAnnotations();
    return;
  }

  // Handle editing existing brush class
  if (editingBrushTrackId.value) {
    const track = brushTracks.value.get(editingBrushTrackId.value);
    if (track) {
      for (const [frame, keyframeData] of track.keyframes) {
        // Update color in each mask
        const updatedMasks = keyframeData.map((mask: any) => ({
          ...mask,
          color: cls.color,
          className: cls.name,
          classID: cls.value,
        }));
        track.keyframes.set(frame, updatedMasks);
      }
      brushTracks.value.set(editingBrushTrackId.value, { ...track });
    }
    editingBrushTrackId.value = null;
    classSelectorInitialClass.value = null;
    showClassSelector.value = false;
    // Re-render brush annotations with new color
    renderFrame(currentFrame.value);
    saveAnnotations();
    return;
  }

  if (pendingBbox.value) {
    const bbox = pendingBbox.value;
    const trackId = createBboxTrack(
      bbox.frame,
      {
        id: `bbox_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        rotation: bbox.rotation,
        color: cls.color,
        value: cls.value,
      },
      undefined,
      physicalFrames.value
    );
    selectedBboxTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, TrackTypeEnum.BBOX);
    pendingBbox.value = null;
    saveAnnotations();
  }

  if (pendingPolygon.value) {
    const polygon = pendingPolygon.value;
    const trackId = createPolygonTrack(
      polygon.frame,
      {
        id: `polygon_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 11)}`,
        points: polygon.points,
        color: cls.color,
        value: cls.value,
      },
      undefined,
      physicalFrames.value
    );
    selectedPolygonTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, TrackTypeEnum.POLYGON);
    pendingPolygon.value = null;
    saveAnnotations();
  }

  if (pendingSkeleton.value) {
    const skeleton = pendingSkeleton.value;
    const trackId = createSkeletonTrack(
      skeleton.frame,
      {
        id: `skeleton_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 11)}`,
        points: skeleton.points,
        color: cls.color,
        value: cls.value,
      },
      undefined,
      physicalFrames.value
    );
    selectedSkeletonTrackId.value = trackId;
    timelineRef.value?.selectTrack(trackId, TrackTypeEnum.SKELETON);
    pendingSkeleton.value = null;
    saveAnnotations();
  }

  if (pendingBrush.value) {
    const brushData = pendingBrush.value;

    // Apply selected class color to the canvas
    applyColorToCanvas(brushData.canvas, cls.color);

    // Binarize alpha to ensure clean RLE encoding
    binarizeAlpha(brushData.canvas);

    // Convert canvas to RLE-based MaskData
    const maskData = canvasToMaskData(
      brushData.canvas,
      cls.color,
      cls.name,
      cls.value
    );

    if (maskData) {
      // Check if mask has content
      const hasContent = maskData.rle.some(
        (val, idx) => idx % 2 === 1 && val > 0
      );

      if (hasContent) {
        // Create array with single mask
        const masks: MaskData[] = [maskData];

        // Create track with the RLE mask data
        const trackId = createBrushTrack(
          brushData.frame,
          masks,
          cls.name,
          physicalFrames.value
        );
        selectedBrushTrackId.value = null;
        timelineRef.value?.selectTrack(trackId, TrackTypeEnum.BRUSH);

        // Render the new mask to display
        if (!workingCanvas || !displayCanvas) {
          initCanvases();
        }
        clearCanvas(workingCanvas!);
        renderMaskToCanvas(maskData, workingCanvas!, false, 1, imageOffset.value.x, imageOffset.value.y);

        // Add new mask on top of existing displayCanvas
        const displayCtx = displayCanvas!.getContext("2d")!;
        displayCtx.drawImage(workingCanvas!, 0, 0);

        // Update Konva display via component
        brushAnnotationCanvasData.value = {
          nonSelectedCanvas: displayCanvas,
          selectedCanvas: null,
          hoveredCanvas: null,
          frameNumber: brushData.frame,
          renderVersion: ++brushRenderVersion,
        };

        currentDisplayFrame = brushData.frame;
        saveAnnotations();
      }
    }

    // Clear temp strokes and pending brush state
    tempBrushStrokes.value = [];
    tempStrokesCanvas.value = null;
    tempStrokesConvertedToCanvas.value = false;
    tempStrokesEditMode.value = SegEditMode.BRUSH;
    bufferFrame.value = null;
    pendingBrush.value = null;
    // Deselect any editing track to re-enable other tools
    selectedBrushTrackId.value = null;
    editingBrushTrackId.value = null;
  }

  showClassSelector.value = false;
  classSelectorInitialClass.value = null;
};

const handleBrushAnnotationRenderComplete = () => {
  annotationsLayerRef.value?.getNode()?.batchDraw();
};

const handleClassSelectorCreate = (
  classData: Omit<AnnotationClass, "id" | "value">
) => {
  const newClass: AnnotationClass = {
    id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name: classData.name,
    color: classData.color,
    markupType: classData.markupType,
    value: getNextClassValue(),
  };
  annotationClasses.value.push(newClass);
  handleClassSelectorSelect(newClass);
  // Save annotations after class creation to persist the new class
  saveAnnotations();
};

const handleClassSelectorClose = () => {
  pendingBbox.value = null;
  pendingPolygon.value = null;
  pendingSkeleton.value = null;
  editingBboxTrackId.value = null;
  editingPolygonTrackId.value = null;
  editingSkeletonTrackId.value = null;
  editingBrushTrackId.value = null;
  classSelectorInitialClass.value = null;
  showClassSelector.value = false;

  // Clean up pending mask drag if cancelled - revert to original position
  if (pendingMaskDrag.value) {
    const { frame } = pendingMaskDrag.value;
    pendingMaskDrag.value = null;
    // Re-render to show original position (without the drag offset)
    currentDisplayFrame = -1;
    renderFrame(frame);
  }

  // Clean up pending brush if cancelled
  if (pendingBrush.value) {
    pendingBrush.value = null;
    tempBrushStrokes.value = [];
    tempStrokesCanvas.value = null;
    tempStrokesConvertedToCanvas.value = false;
    tempStrokesEditMode.value = SegEditMode.BRUSH;
    bufferFrame.value = null;
    // Re-render to clear temp strokes from display
    renderFrame(currentFrame.value);
  }

  if (bboxTool) {
    bboxTool.cancelDrawing();
  }
  if (polygonTool) {
    polygonTool.cancelDrawing();
  }
  if (skeletonTool) {
    skeletonTool.cancelDrawing();
  }
};

const handleClassSelectorDelete = () => {
  // Delete the annotation that was being edited or is pending
  if (editingBboxTrackId.value) {
    deleteBboxTrack(editingBboxTrackId.value);
    editingBboxTrackId.value = null;
    selectedBboxTrackId.value = null;
    saveAnnotations();
  } else if (editingPolygonTrackId.value) {
    deletePolygonTrack(editingPolygonTrackId.value);
    editingPolygonTrackId.value = null;
    selectedPolygonTrackId.value = null;
    saveAnnotations();
  } else if (editingSkeletonTrackId.value) {
    deleteSkeletonTrack(editingSkeletonTrackId.value);
    editingSkeletonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    saveAnnotations();
  } else if (editingBrushTrackId.value) {
    deleteBrushTrack(editingBrushTrackId.value);
    editingBrushTrackId.value = null;
    selectedBrushTrackId.value = null;
    saveAnnotations();
    renderFrame(currentFrame.value);
  }

  // Clear any pending annotations (newly drawn but not yet saved)
  pendingBbox.value = null;
  pendingPolygon.value = null;
  pendingSkeleton.value = null;

  // Clean up pending brush
  if (pendingBrush.value) {
    pendingBrush.value = null;
    tempBrushStrokes.value = [];
    tempStrokesCanvas.value = null;
    tempStrokesConvertedToCanvas.value = false;
    tempStrokesEditMode.value = SegEditMode.BRUSH;
    bufferFrame.value = null;
    renderFrame(currentFrame.value);
  }

  // Cancel any in-progress drawing tools
  if (bboxTool) {
    bboxTool.cancelDrawing();
  }
  if (polygonTool) {
    polygonTool.cancelDrawing();
  }
  if (skeletonTool) {
    skeletonTool.cancelDrawing();
  }

  classSelectorInitialClass.value = null;
  showClassSelector.value = false;

  // Update transformer after state changes
  nextTick(() => {
    if (bboxTool) {
      bboxTool.updateTransformerSelection(null);
    }
  });
};

const getScreenPositionFromCanvas = (
  canvasX: number,
  canvasY: number
): { x: number; y: number } => {
  const stage = stageRef.value?.getStage();
  const container = containerRef.value;
  if (!stage || !container) {
    return { x: 100, y: 100 };
  }
  const containerRect = container.getBoundingClientRect();
  const stagePos = stage.position();
  const scale = stage.scaleX();

  const screenX = containerRect.left + canvasX * scale + stagePos.x;
  const screenY = containerRect.top + canvasY * scale + stagePos.y;

  return { x: screenX + 10, y: screenY + 10 };
};

const showClassSelectorForAnnotation = (
  markupType: MarkupTypeValue,
  position?: { x: number; y: number }
) => {
  classSelectorMarkupType.value = markupType;
  if (position) {
    classSelectorPosition.value = position;
  }
  showClassSelector.value = true;
};

const isDrawing = ref(false);
const isPanning = ref(false);
const isPlaying = ref(false);
const isClearingCache = ref(false);
const isSaving = ref(false);
const cursorShape = ref<Konva.Circle | null>(null);
const drawingStartFrame = ref<number | null>(null);

const lastPanPoint = ref<{ x: number; y: number } | null>(null);

// Mask dragging state
const isDraggingMask = ref(false);
const draggingMaskTrackId = ref<string | null>(null);
const maskDragStartPoint = ref<{ x: number; y: number } | null>(null);
const maskDragCurrentDelta = ref<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

// Pending mask drag (waiting for ClassSelector confirmation)
const pendingMaskDrag = ref<{
  trackId: string;
  dx: number;
  dy: number;
  frame: number;
} | null>(null);

// Hover detection throttling (20 FPS to balance responsiveness vs performance)
let lastHoverCheckTime = 0;

const tempBrushStrokes = ref<TempBrushStroke[]>([]);
const showBrushMergePopup = ref(false);
const mergeColor = ref("#FF0000");
const bufferFrame = ref<number | null>(null);

// Temp strokes canvas editing state (for eraser in BrushMergePopup)
const tempStrokesCanvas = ref<HTMLCanvasElement | null>(null);
const tempStrokesEditMode = ref<
  typeof SegEditMode.BRUSH | typeof SegEditMode.ERASER
>(SegEditMode.BRUSH);
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

const initCanvases = () => {
  const canvases = initializeCanvases(
    containerSize.value.width,
    containerSize.value.height
  );
  workingCanvas = canvases.workingCanvas;
  displayCanvas = canvases.displayCanvas;
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
  getSelectedTrackColor,
  updateMaskPosition,
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

let animationId: number | null = null;
let lastFrameTime = 0;

// Container dimensions (from ResizeObserver)
const containerSize = ref({
  width: 800,
  height: 800,
});

// Image dimensions (actual scaled image size)
const imageSize = ref({
  width: 800,
  height: 800,
});

// Offset to center image within container
const imageOffset = computed(() => ({
  x: Math.max(0, (containerSize.value.width - imageSize.value.width) / 2),
  y: Math.max(0, (containerSize.value.height - imageSize.value.height) / 2),
}));

const frames = computed(() => framesStore.allFrames.map((f) => f.imageUrl));
const physicalFrames = computed(() => framesStore.totalFrames);

const imageConfig = computed(() => ({
  image: currentImage.value,
  x: imageOffset.value.x,
  y: imageOffset.value.y,
  width: imageSize.value.width,
  height: imageSize.value.height,
}));

const isPolygonDrawing = ref(false);
const isSkeletonDrawing = ref(false);

const currentFrameBboxes = computed(() => {
  const result: BoundingBox[] = [];
  // Only show saved bboxes if there are bbox classes
  if (hasBboxClasses.value) {
    for (const [trackId] of bboxTracks.value) {
      const box = getBoxAtFrame(trackId, currentFrame.value);
      if (box) {
        result.push(box);
      }
    }
  }
  // Always show pending bbox when ClassSelector is open (even without classes yet)
  if (pendingBbox.value && showClassSelector.value) {
    result.push({
      id: "pending_bbox",
      x: pendingBbox.value.x,
      y: pendingBbox.value.y,
      width: pendingBbox.value.width,
      height: pendingBbox.value.height,
      rotation: pendingBbox.value.rotation,
      color: bboxColor.value,
    });
  }
  return result;
});

const currentFramePolygons = computed(() => {
  const result: Polygon[] = [];
  // Only show saved polygons if there are polygon classes
  if (hasPolygonClasses.value) {
    for (const [trackId] of polygonTracks.value) {
      const polygon = getPolygonAtFrame(trackId, currentFrame.value);
      if (polygon) {
        result.push(polygon);
      }
    }
  }
  // Always show pending polygon when ClassSelector is open (even without classes yet)
  if (pendingPolygon.value && showClassSelector.value) {
    result.push({
      id: "pending_polygon",
      points: pendingPolygon.value.points,
      color: polygonColor.value,
    });
  }
  return result;
});

const currentFrameSkeletons = computed(() => {
  const result: Skeleton[] = [];
  // Only show saved skeletons if there are skeleton classes
  if (hasSkeletonClasses.value) {
    for (const [trackId] of skeletonTracks.value) {
      const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
      if (skeleton) {
        result.push(skeleton);
      }
    }
  }
  // Always show pending skeleton when ClassSelector is open (even without classes yet)
  if (pendingSkeleton.value && showClassSelector.value) {
    result.push({
      id: "pending_skeleton",
      points: pendingSkeleton.value.points,
      color: skeletonColor.value,
    });
  }
  return result;
});

const initializeBrush = async () => {
  brush.value = new KonvaBrush();
  await brush.value.initialize();
  brush.value.changeColor("#FF0000");
  brush.value.changeSize(brushSize.value);
  brush.value.changeOpacity(opacity.value);
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
    initCanvases();
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

  let selectedTrackCanvas: HTMLCanvasElement | null = null;
  if (selectedTrackIdValue && showSegmentationToolbar.value) {
    selectedTrackCanvas = document.createElement("canvas");
    selectedTrackCanvas.width = containerSize.value.width;
    selectedTrackCanvas.height = containerSize.value.height;
  }

  let hoveredTrackCanvas: HTMLCanvasElement | null = null;
  if (hoveredTrackIdValue && !showSegmentationToolbar.value) {
    hoveredTrackCanvas = document.createElement("canvas");
    hoveredTrackCanvas.width = containerSize.value.width;
    hoveredTrackCanvas.height = containerSize.value.height;
  }

  // Use visibleBrushTracks to respect hasMaskClasses visibility control
  for (const [trackId] of visibleBrushTracks.value) {
    const track = visibleBrushTracks.value.get(trackId);
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

    // Check if this track has a pending drag offset
    const hasPendingDrag =
      pendingMaskDrag.value &&
      pendingMaskDrag.value.trackId === trackId &&
      pendingMaskDrag.value.frame === frameIndex;
    const dragOffsetX = hasPendingDrag ? pendingMaskDrag.value!.dx : 0;
    const dragOffsetY = hasPendingDrag ? pendingMaskDrag.value!.dy : 0;

    const keyframeData = track.keyframes.get(frameIndex);
    if (keyframeData && keyframeData.length > 0) {
      if (isMaskData(keyframeData)) {
        if (hasPendingDrag) {
          // Render with drag offset applied to the mask coordinates
          const offsetMasks = keyframeData.map((mask) => ({
            ...mask,
            left: mask.left + dragOffsetX,
            top: mask.top + dragOffsetY,
            right: mask.right + dragOffsetX,
            bottom: mask.bottom + dragOffsetY,
          }));
          renderMasksToCanvas(offsetMasks, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
        } else {
          renderMasksToCanvas(keyframeData, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
        }
      } else {
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
          if (isMaskData(beforeData)) {
            if (hasPendingDrag) {
              // Render with drag offset applied to the mask coordinates
              const offsetMasks = beforeData.map((mask) => ({
                ...mask,
                left: mask.left + dragOffsetX,
                top: mask.top + dragOffsetY,
                right: mask.right + dragOffsetX,
                bottom: mask.bottom + dragOffsetY,
              }));
              renderMasksToCanvas(offsetMasks, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
            } else {
              renderMasksToCanvas(beforeData, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
            }
          } else {
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
    // Clear brush annotation via component
    brushAnnotationCanvasData.value = {
      nonSelectedCanvas: null,
      selectedCanvas: null,
      hoveredCanvas: null,
      frameNumber: frameIndex,
      renderVersion: ++brushRenderVersion,
    };
  }

  currentDisplayFrame = frameIndex;
};

/**
 * Render frame with a mask offset for drag preview
 * This renders the dragging mask at an offset position for visual feedback
 */
const renderFrameWithMaskOffset = async (
  frameIndex: number,
  dragTrackId: string,
  offsetX: number,
  offsetY: number
) => {
  if (!workingCanvas || !displayCanvas) {
    initCanvases();
  }

  clearCanvas(workingCanvas!);

  let hasAnnotations = false;

  const draggingTrackCanvas = document.createElement("canvas");
  draggingTrackCanvas.width = containerSize.value.width;
  draggingTrackCanvas.height = containerSize.value.height;

  // If there's a pending drag for this track, add its offset to the current drag offset
  // This allows continued dragging to adjust position from the pending state
  let totalOffsetX = offsetX;
  let totalOffsetY = offsetY;
  if (pendingMaskDrag.value && pendingMaskDrag.value.trackId === dragTrackId) {
    totalOffsetX += pendingMaskDrag.value.dx;
    totalOffsetY += pendingMaskDrag.value.dy;
  }

  // Render all visible brush tracks
  for (const [trackId] of visibleBrushTracks.value) {
    const track = visibleBrushTracks.value.get(trackId);
    if (!track) continue;

    // Check ranges
    const ranges = track.ranges || [];
    const isInRange =
      ranges.length === 0
        ? true
        : ranges.some(
            ([start, end]) => frameIndex >= start && frameIndex < end
          );
    if (!isInRange) continue;

    const isDragging = trackId === dragTrackId;
    const targetCanvas = isDragging ? draggingTrackCanvas : workingCanvas!;

    const keyframeData = track.keyframes.get(frameIndex);
    if (keyframeData && keyframeData.length > 0) {
      if (isMaskData(keyframeData)) {
        if (isDragging) {
          const offsetMasks = keyframeData.map((mask) => ({
            ...mask,
            left: mask.left + totalOffsetX,
            top: mask.top + totalOffsetY,
            right: mask.right + totalOffsetX,
            bottom: mask.bottom + totalOffsetY,
          }));
          renderMasksToCanvas(offsetMasks, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
        } else {
          renderMasksToCanvas(keyframeData, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
        }
      } else {
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
          if (isMaskData(beforeData)) {
            if (isDragging) {
              const offsetMasks = beforeData.map((mask) => ({
                ...mask,
                left: mask.left + totalOffsetX,
                top: mask.top + totalOffsetY,
                right: mask.right + totalOffsetX,
                bottom: mask.bottom + totalOffsetY,
              }));
              renderMasksToCanvas(offsetMasks, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
            } else {
              renderMasksToCanvas(beforeData, targetCanvas, false, 1, imageOffset.value.x, imageOffset.value.y);
            }
          } else {
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
    // Update display with dragging track shown with selection-like styling
    updateAnnotationLayerWithSelectionAndHover(
      workingCanvas!,
      draggingTrackCanvas,
      null,
      frameIndex
    );
  }
};

const renderBrushAnnotationsWithTempStrokes = async (frameIndex: number) => {
  if (!workingCanvas) {
    initCanvases();
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
      if (isMaskData(keyframeData)) {
        renderMasksToCanvas(keyframeData, workingCanvas!, false, 1, imageOffset.value.x, imageOffset.value.y);
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
            renderMasksToCanvas(beforeData, workingCanvas!, false, 1, imageOffset.value.x, imageOffset.value.y);
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

  // Then render temp brush strokes on top (offset by imageOffset since strokes are image-relative)
  const ctx = workingCanvas!.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const offsetX = imageOffset.value.x;
  const offsetY = imageOffset.value.y;
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
      ctx.moveTo(firstPoint.x + offsetX, firstPoint.y + offsetY);
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        if (point) {
          ctx.lineTo(point.x + offsetX, point.y + offsetY);
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

const setMode = (newMode: ToolMode) => {
  mode.value = newMode;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  if (cursorShape.value) {
    cursorShape.value.destroy();
    cursorShape.value = null;
    interactiveLayerRef.value?.getNode()?.batchDraw();
  }

  if (newMode === ToolModeEnum.PAN) {
    stage.container().style.cursor = "default";
  } else if (
    newMode === ToolModeEnum.BBOX ||
    newMode === ToolModeEnum.POLYGON
  ) {
    stage.container().style.cursor = "crosshair";
  } else if (
    newMode === ToolModeEnum.BRUSH ||
    newMode === ToolModeEnum.ERASER
  ) {
    stage.container().style.cursor = "none";
  }

  if (newMode === ToolModeEnum.ERASER && brush.value) {
    brush.value.setDeleteMode(true);
  } else if (newMode === ToolModeEnum.BRUSH && brush.value) {
    brush.value.changeColor("#FF0000");
  }

  if (newMode !== ToolModeEnum.POLYGON && polygonTool?.isDrawingActive()) {
    cancelPolygonDrawing();
  }

  if (newMode !== ToolModeEnum.SKELETON && skeletonTool?.isDrawingActive()) {
    cancelSkeletonDrawing();
  }
};

const handleSizeChange = () => {
  if (brush.value) {
    brush.value.changeSize(brushSize.value);
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
  const pos = stage.getRelativePointerPosition();
  if (!pos) return null;
  // Subtract image offset to get coordinates relative to the image
  return {
    x: pos.x - imageOffset.value.x,
    y: pos.y - imageOffset.value.y,
  };
};

const setupTransformer = () => {
  if (!annotationsLayerRef.value) return;
  const layer = annotationsLayerRef.value.getNode();
  bboxTool = new BBoxTool(layer);
  bboxTool.setupTransformer();

  // Set the offset group as the preview parent so previews are drawn with correct offset
  const offsetGroup = annotationOffsetGroupRef.value?.getNode();
  if (offsetGroup) {
    bboxTool.setPreviewParent(offsetGroup);
  }
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

  pendingBbox.value = {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    rotation: bbox.rotation,
    frame: currentFrame.value,
  };

  const screenPos = getScreenPositionFromCanvas(bbox.x, bbox.y);
  showClassSelectorForAnnotation(MarkupType.BBOX, screenPos);
};

const handleBboxLayerClick = (trackId: string, _e: any) => {
  if (mode.value !== ToolModeEnum.PAN) return;
  if (trackId === "pending_bbox") return;

  selectedBboxTrackId.value = trackId;
  timelineRef.value?.selectTrack(trackId, TrackTypeEnum.BBOX);
  updateTransformerSelection();

  const track = bboxTracks.value.get(trackId);
  if (track) {
    const bbox = getBoxAtFrame(trackId, currentFrame.value);
    if (bbox?.value !== undefined) {
      const currentClass = annotationClasses.value.find(
        (c) => c.value === bbox.value
      );
      classSelectorInitialClass.value = currentClass || null;
      selectedClassId.value = currentClass?.id || null;
    } else {
      classSelectorInitialClass.value = null;
    }
    editingBboxTrackId.value = trackId;
    const screenPos = bbox
      ? getScreenPositionFromCanvas(bbox.x, bbox.y)
      : undefined;
    showClassSelectorForAnnotation(MarkupType.BBOX, screenPos);
  }
};

const handleBboxLayerDragEnd = (
  trackId: string,
  x: number,
  y: number,
  _e: any
) => {
  const track = bboxTracks.value.get(trackId);
  if (!track) return;

  const currentBox = getBoxAtFrame(trackId, currentFrame.value);
  if (!currentBox) return;

  const updatedBox: BoundingBox = {
    ...currentBox,
    x: x,
    y: y,
  };

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

  // Set the offset group as the preview parent so previews are drawn with correct offset
  const offsetGroup = annotationOffsetGroupRef.value?.getNode();
  if (offsetGroup) {
    polygonTool.setPreviewParent(offsetGroup);
  }
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

  pendingPolygon.value = {
    points: polygon.points,
    frame: currentFrame.value,
  };

  // Show ClassSelector at the first point of the polygon
  const firstPoint = polygon.points[0];
  const screenPos = firstPoint
    ? getScreenPositionFromCanvas(firstPoint.x, firstPoint.y)
    : undefined;
  showClassSelectorForAnnotation(MarkupType.POLYGON, screenPos);
};

const cancelPolygonDrawing = () => {
  if (!polygonTool) return;
  polygonTool.cancelDrawing();
  isPolygonDrawing.value = false;
};

const handlePolygonLayerClick = (trackId: string, _e: any) => {
  if (mode.value !== ToolModeEnum.PAN) return;
  if (trackId === "pending_polygon") return;

  selectedPolygonTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  timelineRef.value?.selectTrack(trackId, TrackTypeEnum.POLYGON);

  const track = polygonTracks.value.get(trackId);
  if (track) {
    const polygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (polygon?.value !== undefined) {
      const currentClass = annotationClasses.value.find(
        (c) => c.value === polygon.value
      );
      classSelectorInitialClass.value = currentClass || null;
      selectedClassId.value = currentClass?.id || null;
    } else {
      classSelectorInitialClass.value = null;
    }
    editingPolygonTrackId.value = trackId;
    const firstPoint = polygon?.points[0];
    const screenPos = firstPoint
      ? getScreenPositionFromCanvas(firstPoint.x, firstPoint.y)
      : undefined;
    showClassSelectorForAnnotation(MarkupType.POLYGON, screenPos);
  }
};

const handlePolygonLayerDragEnd = (
  trackId: string,
  deltaX: number,
  deltaY: number,
  _e: any
) => {
  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: currentPolygon.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    })),
  };

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

const handlePolygonLayerVertexClick = (trackId: string) => {
  if (mode.value !== ToolModeEnum.PAN) return;
  selectedPolygonTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  timelineRef.value?.selectTrack(trackId, TrackTypeEnum.POLYGON);
};

const handlePolygonLayerVertexDragMove = (
  trackId: string,
  pointIndex: number,
  x: number,
  y: number,
  _e: any
) => {
  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const newPoints = [...currentPolygon.points];
  newPoints[pointIndex] = { x, y };

  const layer = annotationsLayerRef.value?.getNode();
  if (layer) {
    const line = layer.findOne(`#${trackId}`);
    if (line) {
      line.points(newPoints.flatMap((p) => [p.x, p.y]));
      layer.batchDraw();
    }
  }
};

const handlePolygonLayerVertexDragEnd = (
  trackId: string,
  pointIndex: number,
  x: number,
  y: number,
  _e: any
) => {
  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const newPoints = [...currentPolygon.points];
  newPoints[pointIndex] = { x, y };

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: newPoints,
  };

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

const setupSkeletonTool = () => {
  if (!annotationsLayerRef.value) return;
  const layer = annotationsLayerRef.value.getNode();
  skeletonTool = new SkeletonTool(layer);

  // Set the offset group as the preview parent so previews are drawn with correct offset
  const offsetGroup = annotationOffsetGroupRef.value?.getNode();
  if (offsetGroup) {
    skeletonTool.setPreviewParent(offsetGroup);
  }
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

  pendingSkeleton.value = {
    points: skeleton.points,
    frame: currentFrame.value,
  };

  // Show ClassSelector at the first point of the skeleton
  const firstPoint = skeleton.points[0];
  const screenPos = firstPoint
    ? getScreenPositionFromCanvas(firstPoint.x, firstPoint.y)
    : undefined;
  showClassSelectorForAnnotation(MarkupType.SKELETON, screenPos);
};

const cancelSkeletonDrawing = () => {
  if (!skeletonTool) return;
  skeletonTool.cancelDrawing();
  isSkeletonDrawing.value = false;
};

const handleSkeletonLayerClick = (trackId: string, _e: any) => {
  if (mode.value !== ToolModeEnum.PAN) return;
  if (trackId === "pending_skeleton") return;

  selectedSkeletonTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  timelineRef.value?.selectTrack(trackId, TrackTypeEnum.SKELETON);

  const track = skeletonTracks.value.get(trackId);
  if (track) {
    const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (skeleton?.value !== undefined) {
      const currentClass = annotationClasses.value.find(
        (c) => c.value === skeleton.value
      );
      classSelectorInitialClass.value = currentClass || null;
      selectedClassId.value = currentClass?.id || null;
    } else {
      classSelectorInitialClass.value = null;
    }
    editingSkeletonTrackId.value = trackId;
    const firstPoint = skeleton?.points[0];
    const screenPos = firstPoint
      ? getScreenPositionFromCanvas(firstPoint.x, firstPoint.y)
      : undefined;
    showClassSelectorForAnnotation(MarkupType.SKELETON, screenPos);
  }
};

const handleSkeletonLayerDragEnd = (
  trackId: string,
  deltaX: number,
  deltaY: number,
  _e: any
) => {
  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: currentSkeleton.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    })),
  };

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

const handleSkeletonLayerKeypointClick = (trackId: string) => {
  if (mode.value !== ToolModeEnum.PAN) return;
  selectedSkeletonTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  timelineRef.value?.selectTrack(trackId, TrackTypeEnum.SKELETON);
};

// Convert temp brush strokes from points to canvas (for eraser support)
const convertTempStrokesToCanvas = () => {
  if (tempStrokesConvertedToCanvas.value || tempBrushStrokes.value.length === 0)
    return;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = imageSize.value.width;
  canvas.height = imageSize.value.height;
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

// Render temp strokes canvas to display
const renderTempStrokesCanvasToDisplay = async (frameIndex: number) => {
  if (!tempStrokesCanvas.value) return;

  if (!workingCanvas) {
    initCanvases();
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
        renderMasksToCanvas(keyframeData, workingCanvas!, false, 1, imageOffset.value.x, imageOffset.value.y);
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
            renderMasksToCanvas(beforeData, workingCanvas!, false, 1, imageOffset.value.x, imageOffset.value.y);
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
  ctx.drawImage(tempStrokesCanvas.value, imageOffset.value.x, imageOffset.value.y);

  // Update display
  currentDisplayFrame = -1;
  updateAnnotationLayer(workingCanvas!, frameIndex);
};

const snapIndicator = ref<Konva.Circle | null>(null);

const colocatedPoints = ref<ColocatedPoint[]>([]);
const dragStartPosition = ref<{ x: number; y: number } | null>(null);

const colocatedCircleRefs = ref<Konva.Circle[]>([]);

const handleSkeletonLayerKeypointDragStart = (
  trackId: string,
  pointIndex: number,
  _x: number,
  _y: number,
  _e: any
) => {
  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const point = currentSkeleton.points[pointIndex];
  if (!point) return;

  dragStartPosition.value = { x: point.x, y: point.y };
  colocatedPoints.value = findColocatedPoints(
    point,
    trackId,
    pointIndex,
    currentFrameSkeletons.value
  );

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

const handleSkeletonLayerKeypointDragMove = (
  trackId: string,
  pointIndex: number,
  x: number,
  y: number,
  _e: any
) => {
  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const currentPos = { x, y };

  const layer = annotationsLayerRef.value?.getNode();
  if (!layer) return;

  const newPoints = [...currentSkeleton.points];
  newPoints[pointIndex] = currentPos;
  const line = layer.findOne(`#${trackId}`);
  if (line) {
    line.points(newPoints.flatMap((p) => [p.x, p.y]));
  }

  for (const c of colocatedCircleRefs.value) {
    c.x(currentPos.x);
    c.y(currentPos.y);
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

  const nearbyPoint = findNearbySkeletonPoint(
    currentPos,
    trackId,
    pointIndex,
    currentFrameSkeletons.value,
    colocatedPoints.value
  );

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

const handleSkeletonLayerKeypointDragEnd = (
  trackId: string,
  pointIndex: number,
  x: number,
  y: number,
  _e: any
) => {
  if (snapIndicator.value) {
    snapIndicator.value.destroy();
    snapIndicator.value = null;
  }

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  let newX = x;
  let newY = y;

  const nearbyPoint = findNearbySkeletonPoint(
    { x: newX, y: newY },
    trackId,
    pointIndex,
    currentFrameSkeletons.value,
    colocatedPoints.value
  );

  if (nearbyPoint) {
    newX = nearbyPoint.x;
    newY = nearbyPoint.y;
  }

  const newPoints = [...currentSkeleton.points];
  newPoints[pointIndex] = { x: newX, y: newY };

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: newPoints,
  };

  updateSkeletonKeyframe(
    trackId,
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

// ========== BaseCanvas Event Adapters ==========

const handleStageReady = (stage: Konva.Stage) => {
  stageRef.value = { getStage: () => stage };
  // Update layer refs from BaseCanvas
  if (baseCanvasRef.value) {
    backgroundLayerRef.value = baseCanvasRef.value.backgroundLayerRef;
    annotationsLayerRef.value = baseCanvasRef.value.annotationsLayerRef;
    interactiveLayerRef.value = baseCanvasRef.value.interactiveLayerRef;
  }
};

const handleZoomChange = (newZoom: number) => {
  zoomLevel.value = newZoom;
};

const handleContainerResize = (size: { width: number; height: number }) => {
  containerSize.value = size;
  // Re-initialize canvases when container size changes
  if (workingCanvas || displayCanvas) {
    workingCanvas = null;
    displayCanvas = null;
    initCanvases();
    // Re-render current frame with new canvas size
    renderBrushAnnotations(currentFrame.value);
  }
};

const handleCanvasMouseDown = (event: CanvasMouseEvent) => {
  // Adapt to existing handler - pass the konva event
  handleMouseDown(event.konvaEvent);
};

const handleCanvasMouseMove = (_event: CanvasMouseEvent) => {
  // Existing handler doesn't use event parameter
  handleMouseMove();
};

const handleCanvasMouseUp = (_event: CanvasMouseEvent) => {
  // Existing handler doesn't use event parameter
  handleMouseUp();
};

const handleCanvasMouseLeave = (_event: CanvasMouseEvent) => {
  // Existing handler doesn't use event parameter
  handleMouseLeave();
};

const handleCanvasDoubleClick = (_event: CanvasMouseEvent) => {
  // Existing handler doesn't use event parameter
  handleDoubleClick();
};

const handleCanvasWheel = (_event: CanvasWheelEvent) => {
  // Zoom is handled by BaseCanvas, but we can add extra logic here if needed
};

// ========== Original Mouse Handlers ==========

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
    if (tempStrokesEditMode.value === SegEditMode.BRUSH) {
      brush.value.changeColor(mergeColor.value);
    }

    brushPreviewLayerRef.value?.clearPreview();
    return;
  }

  // Check for segmentation edit mode FIRST - this takes priority over pan mode
  const isInSegmentationBrushMode =
    segmentationEditMode.value === SegEditMode.BRUSH;
  const isInSegmentationEraserMode =
    segmentationEditMode.value === SegEditMode.ERASER;

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

    brushPreviewLayerRef.value?.clearPreview();
    return;
  }

  if (mode.value === ToolModeEnum.PAN || e.evt.altKey) {
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
        // First check: if there's a pending drag, check if clicking on the VISUALLY dragged position
        // by testing with coordinates adjusted for the drag offset
        if (pendingMaskDrag.value) {
          const pendingTrackId = pendingMaskDrag.value.trackId;
          // Convert click position to original coordinate space (subtract the drag offset)
          const adjustedX = logicalPos.x - pendingMaskDrag.value.dx;
          const adjustedY = logicalPos.y - pendingMaskDrag.value.dy;
          const hitTrackId = findTrackAtPoint(
            adjustedX,
            adjustedY,
            currentFrame.value
          );
          if (hitTrackId === pendingTrackId) {
            // Clicked on the pending drag segmentation - start re-dragging
            isDraggingMask.value = true;
            draggingMaskTrackId.value = pendingTrackId;
            maskDragStartPoint.value = { x: logicalPos.x, y: logicalPos.y };
            maskDragCurrentDelta.value = { dx: 0, dy: 0 };
            stage.container().style.cursor = "move";
            return;
          }
        }

        // Standard check: find track at actual click position
        const trackId = findTrackAtPoint(
          logicalPos.x,
          logicalPos.y,
          currentFrame.value
        );
        if (trackId) {
          // Check if this segmentation is already selected - start dragging
          if (selectedBrushTrackId.value === trackId && showSegmentationToolbar.value) {
            // Start dragging the selected segmentation
            isDraggingMask.value = true;
            draggingMaskTrackId.value = trackId;
            maskDragStartPoint.value = { x: logicalPos.x, y: logicalPos.y };
            maskDragCurrentDelta.value = { dx: 0, dy: 0 };
            stage.container().style.cursor = "move";
            return;
          }
          // Clicked on a different segmentation - select it (but not if ClassSelector is open)
          if (!showClassSelector.value) {
            handleSelectSegmentationAtPoint(logicalPos.x, logicalPos.y);
          }
          return;
        }
      }

      // Not on segmentation - start panning or deselect
      // But don't deselect if ClassSelector is open with pending drag
      if (showSegmentationToolbar.value && !pendingMaskDrag.value) {
        handleDeselectSegmentation();
      }

      // Only start panning if no ClassSelector is open
      if (!showClassSelector.value) {
        isPanning.value = true;
        lastPanPoint.value = screenPos;
        stage.container().style.cursor = "grabbing";
        selectedBboxTrackId.value = null;
        selectedPolygonTrackId.value = null;
        selectedSkeletonTrackId.value = null;
        timelineRef.value?.clearSelection();
        updateTransformerSelection();
      }
    }
    if (!isClickOnAnnotation) {
      return;
    }
  }

  if (mode.value === ToolModeEnum.POLYGON) {
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

  if (mode.value === ToolModeEnum.SKELETON) {
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

  if (mode.value === ToolModeEnum.BBOX) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    isDrawing.value = true;
    startBboxDrawing(logicalPos);
    return;
  }

  // Check for main brush/eraser mode OR segmentation edit mode from toolbar
  const isInBrushMode =
    mode.value === ToolModeEnum.BRUSH ||
    segmentationEditMode.value === SegEditMode.BRUSH;
  const isInEraserMode =
    mode.value === ToolModeEnum.ERASER ||
    segmentationEditMode.value === SegEditMode.ERASER;

  if ((isInBrushMode || isInEraserMode) && brush.value?.isLoaded()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    isDrawing.value = true;
    drawingStartFrame.value = currentFrame.value;
    brush.value.startStroke(logicalPos);

    // Set brush color to match selected segmentation when in edit mode
    if (
      segmentationEditMode.value === SegEditMode.BRUSH &&
      selectedSegmentationColor.value
    ) {
      brush.value.changeColor(selectedSegmentationColor.value);
    }

    brushPreviewLayerRef.value?.clearPreview();
  }
};

const handleMouseMove = () => {
  const screenPos = getStagePointerPosition();
  if (!screenPos) return;

  // Handle mask dragging
  if (
    isDraggingMask.value &&
    maskDragStartPoint.value &&
    draggingMaskTrackId.value
  ) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;

    const dx = logicalPos.x - maskDragStartPoint.value.x;
    const dy = logicalPos.y - maskDragStartPoint.value.y;
    maskDragCurrentDelta.value = { dx, dy };

    // Re-render with drag offset for visual feedback
    renderFrameWithMaskOffset(
      currentFrame.value,
      draggingMaskTrackId.value,
      dx,
      dy
    );
    return;
  }

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

  if (mode.value === ToolModeEnum.POLYGON && polygonTool?.isDrawingActive()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updatePolygonPreviewWithMouse(logicalPos);
    return;
  }

  if (mode.value === ToolModeEnum.SKELETON && skeletonTool?.isDrawingActive()) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updateSkeletonPreviewWithMouse(logicalPos);
    return;
  }

  if (mode.value === ToolModeEnum.BBOX && isDrawing.value) {
    const logicalPos = getLogicalPointerPosition();
    if (!logicalPos) return;
    updateBboxPreview(logicalPos);
    return;
  }

  // Check for brush/eraser mode (main or segmentation edit)
  const isInBrushMode =
    mode.value === ToolModeEnum.BRUSH ||
    segmentationEditMode.value === SegEditMode.BRUSH;
  const isInEraserMode =
    mode.value === ToolModeEnum.ERASER ||
    segmentationEditMode.value === SegEditMode.ERASER;

  if (
    (mode.value !== ToolModeEnum.PAN || isInBrushMode || isInEraserMode) &&
    mode.value !== ToolModeEnum.BBOX &&
    mode.value !== ToolModeEnum.POLYGON &&
    mode.value !== ToolModeEnum.SKELETON &&
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

    const shape = brush.value.renderStrokeShape(
      brush.value.getCurrentPoints(),
      1,
      imageSize.value.width,
      imageSize.value.height,
      imageOffset.value.x,
      imageOffset.value.y
    );
    brushPreviewLayerRef.value?.renderStrokePreview(shape);
    interactiveLayerRef.value?.getNode()?.batchDraw();
  }

  // Throttled hover detection for segmentation masks (Pan mode only)
  // Disable hover when ClassSelector is open (pending drag/brush in progress)
  if (
    mode.value === ToolModeEnum.PAN &&
    !isPanning.value &&
    !isDrawing.value &&
    !showSegmentationToolbar.value &&
    !showClassSelector.value
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

  // Handle mask drag end
  if (isDraggingMask.value && draggingMaskTrackId.value) {
    const { dx, dy } = maskDragCurrentDelta.value;
    const trackId = draggingMaskTrackId.value;

    // Reset drag state first
    isDraggingMask.value = false;
    draggingMaskTrackId.value = null;
    maskDragStartPoint.value = null;
    maskDragCurrentDelta.value = { dx: 0, dy: 0 };

    if (stage) {
      stage.container().style.cursor = "default";
    }

    // Only process if there was actual movement
    if (dx !== 0 || dy !== 0) {
      // Check if there's already a pending drag for this track - accumulate deltas
      if (pendingMaskDrag.value && pendingMaskDrag.value.trackId === trackId) {
        // Accumulate the new drag delta with the existing pending drag
        pendingMaskDrag.value = {
          trackId,
          dx: pendingMaskDrag.value.dx + dx,
          dy: pendingMaskDrag.value.dy + dy,
          frame: currentFrame.value,
        };

        // Re-render to show updated dragged position
        currentDisplayFrame = -1;
        renderFrame(currentFrame.value);
        // ClassSelector is already open, don't re-trigger it
      } else {
        // Store new pending drag - don't save yet, wait for ClassSelector confirmation
        pendingMaskDrag.value = {
          trackId,
          dx,
          dy,
          frame: currentFrame.value,
        };

        // Re-render to show dragged position using pendingMaskDrag offset
        // (the drag state variables were reset, so we need to use pendingMaskDrag now)
        currentDisplayFrame = -1;
        renderFrame(currentFrame.value);

        // Get the track to get its class info for ClassSelector
        const track = brushTracks.value.get(trackId);
        if (track) {
          // Set the editing track so ClassSelector knows we're editing
          editingBrushTrackId.value = trackId;

          // Get existing class info
          const firstKeyframe = track.keyframes.values().next().value;
          if (firstKeyframe && firstKeyframe.length > 0) {
            const maskData = firstKeyframe[0];
            if (maskData && "classID" in maskData) {
              const existingClass = annotationClasses.value.find(
                (c) => c.value === maskData.classID
              );
              classSelectorInitialClass.value = existingClass || null;
              selectedClassId.value = existingClass?.id || null;
            }
          }

          // Show ClassSelector
          const screenPos = getScreenPositionFromCanvas(
            imageSize.value.width / 2,
            imageSize.value.height / 2
          );
          showClassSelectorForAnnotation(MarkupType.MASK, screenPos);
        }
      }
    }
    return;
  }

  if (stage && isPanning.value) {
    stage.container().style.cursor =
      mode.value === ToolModeEnum.PAN
        ? "default"
        : mode.value === ToolModeEnum.BBOX ||
          mode.value === ToolModeEnum.POLYGON
        ? "crosshair"
        : "none";
  }

  isPanning.value = false;
  lastPanPoint.value = null;

  if (mode.value === ToolModeEnum.BBOX && isDrawing.value) {
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
    brushPreviewLayerRef.value?.clearPreview();
    interactiveLayerRef.value?.getNode()?.batchDraw();

    if (tempStrokesEditMode.value === SegEditMode.BRUSH) {
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
        eraserStrokeCanvas.width = imageSize.value.width;
        eraserStrokeCanvas.height = imageSize.value.height;
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
    mode.value === ToolModeEnum.BRUSH ||
    segmentationEditMode.value === SegEditMode.BRUSH;
  const isInEraserMode =
    mode.value === ToolModeEnum.ERASER ||
    segmentationEditMode.value === SegEditMode.ERASER;

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

  const strokeCanvas = createOffscreenCanvas(
    currentImage.value,
    imageSize.value.width,
    imageSize.value.height
  );
  const strokeCtx = strokeCanvas.getContext("2d")!;
  strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
  strokeCtx.globalCompositeOperation = "source-over";

  const eraserOpacity = isInEraserMode ? 1.0 : undefined;
  brush.value.renderToCanvas(strokeCanvas, points, 1, eraserOpacity);

  brushPreviewLayerRef.value?.clearPreview();
  interactiveLayerRef.value?.getNode()?.batchDraw();

  if (isInBrushMode) {
    // Check if we're in segmentation edit mode - auto-merge into selected track
    if (
      segmentationEditMode.value === SegEditMode.BRUSH &&
      selectedBrushTrackId.value
    ) {
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
      mergedCanvas.width = imageSize.value.width;
      mergedCanvas.height = imageSize.value.height;
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
      // Regular brush mode - show ClassSelector immediately after stroke
      const strokeColor = brushColor.value;

      // Create a canvas with the stroke
      const strokeCanvasForSave = document.createElement("canvas");
      strokeCanvasForSave.width = imageSize.value.width;
      strokeCanvasForSave.height = imageSize.value.height;
      const strokeCtxForSave = strokeCanvasForSave.getContext("2d")!;
      strokeCtxForSave.imageSmoothingEnabled = false;

      // Render stroke to canvas
      strokeCtxForSave.strokeStyle = strokeColor;
      strokeCtxForSave.lineWidth = brushSize.value;
      strokeCtxForSave.lineCap = "round";
      strokeCtxForSave.lineJoin = "round";
      strokeCtxForSave.globalCompositeOperation = "source-over";

      if (points.length >= 2) {
        strokeCtxForSave.beginPath();
        const firstPoint = points[0];
        if (firstPoint) {
          strokeCtxForSave.moveTo(firstPoint.x, firstPoint.y);
          for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (point) {
              strokeCtxForSave.lineTo(point.x, point.y);
            }
          }
          strokeCtxForSave.stroke();
        }
      }

      // Apply color and binarize
      applyColorToCanvas(strokeCanvasForSave, strokeColor);
      binarizeAlpha(strokeCanvasForSave);

      // Set pending brush and show ClassSelector
      pendingBrush.value = {
        canvas: strokeCanvasForSave,
        frame: targetFrame,
      };

      // Render the pending stroke to display so it remains visible while ClassSelector is open
      if (!workingCanvas || !displayCanvas) {
        initCanvases();
      }
      // First render existing annotations
      await renderBrushAnnotations(targetFrame);
      // Then overlay the pending stroke
      const displayCtx = displayCanvas!.getContext("2d")!;
      displayCtx.drawImage(strokeCanvasForSave, imageOffset.value.x, imageOffset.value.y);
      // Update Konva display
      brushAnnotationCanvasData.value = {
        nonSelectedCanvas: displayCanvas,
        selectedCanvas: null,
        hoveredCanvas: null,
        frameNumber: targetFrame,
        renderVersion: ++brushRenderVersion,
      };

      // Calculate position for ClassSelector (center of stroke bounds or canvas center)
      const screenPos = getScreenPositionFromCanvas(
        imageSize.value.width / 2,
        imageSize.value.height / 2
      );
      showClassSelectorForAnnotation(MarkupType.MASK, screenPos);
    }
  }

  if (isInEraserMode) {
    // Check if we have pending temp strokes to erase from (new drawing)
    const hasTempStrokes =
      tempBrushStrokes.value.length > 0 || tempStrokesConvertedToCanvas.value;

    if (hasTempStrokes) {
      // Erase from temp strokes (new drawing workflow)
      if (!tempStrokesConvertedToCanvas.value) {
        // Convert to canvas first for erasing
        convertTempStrokesToCanvas();
      }

      if (tempStrokesCanvas.value) {
        // Create eraser stroke canvas
        const eraserStrokeCanvas = document.createElement("canvas");
        eraserStrokeCanvas.width = imageSize.value.width;
        eraserStrokeCanvas.height = imageSize.value.height;
        brush.value.renderToCanvas(eraserStrokeCanvas, points, 1, 1.0);

        // Apply eraser to temp strokes canvas
        const ctx = tempStrokesCanvas.value.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(eraserStrokeCanvas, 0, 0);
        ctx.globalCompositeOperation = "source-over";

        // Re-render display
        await renderTempStrokesCanvasToDisplay(targetFrame);
      }

      isDrawing.value = false;
      return;
    }

    const selectedTrackId =
      selectedBrushTrackId.value || timelineRef.value?.selectedTrackId;
    const selectedType = timelineRef.value?.selectedTrackType;
    // Check if editing existing segmentation: either via segmentationEditMode OR selectedBrushTrackId with eraser tool
    const isEditingExistingSegmentation =
      segmentationEditMode.value === SegEditMode.ERASER ||
      (selectedBrushTrackId.value !== null &&
        mode.value === ToolModeEnum.ERASER);

    // Allow erasing if editing existing segmentation, or if brush track is selected in timeline
    if (
      !selectedTrackId ||
      (!isEditingExistingSegmentation && selectedType !== TrackTypeEnum.BRUSH)
    ) {
      isDrawing.value = false;
      return;
    }

    // Use RLE-based erasing for existing segmentation
    if (isEditingExistingSegmentation && selectedBrushTrackId.value) {
      const trackId = selectedBrushTrackId.value;

      // Get the current track data
      const track = brushTracks.value.get(trackId);
      if (!track) {
        isDrawing.value = false;
        return;
      }

      // Create a new canvas with the existing mask
      const modifiedCanvas = document.createElement("canvas");
      modifiedCanvas.width = imageSize.value.width;
      modifiedCanvas.height = imageSize.value.height;

      // First, render existing mask data for this track at this frame
      let existingKeyframeData = track.keyframes.get(targetFrame);

      // If no keyframe at this frame but interpolation is enabled, get from previous keyframe
      if (!existingKeyframeData && track.interpolationEnabled) {
        const frames = Array.from(track.keyframes.keys()).sort(
          (a, b) => a - b
        );
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

      const modifiedCtx = modifiedCanvas.getContext("2d")!;

      // Create eraser stroke canvas
      const eraserStrokeCanvas = document.createElement("canvas");
      eraserStrokeCanvas.width = imageSize.value.width;
      eraserStrokeCanvas.height = imageSize.value.height;
      brush.value.renderToCanvas(eraserStrokeCanvas, points, 1, 1.0);

      // Apply eraser using destination-out composite operation
      modifiedCtx.globalCompositeOperation = "destination-out";
      modifiedCtx.drawImage(eraserStrokeCanvas, 0, 0);
      modifiedCtx.globalCompositeOperation = "source-over";

      // Auto-save the erased result immediately
      // Get the color from existing mask data
      const firstKeyframe = track.keyframes.values().next().value;
      let strokeColor = "#FF0000";
      if (firstKeyframe && firstKeyframe.length > 0) {
        const firstMask = firstKeyframe[0];
        if (firstMask && "color" in firstMask) {
          strokeColor = firstMask.color;
        }
      }

      // Convert the eraser canvas to RLE MaskData
      const newMaskData = canvasToMaskData(
        modifiedCanvas,
        strokeColor,
        "Brush",
        0
      );

      if (newMaskData) {
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

        // Update the editCanvas in trackEditStates
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

        // Force re-render and save
        currentDisplayFrame = -1;
        await forceRenderFrame(targetFrame);
        saveAnnotations();
      }
    } else {
      // Legacy eraser mode for contour-based tracks (non-segmentation edit mode)
      const trackResult = await getContoursAtFrame(
        selectedTrackId,
        targetFrame,
        brushClasses.value,
        imageSize.value.width,
        imageSize.value.height,
        1
      );

      if (!trackResult.canvas || trackResult.contours.length === 0) {
        isDrawing.value = false;
        return;
      }

      const eraserStrokeCanvas = document.createElement("canvas");
      eraserStrokeCanvas.width = imageSize.value.width;
      eraserStrokeCanvas.height = imageSize.value.height;
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

  if (mode.value === ToolModeEnum.POLYGON && polygonTool?.isDrawingActive()) {
    updatePolygonPreview();
    return;
  }

  if (mode.value === ToolModeEnum.BBOX && isDrawing.value) {
    if (bboxTool) {
      bboxTool.cancelDrawing();
    }
    isDrawing.value = false;
    return;
  }

  handleMouseUp();
};

const handleDoubleClick = () => {
  if (mode.value === ToolModeEnum.POLYGON && polygonTool?.isDrawingActive()) {
    const currentPoints = polygonTool.getCurrentPoints();
    if (currentPoints.length >= 3) {
      completePolygonDrawing();
    }
  }
  if (mode.value === ToolModeEnum.SKELETON && skeletonTool?.isDrawingActive()) {
    const currentPoints = skeletonTool.getCurrentPoints();
    if (currentPoints.length >= 2) {
      completeSkeletonDrawing();
    }
  }
};

const handleSelectTrack = (trackId: string, type: TrackType) => {
  if (type === TrackTypeEnum.BBOX) {
    selectedBboxTrackId.value = trackId;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    updateTransformerSelection();
  } else if (type === TrackTypeEnum.POLYGON) {
    selectedPolygonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedSkeletonTrackId.value = null;
  } else if (type === TrackTypeEnum.SKELETON) {
    selectedSkeletonTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
  } else if (type === TrackTypeEnum.BRUSH) {
    selectedBrushTrackId.value = trackId;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
  }
};

const handleToggleInterpolation = (trackId: string, type: TrackType) => {
  if (type === TrackTypeEnum.BBOX) {
    toggleBboxInterpolation(trackId);
  } else if (type === TrackTypeEnum.POLYGON) {
    togglePolygonInterpolation(trackId);
  } else if (type === TrackTypeEnum.SKELETON) {
    toggleSkeletonInterpolation(trackId);
  } else if (type === TrackTypeEnum.BRUSH) {
    toggleBrushInterpolation(trackId);
  }
};

const handleAddKeyframe = (trackId: string, type: TrackType) => {
  if (type === TrackTypeEnum.BBOX) {
    const currentBox = getBoxAtFrame(trackId, currentFrame.value);
    if (currentBox) {
      updateBboxKeyframe(
        trackId,
        currentFrame.value,
        currentBox,
        autoSuggest.value
      );
    }
  } else if (type === TrackTypeEnum.POLYGON) {
    const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (currentPolygon) {
      updatePolygonKeyframe(
        trackId,
        currentFrame.value,
        currentPolygon,
        autoSuggest.value
      );
    }
  } else if (type === TrackTypeEnum.SKELETON) {
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
  if (type === TrackTypeEnum.BBOX) {
    track = bboxTracks.value.get(trackId);
  } else if (type === TrackTypeEnum.POLYGON) {
    track = polygonTracks.value.get(trackId);
  } else if (type === TrackTypeEnum.SKELETON) {
    track = skeletonTracks.value.get(trackId);
  } else if (type === TrackTypeEnum.BRUSH) {
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

  if (trackType === TrackTypeEnum.BBOX) {
    deleteBboxTrack(trackId);
    selectedBboxTrackId.value = null;
  } else if (trackType === TrackTypeEnum.POLYGON) {
    deletePolygonTrack(trackId);
    selectedPolygonTrackId.value = null;
  } else if (trackType === TrackTypeEnum.SKELETON) {
    deleteSkeletonTrack(trackId);
    selectedSkeletonTrackId.value = null;
  } else if (trackType === TrackTypeEnum.BRUSH) {
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

const handleDeselectSegmentation = async () => {
  deselectTrack();
  showSegmentationToolbar.value = false;
  setSegmentationEditMode("none");

  // Clear editing state to re-enable tools
  editingBrushTrackId.value = null;
  classSelectorInitialClass.value = null;
  showClassSelector.value = false;

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
      imageSize.value.width,
      imageSize.value.height
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
    timelineRef.value?.selectTrack(trackId, TrackTypeEnum.BRUSH);

    // Get current brush class and show ClassSelector
    const track = brushTracks.value.get(trackId);
    if (track) {
      // Get the first keyframe data to extract class info
      const firstKeyframe = track.keyframes.values().next().value;
      if (firstKeyframe && firstKeyframe.length > 0) {
        const maskData = firstKeyframe[0];
        if (maskData && "classID" in maskData) {
          const currentClass = annotationClasses.value.find(
            (c) => c.value === maskData.classID
          );
          classSelectorInitialClass.value = currentClass || null;
          selectedClassId.value = currentClass?.id || null;
        } else {
          classSelectorInitialClass.value = null;
        }
      } else {
        classSelectorInitialClass.value = null;
      }
      editingBrushTrackId.value = trackId;
      // Show ClassSelector at the click position
      const screenPos = getScreenPositionFromCanvas(x, y);
      showClassSelectorForAnnotation(MarkupType.MASK, screenPos);
    }

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
    annotationStore.setClasses(annotationClasses.value);
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

  // Use the displayCanvas for Konva rendering
  if (!displayCanvas) {
    initCanvases();
  }

  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreenCanvas, 0, 0);

  // Update via component
  brushAnnotationCanvasData.value = {
    nonSelectedCanvas: displayCanvas,
    selectedCanvas: null,
    hoveredCanvas: null,
    frameNumber: frameNumber,
    renderVersion: ++brushRenderVersion,
  };
  currentDisplayFrame = frameNumber;
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
  // Use the displayCanvas for Konva rendering
  if (!displayCanvas) {
    initCanvases();
  }

  // Copy nonSelectedCanvas to displayCanvas
  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(nonSelectedCanvas, 0, 0);

  // Update via component - it handles all the rendering logic for selection/hover effects
  brushAnnotationCanvasData.value = {
    nonSelectedCanvas: displayCanvas,
    selectedCanvas: selectedCanvas,
    hoveredCanvas: hoveredCanvas,
    frameNumber: frameNumber,
    renderVersion: ++brushRenderVersion,
  };
  currentDisplayFrame = frameNumber;
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

    imageSize.value.width = Math.floor(firstImg.width * scale);
    imageSize.value.height = Math.floor(firstImg.height * scale);

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
    annotationClasses.value = [...annotationStore.classes];

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
  // The BrushAnnotationLayer component handles opacity updates internally via its watch
  // We just need to trigger a redraw
  annotationsLayerRef.value?.getNode()?.batchDraw();
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
  box-sizing: border-box;
}

.main-content {
  display: flex;
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  /* position: relative; */
}

/* Class Manager Panel */
.class-manager-panel {
  flex-shrink: 0;
  align-self: flex-start;
  max-height: 100%;
  overflow-y: auto;
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
  right: 10px;
}

.right-panel.visible {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
  pointer-events: auto;
  margin-right: 16px;
}

.loading {
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.class-manager-panel {
  position: absolute;
  left: 10px;
}
</style>
