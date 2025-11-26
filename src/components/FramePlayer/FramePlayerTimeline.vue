<template>
  <div class="timeline-section">
    <div class="timeline-header">
      <span class="frame-counter"
        >{{ currentFrame + 1 }} / {{ totalFrames }}</span
      >
    </div>

    <div
      v-if="selectedTrackId && selectedTrackType"
      class="interpolation-controls-row"
    >
      <div class="interpolation-info">
        <span class="track-id">
          Track: {{ selectedTrackId.substring(0, 16) }}...
        </span>
        <span
          class="keyframe-status"
          :class="{ 'is-keyframe': isCurrentFrameKeyframe }"
        >
          {{ isCurrentFrameKeyframe ? "Keyframe" : "Interpolated" }}
        </span>
        <label class="interpolation-toggle">
          <input
            type="checkbox"
            :checked="isInterpolationEnabled"
            @change="handleToggleInterpolation"
          />
          <span>
            Interpolation {{ isInterpolationEnabled ? "ON" : "OFF" }}
          </span>
        </label>
        <button
          @click="handleAddKeyframe"
          class="control-btn small"
          :disabled="isCurrentFrameKeyframe"
        >
          + Add Keyframe
        </button>
      </div>
    </div>

    <div class="timeline-tracks-container">
      <div
        v-if="
          bboxTracks.size === 0 &&
          polygonTracks.size === 0 &&
          skeletonTracks.size === 0 &&
          brushTracks.size === 0
        "
        class="timeline-empty"
      >
        No tracks yet. Draw with bbox, polygon, skeleton, or brush tool to create one.
      </div>

      <div
        v-for="[trackId, track] in Array.from(bboxTracks.entries())"
        :key="trackId"
        class="timeline-track-row"
        :class="{
          selected: selectedTrackId === trackId && selectedTrackType === 'bbox',
        }"
        @click="selectTrack(trackId, 'bbox')"
      >
        <div class="track-label">
          <span class="track-icon">⬜</span>
          <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
          <span class="keyframe-count">{{ track.keyframes.size }} keys</span>
        </div>

        <div class="track-timeline">
          <div
            class="current-frame-line"
            :style="{ left: currentFramePercentage + '%' }"
          >
            <div class="playhead"></div>
          </div>

          <div
            v-for="(range, rangeIndex) in track.ranges || []"
            :key="`${trackId}-bbox-range-${rangeIndex}`"
            class="timeline-segment-bar bbox"
            :class="{
              selected:
                selectedTrackId === trackId && selectedTrackType === 'bbox',
            }"
            :style="{
              left: (range[0] / (totalFrames || 1)) * 100 + '%',
              width: ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
              backgroundColor: track.color + '40',
              borderColor: track.color,
            }"
          >
            <div
              class="resize-handle left"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'bbox',
                  rangeIndex,
                  'left',
                  range[0],
                  range[1]
                )
              "
            ></div>
            <div
              class="resize-handle right"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'bbox',
                  rangeIndex,
                  'right',
                  range[0],
                  range[1]
                )
              "
            ></div>
          </div>

          <div
            v-for="frameNum in Array.from(track.keyframes.keys())"
            :key="`${trackId}-bbox-${frameNum}`"
            v-show="isFrameInRanges(frameNum, track.ranges || [])"
            class="keyframe-diamond"
            :class="{
              active: frameNum === currentFrame,
              selected:
                selectedTrackId === trackId &&
                selectedTrackType === 'bbox' &&
                frameNum === currentFrame,
            }"
            :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
            @click.stop="$emit('jump-to-frame', frameNum)"
          >
            <div class="diamond-shape"></div>
          </div>
        </div>
      </div>

      <div
        v-for="[trackId, track] in Array.from(polygonTracks.entries())"
        :key="trackId"
        class="timeline-track-row"
        :class="{
          selected:
            selectedTrackId === trackId && selectedTrackType === 'polygon',
        }"
        @click="selectTrack(trackId, 'polygon')"
      >
        <div class="track-label">
          <span class="track-icon">🔷</span>
          <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
          <span class="keyframe-count">{{ track.keyframes.size }} keys</span>
        </div>

        <div class="track-timeline">
          <div
            class="current-frame-line"
            :style="{ left: currentFramePercentage + '%' }"
          >
            <div class="playhead"></div>
          </div>

          <div
            v-for="(range, rangeIndex) in track.ranges || []"
            :key="`${trackId}-polygon-range-${rangeIndex}`"
            class="timeline-segment-bar polygon"
            :class="{
              selected:
                selectedTrackId === trackId && selectedTrackType === 'polygon',
            }"
            :style="{
              left: (range[0] / (totalFrames || 1)) * 100 + '%',
              width: ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
              backgroundColor: track.color + '40',
              borderColor: track.color,
            }"
          >
            <div
              class="resize-handle left"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'polygon',
                  rangeIndex,
                  'left',
                  range[0],
                  range[1]
                )
              "
            ></div>
            <div
              class="resize-handle right"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'polygon',
                  rangeIndex,
                  'right',
                  range[0],
                  range[1]
                )
              "
            ></div>
          </div>

          <div
            v-for="frameNum in Array.from(track.keyframes.keys())"
            :key="`${trackId}-polygon-${frameNum}`"
            v-show="isFrameInRanges(frameNum, track.ranges || [])"
            class="keyframe-diamond"
            :class="{
              active: frameNum === currentFrame,
              selected:
                selectedTrackId === trackId &&
                selectedTrackType === 'polygon' &&
                frameNum === currentFrame,
            }"
            :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
            @click.stop="$emit('jump-to-frame', frameNum)"
          >
            <div class="diamond-shape"></div>
          </div>
        </div>
      </div>

      <div
        v-for="[trackId, track] in Array.from(skeletonTracks.entries())"
        :key="trackId"
        class="timeline-track-row"
        :class="{
          selected:
            selectedTrackId === trackId && selectedTrackType === 'skeleton',
        }"
        @click="selectTrack(trackId, 'skeleton')"
      >
        <div class="track-label">
          <span class="track-icon">🦴</span>
          <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
          <span class="keyframe-count">{{ track.keyframes.size }} keys</span>
        </div>

        <div class="track-timeline">
          <div
            class="current-frame-line"
            :style="{ left: currentFramePercentage + '%' }"
          >
            <div class="playhead"></div>
          </div>

          <div
            v-for="(range, rangeIndex) in track.ranges || []"
            :key="`${trackId}-skeleton-range-${rangeIndex}`"
            class="timeline-segment-bar skeleton"
            :class="{
              selected:
                selectedTrackId === trackId && selectedTrackType === 'skeleton',
            }"
            :style="{
              left: (range[0] / (totalFrames || 1)) * 100 + '%',
              width: ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
              backgroundColor: track.color + '40',
              borderColor: track.color,
            }"
          >
            <div
              class="resize-handle left"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'skeleton',
                  rangeIndex,
                  'left',
                  range[0],
                  range[1]
                )
              "
            ></div>
            <div
              class="resize-handle right"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'skeleton',
                  rangeIndex,
                  'right',
                  range[0],
                  range[1]
                )
              "
            ></div>
          </div>

          <div
            v-for="frameNum in Array.from(track.keyframes.keys())"
            :key="`${trackId}-skeleton-${frameNum}`"
            v-show="isFrameInRanges(frameNum, track.ranges || [])"
            class="keyframe-diamond"
            :class="{
              active: frameNum === currentFrame,
              selected:
                selectedTrackId === trackId &&
                selectedTrackType === 'skeleton' &&
                frameNum === currentFrame,
            }"
            :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
            @click.stop="$emit('jump-to-frame', frameNum)"
          >
            <div class="diamond-shape"></div>
          </div>
        </div>
      </div>

      <div
        v-for="[trackId, track] in Array.from(brushTracks.entries())"
        :key="trackId"
        class="timeline-track-row"
        :class="{
          selected:
            selectedTrackId === trackId && selectedTrackType === 'brush',
        }"
        @click="selectTrack(trackId, 'brush')"
      >
        <div class="track-label">
          <span class="track-icon">🖌️</span>
          <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
          <span class="keyframe-count">{{ track.keyframes.size }} keys</span>
        </div>

        <div class="track-timeline">
          <div
            class="current-frame-line"
            :style="{ left: currentFramePercentage + '%' }"
          >
            <div class="playhead"></div>
          </div>

          <div
            v-for="(range, rangeIndex) in track.ranges || []"
            :key="`${trackId}-brush-range-${rangeIndex}`"
            class="timeline-segment-bar brush"
            :class="{
              selected:
                selectedTrackId === trackId && selectedTrackType === 'brush',
            }"
            :style="{
              left: (range[0] / (totalFrames || 1)) * 100 + '%',
              width: ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
            }"
          >
            <div
              class="resize-handle left"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'brush',
                  rangeIndex,
                  'left',
                  range[0],
                  range[1]
                )
              "
            ></div>
            <div
              class="resize-handle right"
              @mousedown.stop="
                startRangeResize(
                  $event,
                  trackId,
                  'brush',
                  rangeIndex,
                  'right',
                  range[0],
                  range[1]
                )
              "
            ></div>
          </div>

          <div
            v-for="frameNum in Array.from(track.keyframes.keys())"
            :key="`${trackId}-brush-${frameNum}`"
            v-show="isFrameInRanges(frameNum, track.ranges || [])"
            class="keyframe-diamond"
            :class="{
              active: frameNum === currentFrame,
              selected:
                selectedTrackId === trackId &&
                selectedTrackType === 'brush' &&
                frameNum === currentFrame,
            }"
            :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
            @click.stop="$emit('jump-to-frame', frameNum)"
          >
            <div class="diamond-shape"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-scrubber-container">
      <input
        type="range"
        class="timeline-scrubber"
        :min="0"
        :max="totalFrames - 1"
        :value="currentFrame"
        @input="handleScrubberInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import type { BoundingBoxTrack } from "../../types/boundingBox";
import type { PolygonTrack } from "../../types/polygon";
import type { SkeletonTrack } from "../../types/skeleton";
import type { BrushTrack } from "../../composables/useBrushTracks";

type TrackType = "bbox" | "polygon" | "skeleton" | "brush";

const props = defineProps<{
  currentFrame: number;
  totalFrames: number;
  fps: number;
  bboxTracks: Map<string, BoundingBoxTrack>;
  polygonTracks: Map<string, PolygonTrack>;
  skeletonTracks: Map<string, SkeletonTrack>;
  brushTracks: Map<string, BrushTrack>;
}>();

const emit = defineEmits<{
  (e: "jump-to-frame", frame: number): void;
  (e: "select-track", trackId: string, type: TrackType): void;
  (e: "toggle-interpolation", trackId: string, type: TrackType): void;
  (e: "add-keyframe", trackId: string, type: TrackType): void;
  (
    e: "update-range",
    trackId: string,
    type: TrackType,
    rangeIndex: number,
    start: number,
    end: number
  ): void;
  (
    e: "resize-end",
    trackId: string,
    type: TrackType,
    rangeIndex: number,
    start: number,
    end: number
  ): void;
}>();

const selectedTrackId = ref<string | null>(null);
const selectedTrackType = ref<TrackType | null>(null);

const resizeState = ref<{
  isResizing: boolean;
  trackId: string;
  type: TrackType;
  rangeIndex: number;
  edge: "left" | "right";
  initialStart: number;
  initialEnd: number;
  startX: number;
  currentStart: number;
  currentEnd: number;
} | null>(null);

const currentFramePercentage = computed(() => {
  if (props.totalFrames === 0) return 0;
  return (props.currentFrame / props.totalFrames) * 100;
});

const isCurrentFrameKeyframe = computed(() => {
  if (!selectedTrackId.value || !selectedTrackType.value) return false;

  let track:
    | BoundingBoxTrack
    | PolygonTrack
    | SkeletonTrack
    | BrushTrack
    | undefined;

  if (selectedTrackType.value === "bbox") {
    track = props.bboxTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "polygon") {
    track = props.polygonTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "skeleton") {
    track = props.skeletonTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "brush") {
    track = props.brushTracks.get(selectedTrackId.value);
  }

  return track ? track.keyframes.has(props.currentFrame) : false;
});

const isInterpolationEnabled = computed(() => {
  if (!selectedTrackId.value || !selectedTrackType.value) return false;

  let track:
    | BoundingBoxTrack
    | PolygonTrack
    | SkeletonTrack
    | BrushTrack
    | undefined;

  if (selectedTrackType.value === "bbox") {
    track = props.bboxTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "polygon") {
    track = props.polygonTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "skeleton") {
    track = props.skeletonTracks.get(selectedTrackId.value);
  } else if (selectedTrackType.value === "brush") {
    track = props.brushTracks.get(selectedTrackId.value);
  }

  return track ? track.interpolationEnabled : false;
});

function isFrameInRanges(
  frame: number,
  ranges: Array<[number, number]>
): boolean {
  return ranges.some(([start, end]) => frame >= start && frame < end);
}

function selectTrack(trackId: string, type: TrackType) {
  selectedTrackId.value = trackId;
  selectedTrackType.value = type;
  emit("select-track", trackId, type);
}

function handleToggleInterpolation() {
  if (selectedTrackId.value && selectedTrackType.value) {
    emit(
      "toggle-interpolation",
      selectedTrackId.value,
      selectedTrackType.value
    );
  }
}

function handleAddKeyframe() {
  if (selectedTrackId.value && selectedTrackType.value) {
    emit("add-keyframe", selectedTrackId.value, selectedTrackType.value);
  }
}

function handleScrubberInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("jump-to-frame", parseInt(target.value, 10));
}

function startRangeResize(
  event: MouseEvent,
  trackId: string,
  type: TrackType,
  rangeIndex: number,
  edge: "left" | "right",
  initialStart: number,
  initialEnd: number
) {
  event.preventDefault();
  resizeState.value = {
    isResizing: true,
    trackId,
    type,
    rangeIndex,
    edge,
    initialStart,
    initialEnd,
    startX: event.clientX,
    currentStart: initialStart,
    currentEnd: initialEnd,
  };

  document.addEventListener("mousemove", handleRangeResizeMove);
  document.addEventListener("mouseup", handleRangeResizeEnd);
}

function handleRangeResizeMove(event: MouseEvent) {
  if (!resizeState.value) return;

  const timelineElement = document.querySelector(".track-timeline");
  if (!timelineElement) return;

  const rect = timelineElement.getBoundingClientRect();
  const deltaX = event.clientX - resizeState.value.startX;
  const deltaFrames = Math.round((deltaX / rect.width) * props.totalFrames);

  let newStart = resizeState.value.initialStart;
  let newEnd = resizeState.value.initialEnd;

  if (resizeState.value.edge === "left") {
    newStart = Math.max(0, resizeState.value.initialStart + deltaFrames);
    newStart = Math.min(newStart, newEnd - 1);
  } else {
    newEnd = Math.min(
      props.totalFrames,
      resizeState.value.initialEnd + deltaFrames
    );
    newEnd = Math.max(newEnd, newStart + 1);
  }

  resizeState.value.currentStart = newStart;
  resizeState.value.currentEnd = newEnd;

  emit(
    "update-range",
    resizeState.value.trackId,
    resizeState.value.type,
    resizeState.value.rangeIndex,
    newStart,
    newEnd
  );
}

function handleRangeResizeEnd() {
  if (resizeState.value) {
    emit(
      "resize-end",
      resizeState.value.trackId,
      resizeState.value.type,
      resizeState.value.rangeIndex,
      resizeState.value.currentStart,
      resizeState.value.currentEnd
    );
  }
  resizeState.value = null;
  document.removeEventListener("mousemove", handleRangeResizeMove);
  document.removeEventListener("mouseup", handleRangeResizeEnd);
}

function clearSelection() {
  selectedTrackId.value = null;
  selectedTrackType.value = null;
}

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleRangeResizeMove);
  document.removeEventListener("mouseup", handleRangeResizeEnd);
});

defineExpose({
  selectedTrackId,
  selectedTrackType,
  clearSelection,
  selectTrack,
});
</script>

<style scoped>
.timeline-section {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #16213e;
  border-radius: 6px;
  margin-bottom: 12px;
}

.frame-counter {
  font-weight: 600;
  color: #e94560;
  font-size: 14px;
}

.fps-info {
  color: #a0a0a0;
  font-size: 12px;
}

.interpolation-controls-row {
  background: #16213e;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.interpolation-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.track-id {
  color: #a0a0a0;
  font-size: 12px;
  font-family: monospace;
}

.keyframe-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #2d3a4f;
  color: #7ec8e3;
}

.keyframe-status.is-keyframe {
  background: #e94560;
  color: white;
}

.interpolation-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0e0;
}

.interpolation-toggle input {
  cursor: pointer;
}

.control-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #e94560;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: #ff6b6b;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.small {
  padding: 4px 10px;
  font-size: 11px;
}

.timeline-tracks-container {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.timeline-empty {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.timeline-track-row {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  background: #16213e;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.timeline-track-row:hover {
  background: #1f2b3e;
}

.timeline-track-row.selected {
  border-color: #e94560;
  background: #1f2b3e;
}

.track-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
  padding-right: 12px;
}

.track-icon {
  font-size: 14px;
}

.track-name {
  font-size: 11px;
  color: #a0a0a0;
  font-family: monospace;
}

.keyframe-count {
  font-size: 10px;
  color: #666;
  background: #0f0f1a;
  padding: 2px 6px;
  border-radius: 8px;
}

.track-timeline {
  flex: 1;
  height: 24px;
  position: relative;
  background: #0f0f1a;
  border-radius: 4px;
  overflow: visible;
}

.current-frame-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e94560;
  z-index: 10;
  pointer-events: none;
}

.playhead {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #e94560;
}

.timeline-segment-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 3px;
  border: 1px solid;
  transition: opacity 0.2s;
}

.timeline-segment-bar.bbox {
  background: rgba(255, 0, 0, 0.25);
  border-color: #ff0000;
}

.timeline-segment-bar.polygon {
  background: rgba(0, 255, 0, 0.25);
  border-color: #00ff00;
}

.timeline-segment-bar.skeleton {
  background: rgba(0, 0, 255, 0.25);
  border-color: #0000ff;
}

.timeline-segment-bar.brush {
  background: rgba(255, 165, 0, 0.25);
  border-color: #ffa500;
}

.timeline-segment-bar.selected {
  opacity: 1;
}

.resize-handle {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 12px;
  cursor: ew-resize;
  background: transparent;
  z-index: 20;
}

.resize-handle.left {
  left: -6px;
}

.resize-handle.right {
  right: -6px;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.keyframe-diamond {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  cursor: pointer;
}

.diamond-shape {
  width: 10px;
  height: 10px;
  background: #ffd700;
  transform: rotate(45deg);
  border: 1px solid #b8860b;
  transition: all 0.2s;
}

.keyframe-diamond:hover .diamond-shape {
  transform: rotate(45deg) scale(1.3);
}

.keyframe-diamond.active .diamond-shape {
  background: #ff4500;
  border-color: #cc3700;
}

.keyframe-diamond.selected .diamond-shape {
  background: #e94560;
  border-color: white;
  box-shadow: 0 0 8px rgba(233, 69, 96, 0.8);
}

.timeline-scrubber-container {
  padding: 8px 4px;
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
