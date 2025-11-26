<template>
  <div class="konva-container">
    <!-- Video Source Tabs -->
    <div class="video-tabs">
      <button
        v-for="(config, key) in VIDEO_SOURCES"
        :key="key"
        @click="switchVideoTab(key as VideoTab)"
        :class="['tab-btn', { active: activeVideoTab === key }]"
        :disabled="isTransitioning"
      >
        {{ config.label }}
      </button>
      <button
        @click="clearAllAnnotations"
        class="tab-btn clear-btn"
        :disabled="isTransitioning"
      >
        Clear All Data
      </button>
    </div>

    <div v-if="videoLoaded" class="controls">
      <div class="control-row">
        <button @click="togglePlayPause" class="control-btn">
          {{ isPlaying ? "Pause" : "Play" }}
        </button>
        <button @click="resetVideo" class="control-btn">Reset</button>

        <div class="frame-navigation">
          <button @click="previousFrame" class="control-btn small">
            ◄ Frame
          </button>
          <button @click="nextFrame" class="control-btn small">Frame ►</button>
          <button
            @click="handleJumpToPreviousKeyframe"
            class="control-btn small"
            :disabled="
              !selectedTrackId &&
              !selectedBboxTrackId &&
              !selectedPolygonTrackId &&
              !selectedSkeletonTrackId
            "
          >
            ◄◄ Keyframe
          </button>
          <button
            @click="handleJumpToNextKeyframe"
            class="control-btn small"
            :disabled="
              !selectedTrackId &&
              !selectedBboxTrackId &&
              !selectedPolygonTrackId &&
              !selectedSkeletonTrackId
            "
          >
            Keyframe ►►
          </button>
        </div>

        <div class="frame-duration-control">
          <label>Sec/Frame: {{ secondsPerFrame.toFixed(2) }}s</label>
          <input
            type="range"
            min="0.033"
            max="10"
            step="0.01"
            :value="secondsPerFrame"
            @input="handleFrameDurationChange"
            class="frame-duration-slider"
          />
          <span class="fps-display">({{ videoFPS.toFixed(2) }} fps)</span>
        </div>

        <div class="tool-selector">
          <button
            @click="currentTool = Tool.PAN"
            :class="['tool-btn', { active: currentTool === Tool.PAN }]"
          >
            Pan
          </button>
          <button
            @click="currentTool = Tool.BRUSH"
            :class="['tool-btn', { active: currentTool === Tool.BRUSH }]"
          >
            Brush
          </button>
          <button
            @click="currentTool = Tool.ERASER"
            :class="['tool-btn', { active: currentTool === Tool.ERASER }]"
          >
            Eraser
          </button>
          <button
            @click="currentTool = Tool.BBOX"
            :class="['tool-btn', { active: currentTool === Tool.BBOX }]"
          >
            BBox
          </button>
          <button
            @click="currentTool = Tool.POLYGON"
            :class="['tool-btn', { active: currentTool === Tool.POLYGON }]"
          >
            Polygon
          </button>
          <button
            @click="currentTool = Tool.SKELETON"
            :class="['tool-btn', { active: currentTool === Tool.SKELETON }]"
          >
            Skeleton
          </button>
          <button
            @click="currentTool = Tool.SELECT"
            :class="['tool-btn', { active: currentTool === Tool.SELECT }]"
          >
            Select
          </button>
          <button
            @click="handleDeleteSelected"
            class="tool-btn delete"
            :disabled="
              !selectedTrackId &&
              !selectedBboxTrackId &&
              !selectedPolygonTrackId &&
              !selectedSkeletonTrackId
            "
          >
            Delete
          </button>
        </div>

        <div
          v-if="currentTool === Tool.BRUSH || currentTool === Tool.ERASER"
          class="brush-controls"
        >
          <label>
            Size: {{ brushSize }}px
            <input
              type="range"
              v-model.number="brushSize"
              min="10"
              max="50"
              class="brush-slider"
            />
          </label>
          <label v-if="currentTool === Tool.BRUSH">
            Color:
            <input type="color" v-model="brushColor" class="color-picker" />
          </label>
        </div>

        <div v-if="currentTool === Tool.BBOX" class="bbox-controls">
          <label>
            Color:
            <input type="color" v-model="bboxColor" class="color-picker" />
          </label>
        </div>

        <div v-if="currentTool === Tool.POLYGON" class="polygon-controls">
          <label>
            Color:
            <input type="color" v-model="polygonColor" class="color-picker" />
          </label>
          <span v-if="polygonTool.isDrawing.value" class="drawing-hint">
            Click to add points. Double-click or click near start to complete.
          </span>
        </div>

        <div v-if="currentTool === Tool.SKELETON" class="skeleton-controls">
          <label>
            Color:
            <input type="color" v-model="skeletonColor" class="color-picker" />
          </label>
          <span v-if="skeletonTool.isDrawing.value" class="drawing-hint">
            Click to add keypoints. Double-click to complete.
          </span>
        </div>

        <div class="opacity-controls">
          <label>
            Opacity: {{ Math.round(segmentationOpacity * 100) }}%
            <input
              type="range"
              v-model.number="segmentationOpacity"
              min="0"
              max="1"
              step="0.01"
              class="opacity-slider"
            />
          </label>
        </div>

        <div class="info">
          <span class="video-info">{{ videoFileName }}</span>
          <span class="frame-info"
            >Frame: {{ currentFrame }} / {{ totalFrames }}</span
          >
          <span class="zoom-info"
            >Zoom: {{ Math.round(stageScale * 100) }}%</span
          >
        </div>
      </div>

      <div
        v-if="
          selectedTrack ||
          selectedBboxTrack ||
          selectedPolygonTrack ||
          selectedSkeletonTrack
        "
        class="interpolation-controls-row"
      >
        <div class="interpolation-info">
          <span class="track-id">
            Track:
            {{
              (
                selectedTrackId ||
                selectedBboxTrackId ||
                selectedPolygonTrackId ||
                selectedSkeletonTrackId
              )?.substring(0, 16)
            }}...
          </span>
          <span
            class="keyframe-status"
            :class="{
              'is-keyframe':
                isCurrentFrameKeyframe ||
                isBboxCurrentFrameKeyframe ||
                isPolygonCurrentFrameKeyframe ||
                isSkeletonCurrentFrameKeyframe,
            }"
          >
            {{
              isCurrentFrameKeyframe ||
              isBboxCurrentFrameKeyframe ||
              isPolygonCurrentFrameKeyframe ||
              isSkeletonCurrentFrameKeyframe
                ? "🔑 Keyframe"
                : "🔄 Interpolated"
            }}
          </span>
          <label class="interpolation-toggle">
            <input
              type="checkbox"
              :checked="
                (selectedTrack && selectedTrack.interpolationEnabled) ||
                (selectedBboxTrack && selectedBboxTrack.interpolationEnabled) ||
                (selectedPolygonTrack &&
                  selectedPolygonTrack.interpolationEnabled) ||
                (selectedSkeletonTrack &&
                  selectedSkeletonTrack.interpolationEnabled) ||
                false
              "
              @change="handleToggleInterpolation"
            />
            <span>
              Interpolation
              {{
                (selectedTrack && selectedTrack.interpolationEnabled) ||
                (selectedBboxTrack && selectedBboxTrack.interpolationEnabled) ||
                (selectedPolygonTrack &&
                  selectedPolygonTrack.interpolationEnabled) ||
                (selectedSkeletonTrack &&
                  selectedSkeletonTrack.interpolationEnabled)
                  ? "ON"
                  : "OFF"
              }}
            </span>
          </label>
          <button
            v-if="selectedTrackId"
            @click="addManualKeyframe"
            class="control-btn small"
            :disabled="isCurrentFrameKeyframe"
          >
            + Add Keyframe (K)
          </button>
        </div>
      </div>

      <div class="timeline-section">
        <div class="timeline-header">
          <span class="frame-counter"
            >{{ currentFrame }} / {{ totalFrames }}</span
          >
          <span class="timestamp"
            >{{ formatTime(currentTime) }} /
            {{ formatTime(videoDuration) }}</span
          >
        </div>

        <div class="timeline-tracks-container">
          <div
            v-if="
              tracks.size === 0 &&
              bboxTracks.size === 0 &&
              polygonTracks.size === 0 &&
              skeletonTracks.size === 0
            "
            class="timeline-empty"
          >
            No tracks yet. Draw with brush, bbox, polygon, or skeleton
            tool to create one.
          </div>

          <div
            v-for="[trackId, track] in Array.from(tracks.entries())"
            :key="trackId"
            class="timeline-track-row"
            :class="{ selected: selectedTrackId === trackId }"
            @click="selectBrushTrack(trackId)"
          >
            <div class="track-label">
              <span class="track-icon">🖌️</span>
              <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
              <span class="keyframe-count"
                >{{ track.keyframes.size }} keys</span
              >
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
                :key="`${trackId}-range-${rangeIndex}`"
                class="timeline-segment-bar"
                :class="{ selected: selectedTrackId === trackId }"
                :style="{
                  left: (range[0] / (totalFrames || 1)) * 100 + '%',
                  width:
                    ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
                }"
              >
                <div
                  class="resize-handle left"
                  @mousedown="
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
                  @mousedown="
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
                :key="`${trackId}-${frameNum}`"
                v-show="isFrameInRanges(frameNum, track.ranges || [])"
                class="keyframe-diamond"
                :class="{
                  active: frameNum === currentFrame,
                  selected:
                    selectedTrackId === trackId && frameNum === currentFrame,
                }"
                :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
                @click.stop="jumpToFrame(frameNum)"
              >
                <div class="diamond-shape"></div>
              </div>
            </div>
          </div>

          <div
            v-for="[trackId, track] in Array.from(bboxTracks.entries())"
            :key="trackId"
            class="timeline-track-row"
            :class="{ selected: selectedBboxTrackId === trackId }"
            @click="selectBboxTrack(trackId)"
          >
            <div class="track-label">
              <span class="track-icon">⬜</span>
              <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
              <span class="keyframe-count"
                >{{ track.keyframes.size }} keys</span
              >
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
                :class="{ selected: selectedBboxTrackId === trackId }"
                :style="{
                  left: (range[0] / (totalFrames || 1)) * 100 + '%',
                  width:
                    ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
                  backgroundColor: track.color + '40',
                  borderColor: track.color,
                }"
              >
                <div
                  class="resize-handle left"
                  @mousedown="
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
                  @mousedown="
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
                v-show="isBboxFrameInRanges(frameNum, track.ranges || [])"
                class="keyframe-diamond"
                :class="{
                  active: frameNum === currentFrame,
                  selected:
                    selectedBboxTrackId === trackId &&
                    frameNum === currentFrame,
                }"
                :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
                @click.stop="jumpToFrame(frameNum)"
              >
                <div class="diamond-shape"></div>
              </div>
            </div>
          </div>

          <div
            v-for="[trackId, track] in Array.from(polygonTracks.entries())"
            :key="trackId"
            class="timeline-track-row"
            :class="{ selected: selectedPolygonTrackId === trackId }"
            @click="selectPolygonTrack(trackId)"
          >
            <div class="track-label">
              <span class="track-icon">🔷</span>
              <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
              <span class="keyframe-count"
                >{{ track.keyframes.size }} keys</span
              >
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
                :class="{ selected: selectedPolygonTrackId === trackId }"
                :style="{
                  left: (range[0] / (totalFrames || 1)) * 100 + '%',
                  width:
                    ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
                  backgroundColor: track.color + '40',
                  borderColor: track.color,
                }"
              >
                <div
                  class="resize-handle left"
                  @mousedown="
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
                  @mousedown="
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
                v-show="isPolygonFrameInRanges(frameNum, track.ranges || [])"
                class="keyframe-diamond"
                :class="{
                  active: frameNum === currentFrame,
                  selected:
                    selectedPolygonTrackId === trackId &&
                    frameNum === currentFrame,
                }"
                :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
                @click.stop="jumpToFrame(frameNum)"
              >
                <div class="diamond-shape"></div>
              </div>
            </div>
          </div>

          <div
            v-for="[trackId, track] in Array.from(skeletonTracks.entries())"
            :key="trackId"
            class="timeline-track-row"
            :class="{ selected: selectedSkeletonTrackId === trackId }"
            @click="selectSkeletonTrack(trackId)"
          >
            <div class="track-label">
              <span class="track-icon">🦴</span>
              <span class="track-name">{{ trackId.substring(0, 12) }}...</span>
              <span class="keyframe-count"
                >{{ track.keyframes.size }} keys</span
              >
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
                :class="{ selected: selectedSkeletonTrackId === trackId }"
                :style="{
                  left: (range[0] / (totalFrames || 1)) * 100 + '%',
                  width:
                    ((range[1] - range[0]) / (totalFrames || 1)) * 100 + '%',
                  backgroundColor: track.color + '40',
                  borderColor: track.color,
                }"
              >
                <div
                  class="resize-handle left"
                  @mousedown="
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
                  @mousedown="
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
                v-show="isSkeletonFrameInRanges(frameNum, track.ranges || [])"
                class="keyframe-diamond"
                :class="{
                  active: frameNum === currentFrame,
                  selected:
                    selectedSkeletonTrackId === trackId &&
                    frameNum === currentFrame,
                }"
                :style="{ left: (frameNum / (totalFrames || 1)) * 100 + '%' }"
                @click.stop="jumpToFrame(frameNum)"
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
    </div>

    <v-stage
      v-if="videoLoaded"
      ref="stageRef"
      :config="stageConfig"
      @wheel="handleWheel"
      :class="{ 'pan-tool-active': currentTool === Tool.PAN }"
    >
      <v-layer ref="videoLayerRef">
        <v-image
          :config="{
            image: videoElement,
            x: 0,
            y: 0,
            width: workingResolution.width,
            height: workingResolution.height,
          }"
        />
      </v-layer>

      <v-layer
        ref="drawingLayerRef"
        :config="{ imageSmoothingEnabled: false, opacity: segmentationOpacity }"
      >
        <v-image
          v-if="brushImageConfig"
          ref="brushImageRef"
          :config="brushImageConfig"
        />
      </v-layer>

      <v-layer ref="bboxLayerRef">
        <v-group
          v-for="box in visibleBboxes"
          :key="box.id"
          :config="{
            id: box.id,
            x: box.x * displayScale,
            y: box.y * displayScale,
            rotation: box.rotation,
            draggable: currentTool === Tool.SELECT,
            name: 'boundingBox',
          }"
          @dragend="handleBboxDragEnd"
          @transformend="handleBboxTransformEnd"
          @click="handleBboxClick"
        >
          <v-rect
            :config="{
              width: box.width * displayScale,
              height: box.height * displayScale,
              stroke: box.color,
              strokeWidth: 2,
              fill: box.color + '20',
            }"
          />
        </v-group>
      </v-layer>

      <v-layer ref="polygonLayerRef">
        <template v-for="polygon in visiblePolygons" :key="polygon.id">
          <v-line
            :config="{
              id: polygon.id,
              points: polygon.points.flatMap((p) => [
                p.x * displayScale,
                p.y * displayScale,
              ]),
              fill: polygon.color + '30',
              stroke: polygon.color,
              strokeWidth: currentTool === Tool.PAN ? 4 : 2,
              closed: true,
              draggable: currentTool === Tool.SELECT,
              name: 'polygon',
              hitStrokeWidth: currentTool === Tool.PAN ? 10 : 0,
            }"
            @dragend="handlePolygonDragEnd"
            @transformend="handlePolygonTransformEnd"
            @click="(e: any) => handlePolygonLineClick(e, polygon.id)"
          />
          <!-- Vertex points -->
          <v-circle
            v-for="(point, pointIdx) in polygon.points"
            :key="`${polygon.id}-pt-${pointIdx}`"
            :config="{
              x: point.x * displayScale,
              y: point.y * displayScale,
              radius: 6,
              fill: polygon.color,
              stroke:
                selectedPolygonTrackId === polygon.id
                  ? '#fff'
                  : polygon.color,
              strokeWidth: selectedPolygonTrackId === polygon.id ? 2 : 1,
              draggable: currentTool === Tool.SELECT || currentTool === Tool.PAN,
              name: 'polygonVertex',
            }"
            @dragmove="(e: any) => handlePolygonPointDragging(e, polygon.id, pointIdx)"
            @dragend="(e: any) => handlePolygonPointDragEnd(e, polygon.id, pointIdx)"
            @click="() => handlePolygonVertexClick(polygon.id)"
            @dblclick="() => handlePolygonPointDelete(polygon.id, pointIdx)"
          />
        </template>
      </v-layer>

      <v-layer ref="skeletonLayerRef">
        <template v-for="skeleton in visibleSkeletons" :key="skeleton.id">
          <!-- Lines connecting keypoints -->
          <v-line
            :config="{
              id: skeleton.id,
              points: skeleton.points.flatMap((p) => [
                p.x * displayScale,
                p.y * displayScale,
              ]),
              stroke: skeleton.color,
              strokeWidth: currentTool === Tool.PAN ? 4 : 2,
              lineCap: 'round',
              lineJoin: 'round',
              draggable: currentTool === Tool.SELECT,
              name: 'skeleton',
              hitStrokeWidth: currentTool === Tool.PAN ? 10 : 0,
            }"
            @dragend="handleSkeletonDragEnd"
            @click="(e: any) => handleSkeletonLineClick(e, skeleton.id)"
          />
          <!-- Keypoints -->
          <v-circle
            v-for="(point, pointIdx) in skeleton.points"
            :key="`${skeleton.id}-kp-${pointIdx}`"
            :config="{
              x: point.x * displayScale,
              y: point.y * displayScale,
              radius: 6,
              fill: skeleton.color,
              stroke:
                selectedSkeletonTrackId === skeleton.id
                  ? '#fff'
                  : skeleton.color,
              strokeWidth: selectedSkeletonTrackId === skeleton.id ? 2 : 1,
              draggable: currentTool === Tool.SELECT || currentTool === Tool.SKELETON || currentTool === Tool.PAN,
              name: 'skeletonKeypoint',
            }"
            @dragmove="(e: any) => handleSkeletonKeypointDragging(e, skeleton.id, pointIdx)"
            @dragend="(e: any) => handleSkeletonKeypointDrag(e, skeleton.id, pointIdx)"
            @click="() => handleSkeletonClick(skeleton.id)"
            @dblclick="() => handleSkeletonKeypointDelete(skeleton.id, pointIdx)"
          />
        </template>
      </v-layer>
    </v-stage>

    <div v-else class="placeholder">
      <p>Upload a video to get started</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  nextTick,
  onBeforeUnmount,
} from "vue";
import Konva from "konva";
import { useVideoPlayer } from "../composables/useVideoPlayer";
import { useBrushTracks } from "../composables/useBrushTracks";
import { useBoundingBoxTracks } from "../composables/useBoundingBoxTracks";
import { usePolygonTracks } from "../composables/usePolygonTracks";
import { useSkeletonTracks } from "../composables/useSkeletonTracks";
import type { Skeleton } from "../types/skeleton";
import { useAnnotationStore } from "../stores/annotationStore";
import {
  createKonvaSegmentationBrush,
  KonvaSegmentationBrush,
} from "../utils/konvaBrush";
import {
  getSegmentationImageContoursForSaving,
  getImageFromContours,
} from "../utils/opencv-contours";
import type { ToolClass, SegmentationContour } from "../types/contours";
import type { BoundingBox } from "../types/boundingBox";
import type { Polygon } from "../types/polygon";
import { formatTime } from "../utils/formatters";
import { Tool, TrackType, ResizeEdge, VideoTab } from "../types/enums";
import {
  VIDEO_SOURCES,
  MAX_WORKING_DIMENSION,
  DEFAULT_STAGE_CONFIG,
  CONTAINER_DIMENSIONS,
  MAX_STAGE_DIMENSIONS,
  DEFAULT_COLORS,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_SEGMENTATION_OPACITY,
  MIN_BBOX_SIZE,
  DEFAULT_TOOL_CLASS,
  KONVA_PIXEL_RATIO,
} from "../constants/canvas";
import {
  usePolygonTool,
  useSkeletonTool,
  useBboxTool,
  useSelectTool,
} from "../composables/tools";

// Initialize Pinia store
const annotationStore = useAnnotationStore();

const stageRef = ref<any>(null);
const drawingLayerRef = ref<any>(null);
const bboxLayerRef = ref<any>(null);
const polygonLayerRef = ref<any>(null);
const brushImageRef = ref<any>(null);
const segmentationBrush = ref<KonvaSegmentationBrush | null>(null);
const transformerRef = ref<Konva.Transformer | null>(null);

// Video tab state
const activeVideoTab = ref<VideoTab>(VideoTab.HD);
const isTransitioning = ref(false);

const {
  videoElement,
  videoLoaded,
  videoFileName,
  isPlaying,
  videoSize,
  currentFrame,
  currentTime,
  videoDuration,
  videoFPS,
  secondsPerFrame,
  setSecondsPerFrame,
  videoLayerRef,
  loadVideoFromUrl,
  togglePlayPause,
  resetVideo,
  seekToTime: seek,
  nextFrame,
  previousFrame,
} = useVideoPlayer();

const {
  tracks,
  selectedTrackId,
  selectedTrack,
  isCurrentFrameKeyframe,
  createTrackLegacy: createTrack,
  addKeyframe,
  getContoursAtFrame,
  toggleInterpolation,
  deleteTrack,
  jumpToNextKeyframe,
  jumpToPreviousKeyframe,
  isFrameInRanges,
} = useBrushTracks(currentFrame);

const {
  tracks: bboxTracks,
  selectedTrackId: selectedBboxTrackId,
  selectedTrack: selectedBboxTrack,
  isCurrentFrameKeyframe: isBboxCurrentFrameKeyframe,
  createTrack: createBboxTrack,
  getBoxAtFrame,
  updateKeyframe: updateBboxKeyframe,
  toggleInterpolation: toggleBboxInterpolation,
  deleteTrack: deleteBboxTrack,
  jumpToNextKeyframe: jumpToNextBboxKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousBboxKeyframe,
  isFrameInRanges: isBboxFrameInRanges,
} = useBoundingBoxTracks(currentFrame);

const {
  tracks: polygonTracks,
  selectedTrackId: selectedPolygonTrackId,
  selectedTrack: selectedPolygonTrack,
  isCurrentFrameKeyframe: isPolygonCurrentFrameKeyframe,
  createTrack: createPolygonTrack,
  getPolygonAtFrame,
  updateKeyframe: updatePolygonKeyframe,
  toggleInterpolation: togglePolygonInterpolation,
  deleteTrack: deletePolygonTrack,
  jumpToNextKeyframe: jumpToNextPolygonKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousPolygonKeyframe,
  isFrameInRanges: isPolygonFrameInRanges,
} = usePolygonTracks(currentFrame);

const {
  tracks: skeletonTracks,
  selectedTrackId: selectedSkeletonTrackId,
  selectedTrack: selectedSkeletonTrack,
  isCurrentFrameKeyframe: isSkeletonCurrentFrameKeyframe,
  createTrack: createSkeletonTrack,
  getSkeletonAtFrame,
  updateKeyframe: updateSkeletonKeyframe,
  toggleInterpolation: toggleSkeletonInterpolation,
  deleteTrack: deleteSkeletonTrack,
  jumpToNextKeyframe: jumpToNextSkeletonKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousSkeletonKeyframe,
  isFrameInRanges: isSkeletonFrameInRanges,
} = useSkeletonTracks(currentFrame);

const skeletonLayerRef = ref<any>(null);
const skeletonColor = ref(DEFAULT_COLORS.skeleton);

const stageScale = ref(1);
const stageConfig = ref({
  width: DEFAULT_STAGE_CONFIG.width as number,
  height: DEFAULT_STAGE_CONFIG.height as number,
  draggable: DEFAULT_STAGE_CONFIG.draggable,
  scaleX: DEFAULT_STAGE_CONFIG.scaleX as number,
  scaleY: DEFAULT_STAGE_CONFIG.scaleY as number,
});

const workingResolution = computed(() => {
  const { width, height } = videoSize.value;
  if (!width || !height) return { width: 0, height: 0 };

  // If video is already smaller than max, use original
  if (width <= MAX_WORKING_DIMENSION && height <= MAX_WORKING_DIMENSION) {
    return { width, height };
  }

  // Scale down to fit within MAX_WORKING_DIMENSION
  const scale = Math.min(
    MAX_WORKING_DIMENSION / width,
    MAX_WORKING_DIMENSION / height
  );

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
});

// Scale factor from original to working resolution (e.g., 0.5 for 4K→1080p)
const displayScale = computed(() => {
  const { width } = videoSize.value;
  const { width: workingWidth } = workingResolution.value;
  if (!width || !workingWidth) return 1;
  return workingWidth / width;
});

// Scale factor from working to original resolution (e.g., 2.0 for 1080p→4K storage)
const storageScale = computed(() => {
  const scale = displayScale.value;
  return scale > 0 ? 1 / scale : 1;
});

// Initial stage scale to fit working resolution in container
const initialStageScale = computed(() => {
  const { width: workingWidth, height: workingHeight } =
    workingResolution.value;
  if (!workingWidth || !workingHeight) return 1;

  return Math.min(
    CONTAINER_DIMENSIONS.width / workingWidth,
    CONTAINER_DIMENSIONS.height / workingHeight,
    1 // Don't scale up if smaller than container
  );
});

const currentTool = ref<Tool>(Tool.PAN);
const brushSize = ref(DEFAULT_BRUSH_SIZE);
const brushColor = ref(DEFAULT_COLORS.brush);
const bboxColor = ref(DEFAULT_COLORS.bbox);
const polygonColor = ref(DEFAULT_COLORS.polygon);
const segmentationOpacity = ref(DEFAULT_SEGMENTATION_OPACITY);

// Save all annotations to API via Pinia store
const saveAllAnnotationsToApi = async () => {
  if (!videoFileName.value) return;

  try {
    // Sync composable data to store
    annotationStore.setAllTracks({
      bbox: bboxTracks.value,
      polygon: polygonTracks.value,
      skeleton: skeletonTracks.value,
      brush: tracks.value,
    });
    annotationStore.setVideoFileName(videoFileName.value);

    // Save via store
    await annotationStore.save();
  } catch (error) {
    console.error("Failed to save annotations to API:", error);
  }
};

// Load all annotations from API via Pinia store
const loadAllAnnotationsFromApi = async () => {
  if (!videoFileName.value) return;

  try {
    // Load via store
    await annotationStore.load(videoFileName.value);

    // Sync store data to composables
    tracks.value = annotationStore.brushTracks;
    bboxTracks.value = annotationStore.bboxTracks;
    polygonTracks.value = annotationStore.polygonTracks;
    skeletonTracks.value = annotationStore.skeletonTracks;
  } catch (error) {
    console.error("Failed to load annotations from API:", error);
  }
};

const brushImageConfig = ref<any>(null);
const isDrawing = ref(false);
const drawingStartFrame = ref(0);

const isResizingRange = ref(false);
const resizeTrackId = ref<string | null>(null);
const resizeTrackType = ref<TrackType | null>(null);
const resizeRangeIndex = ref(0);
const resizeEdge = ref<ResizeEdge | null>(null);
const resizeStartX = ref(0);
const resizeStartFrame = ref(0);

const toolClasses = ref<ToolClass[]>([DEFAULT_TOOL_CLASS]);

const totalFrames = computed(() => {
  return Math.floor(videoDuration.value * videoFPS.value);
});

const currentFramePercentage = computed(() => {
  if (totalFrames.value === 0) return 0;
  return (currentFrame.value / totalFrames.value) * 100;
});

const visibleBboxes = computed(() => {
  const boxes: BoundingBox[] = [];

  for (const [trackId, track] of bboxTracks.value.entries()) {
    const isInRange = track.ranges.some(
      ([start, end]) => currentFrame.value >= start && currentFrame.value < end
    );

    if (!isInRange) continue;

    const box = getBoxAtFrame(trackId, currentFrame.value);
    if (box) {
      boxes.push(box);
    }
  }

  return boxes;
});

const visiblePolygons = computed(() => {
  const polygons: Polygon[] = [];

  for (const [trackId, track] of polygonTracks.value.entries()) {
    const isInRange = track.ranges.some(
      ([start, end]) => currentFrame.value >= start && currentFrame.value < end
    );

    if (!isInRange) continue;

    const polygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (polygon) {
      polygons.push(polygon);
    }
  }

  return polygons;
});

const visibleSkeletons = computed(() => {
  const skeletons: Skeleton[] = [];

  for (const [trackId, track] of skeletonTracks.value.entries()) {
    const isInRange = track.ranges.some(
      ([start, end]) => currentFrame.value >= start && currentFrame.value < end
    );

    if (!isInRange) continue;

    const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (skeleton) {
      skeletons.push(skeleton);
    }
  }

  return skeletons;
});

const selectBrushTrack = (trackId: string) => {
  selectedTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  updateTransformerSelection();
};

const selectBboxTrack = (trackId: string) => {
  selectedBboxTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  updateTransformerSelection();
};

const selectPolygonTrack = (trackId: string) => {
  selectedPolygonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  updateTransformerSelection();
};

const selectSkeletonTrack = (trackId: string) => {
  selectedSkeletonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  updateTransformerSelection();
};

const handleFrameDurationChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const newValue = parseFloat(target.value);

  const hasAnyTracks =
    tracks.value.size > 0 ||
    bboxTracks.value.size > 0 ||
    polygonTracks.value.size > 0 ||
    skeletonTracks.value.size > 0;

  if (hasAnyTracks) {
    const confirmChange = window.confirm(
      "Changing frame duration will affect existing annotations. " +
        "Keyframes will remain at the same frame numbers but represent different times. " +
        "Continue?"
    );
    if (!confirmChange) {
      target.value = secondsPerFrame.value.toString();
      return;
    }
  }

  setSecondsPerFrame(newValue);
};

const jumpToFrame = (frame: number) => {
  seekToFrame(frame);
};

const handleScrubberInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const frame = parseInt(target.value);
  jumpToFrame(frame);
};

const seekToFrame = (frame: number) => {
  const time = frame / videoFPS.value;
  seek(time);
};

const handleJumpToNextKeyframe = () => {
  if (selectedTrackId.value) {
    jumpToNextKeyframe(seekToFrame);
  } else if (selectedBboxTrackId.value) {
    jumpToNextBboxKeyframe(seekToFrame);
  } else if (selectedPolygonTrackId.value) {
    jumpToNextPolygonKeyframe(seekToFrame);
  } else if (selectedSkeletonTrackId.value) {
    jumpToNextSkeletonKeyframe(seekToFrame);
  }
};

const handleJumpToPreviousKeyframe = () => {
  if (selectedTrackId.value) {
    jumpToPreviousKeyframe(seekToFrame);
  } else if (selectedBboxTrackId.value) {
    jumpToPreviousBboxKeyframe(seekToFrame);
  } else if (selectedPolygonTrackId.value) {
    jumpToPreviousPolygonKeyframe(seekToFrame);
  } else if (selectedSkeletonTrackId.value) {
    jumpToPreviousSkeletonKeyframe(seekToFrame);
  }
};

const handleToggleInterpolation = async () => {
  if (selectedTrackId.value) {
    toggleInterpolation(selectedTrackId.value);
    await saveAllAnnotationsToApi();
    loadBrushCanvasForFrame();
  } else if (selectedBboxTrackId.value) {
    toggleBboxInterpolation(selectedBboxTrackId.value);
    await saveAllAnnotationsToApi();
  } else if (selectedPolygonTrackId.value) {
    togglePolygonInterpolation(selectedPolygonTrackId.value);
    await saveAllAnnotationsToApi();
  } else if (selectedSkeletonTrackId.value) {
    toggleSkeletonInterpolation(selectedSkeletonTrackId.value);
    await saveAllAnnotationsToApi();
  }
};

watch(videoSize, (newSize) => {
  if (!newSize.width || !newSize.height) return;

  // Use working resolution for stage sizing
  const { width: workingWidth, height: workingHeight } =
    workingResolution.value;

  // Calculate initial scale to fit working resolution in container
  const initScale = initialStageScale.value;
  stageScale.value = initScale;

  // Stage dimensions (container size)
  let stageWidth = Math.min(workingWidth * initScale + 100, MAX_STAGE_DIMENSIONS.width);
  let stageHeight = Math.min(workingHeight * initScale + 100, MAX_STAGE_DIMENSIONS.height);

  stageConfig.value = {
    ...stageConfig.value,
    width: stageWidth,
    height: stageHeight,
    scaleX: initScale,
    scaleY: initScale,
  };

  // Log 4K support info
  if (newSize.width > 1920 || newSize.height > 1080) {
    console.log(
      `4K Support: Original ${newSize.width}×${
        newSize.height
      } → Working ${workingWidth}×${workingHeight} (scale: ${displayScale.value.toFixed(
        3
      )})`
    );
  }
});

watch(currentFrame, async () => {
  if (isDrawing.value) {
    return;
  }
  await loadBrushCanvasForFrame();
  updateTransformerSelection();
});

const initializeOffscreenCanvas = async () => {
  if (!videoSize.value.width || !videoSize.value.height || !stageRef.value)
    return;

  const stage = stageRef.value.getNode();
  const { width: workingWidth, height: workingHeight } =
    workingResolution.value;

  // Create brush at WORKING resolution (not original) for performance
  segmentationBrush.value = await createKonvaSegmentationBrush(
    stage,
    workingWidth,
    workingHeight,
    {
      brushSize: brushSize.value,
      brushColor: brushColor.value,
    }
  );

  segmentationBrush.value.setOpacity(segmentationOpacity.value);

  const offscreenCanvas = segmentationBrush.value.getOffscreenCanvas();

  // Display at working resolution
  brushImageConfig.value = {
    image: offscreenCanvas,
    x: 0,
    y: 0,
    width: workingWidth,
    height: workingHeight,
    listening: false,
  };

  await loadBrushCanvasForFrame();
};

const loadBrushCanvasForFrame = async () => {
  if (!segmentationBrush.value) return;

  segmentationBrush.value.clearOffscreenCanvas();

  const allContours: SegmentationContour[] = [];
  const { width: workingWidth, height: workingHeight } =
    workingResolution.value;
  const scale = displayScale.value;

  for (const [trackId, track] of tracks.value.entries()) {
    const isInRange = track.ranges.some(
      ([start, end]) => currentFrame.value >= start && currentFrame.value < end
    );

    if (isInRange) {
      // Pass working resolution and display scale for proper scaling
      const result = await getContoursAtFrame(
        trackId,
        currentFrame.value,
        toolClasses.value,
        workingWidth,
        workingHeight,
        scale
      );

      if (result.contours.length > 0) {
        allContours.push(...result.contours);
      }
    }
  }

  if (allContours.length > 0) {
    // Render at working resolution with display scale
    const combinedCanvas = await getImageFromContours(
      toolClasses.value,
      allContours,
      scale,
      workingWidth,
      workingHeight
    );

    await segmentationBrush.value.loadFromCanvas(combinedCanvas);
  }

  updateBrushDisplay();
};

const updateBrushDisplay = () => {
  if (drawingLayerRef.value) {
    const layer = drawingLayerRef.value.getNode();
    if (layer) {
      layer.batchDraw();
    }
  }
};

const setupTransformer = () => {
  if (!bboxLayerRef.value) return;

  const layer = bboxLayerRef.value.getNode();

  transformerRef.value = new Konva.Transformer({
    nodes: [],
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
      if (newBox.width < MIN_BBOX_SIZE) newBox.width = MIN_BBOX_SIZE;
      if (newBox.height < MIN_BBOX_SIZE) newBox.height = MIN_BBOX_SIZE;
      return newBox;
    },
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
  });

  layer.add(transformerRef.value);
};

const updateTransformerSelection = () => {
  if (!transformerRef.value || !bboxLayerRef.value) return;

  if (!selectedBboxTrackId.value) {
    transformerRef.value.nodes([]);
    bboxLayerRef.value.getNode().batchDraw();
    return;
  }

  const layer = bboxLayerRef.value.getNode();
  const group = layer.findOne(`#${selectedBboxTrackId.value}`);

  if (group) {
    transformerRef.value.nodes([group]);
  } else {
    transformerRef.value.nodes([]);
  }

  layer.batchDraw();
};

const polygonTool = usePolygonTool({
  stageRef,
  layerRef: polygonLayerRef,
  currentFrame,
  totalFrames,
  storageScale,
  color: polygonColor,
  polygonTracks,
  selectedPolygonTrackId,
  selectedTrackId,
  selectedBboxTrackId,
  selectedSkeletonTrackId,
  createTrack: createPolygonTrack,
  getPolygonAtFrame,
  updateKeyframe: updatePolygonKeyframe,
  saveTrack: async () => { await saveAllAnnotationsToApi(); },
  videoFileName,
  updateTransformerSelection,
});

const skeletonTool = useSkeletonTool({
  stageRef,
  layerRef: skeletonLayerRef,
  currentFrame,
  totalFrames,
  storageScale,
  displayScale,
  color: skeletonColor,
  skeletonTracks,
  selectedSkeletonTrackId,
  selectedTrackId,
  selectedBboxTrackId,
  selectedPolygonTrackId,
  createTrack: createSkeletonTrack,
  getSkeletonAtFrame,
  updateKeyframe: updateSkeletonKeyframe,
  saveTrack: async () => { await saveAllAnnotationsToApi(); },
  videoFileName,
  updateTransformerSelection,
});

const bboxTool = useBboxTool({
  stageRef,
  layerRef: bboxLayerRef,
  currentFrame,
  totalFrames,
  storageScale,
  displayScale,
  color: bboxColor,
  bboxTracks,
  selectedBboxTrackId,
  selectedTrackId,
  selectedPolygonTrackId,
  selectedSkeletonTrackId,
  createTrack: createBboxTrack,
  getBoxAtFrame,
  updateKeyframe: updateBboxKeyframe,
  saveTrack: async () => { await saveAllAnnotationsToApi(); },
  videoFileName,
  updateTransformerSelection,
});

// Note: brushTool requires additional wrapper functions for proper integration
// const brushTool = useBrushTool({ ... });

const selectTool = useSelectTool({
  currentTool,
  selectedTrackId,
  selectedBboxTrackId,
  selectedPolygonTrackId,
  selectedSkeletonTrackId,
  tracks,
  bboxTracks,
  polygonTracks,
  skeletonTracks,
  deleteTrack,
  deleteBboxTrack,
  deletePolygonTrack,
  deleteSkeletonTrack,
  saveAllAnnotations: saveAllAnnotationsToApi,
  segmentationBrush,
});

const handleWheel = (e: any) => {
  e.evt.preventDefault();

  const stage = stageRef.value.getNode();
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const scaleBy = 1.1;
  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };

  stage.position(newPos);
  stageScale.value = newScale;
};

const handleStageMouseDown = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (currentTool.value === Tool.PAN) return;

  if (currentTool.value === Tool.POLYGON) {
    polygonTool.handleMouseDown(e);
    return;
  }

  if (currentTool.value === Tool.SKELETON) {
    skeletonTool.handleMouseDown(e);
    return;
  }

  if (currentTool.value === Tool.BBOX) {
    bboxTool.handleMouseDown(e);
    return;
  }

  if (currentTool.value === Tool.SELECT) {
    selectTool.handleMouseDown(e);
    updateTransformerSelection();
    return;
  }

  if (currentTool.value === Tool.BRUSH || currentTool.value === Tool.ERASER) {
    if (!stageRef.value || !segmentationBrush.value) return;

    drawingStartFrame.value = currentFrame.value;
    isDrawing.value = true;

    segmentationBrush.value.onMouseDown(e);
  }
};

const handleStageDblClick = async () => {
  if (currentTool.value === Tool.POLYGON && polygonTool.isDrawing.value) {
    await polygonTool.completeDrawing();
  }
  if (currentTool.value === Tool.SKELETON && skeletonTool.isDrawing.value) {
    await skeletonTool.completeDrawing();
  }
};

const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (!stageRef.value) return;

  const stage = stageRef.value.getNode();
  const pos = stage.getRelativePointerPosition();

  if (currentTool.value === Tool.POLYGON && polygonTool.isDrawing.value) {
    polygonTool.handleMouseMove(pos);
    return;
  }

  if (currentTool.value === Tool.SKELETON && skeletonTool.isDrawing.value) {
    skeletonTool.handleMouseMove(pos);
    return;
  }

  if (currentTool.value === Tool.BBOX && bboxTool.isDrawing.value) {
    bboxTool.handleMouseMove(pos);
    return;
  }

  if (!isDrawing.value || !segmentationBrush.value) return;
  segmentationBrush.value.onMouseMove(e);
};

const handleStageMouseUp = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (currentTool.value === Tool.BBOX && bboxTool.isDrawing.value) {
    await bboxTool.handleMouseUp();
    await nextTick();
    updateTransformerSelection();
    return;
  }

  if (currentTool.value === Tool.PAN || currentTool.value === Tool.SELECT) return;
  if (!isDrawing.value || !stageRef.value || !segmentationBrush.value) return;

  segmentationBrush.value.onMouseUp(e);

  const endFrame = currentFrame.value;
  const startFrame = drawingStartFrame.value;

  const offscreenCanvas = segmentationBrush.value.getOffscreenCanvas();
  // Extract at working resolution, scale UP to original resolution for storage
  const endContours = await getSegmentationImageContoursForSaving(
    offscreenCanvas,
    storageScale.value, // e.g., 2.0 for 1080p→4K
    toolClasses.value
  );

  if (endContours.length === 0) {
    isDrawing.value = false;
    return;
  }

  if (startFrame === endFrame) {
    const trackId = createTrack(
      startFrame,
      endContours,
      undefined,
      totalFrames.value
    );
    selectedTrackId.value = trackId;
    selectedBboxTrackId.value = null;

    const track = tracks.value.get(trackId);
    if (track) {
      try {
        await saveAllAnnotationsToApi();
      } catch (error) {
        console.error("Failed to save track:", error);
      }
    }
  } else {
    const trackId = createTrack(
      endFrame,
      endContours,
      undefined,
      totalFrames.value
    );
    selectedTrackId.value = trackId;
    selectedBboxTrackId.value = null;

    const track = tracks.value.get(trackId);
    if (track) {
      track.ranges = [[startFrame, endFrame + 1]];

      try {
        await saveAllAnnotationsToApi();
      } catch (error) {
        console.error("Failed to save track:", error);
      }
    }
  }

  isDrawing.value = false;

  if (segmentationBrush.value && drawingLayerRef.value) {
    const offscreenCanvas = segmentationBrush.value.getOffscreenCanvas();
    const { width: workingWidth, height: workingHeight } =
      workingResolution.value;

    brushImageConfig.value = {
      image: offscreenCanvas,
      x: 0,
      y: 0,
      width: workingWidth,
      height: workingHeight,
      listening: false,
    };

    await nextTick();

    if (brushImageRef.value) {
      const imageNode = brushImageRef.value.getNode();
      imageNode.image(offscreenCanvas);
    }

    drawingLayerRef.value.getNode().batchDraw();
    segmentationBrush.value.clearTempCanvas();
  }
};

const handleStageMouseOut = async () => {
  if (isDrawing.value && stageRef.value) {
    if (currentTool.value === Tool.BBOX && bboxTool.previewRect.value) {
      bboxTool.previewRect.value.destroy();
      bboxTool.previewRect.value = null;
      isDrawing.value = false;
      bboxLayerRef.value.getNode().batchDraw();
      return;
    }

    if (segmentationBrush.value) {
      const mockEvent = {
        evt: new MouseEvent("mouseup"),
      } as Konva.KonvaEventObject<MouseEvent>;
      await handleStageMouseUp(mockEvent);
    }
  }
};

const handleBboxClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (
    currentTool.value === Tool.BRUSH ||
    currentTool.value === Tool.ERASER ||
    currentTool.value === Tool.BBOX ||
    currentTool.value === Tool.POLYGON
  )
    return;

  const group = e.target.findAncestor("Group");
  if (group) {
    selectedBboxTrackId.value = group.id();
    selectedTrackId.value = null;
    selectedPolygonTrackId.value = null;
    currentTool.value = Tool.SELECT;
    updateTransformerSelection();
  }
};

const handleBboxDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  const group = e.target;
  const trackId = group.id();

  const track = bboxTracks.value.get(trackId);
  if (!track) return;

  const currentBox = getBoxAtFrame(trackId, currentFrame.value);
  if (!currentBox) return;

  // Convert working resolution back to original resolution for storage
  const scale = storageScale.value;
  const updatedBox: BoundingBox = {
    ...currentBox,
    x: group.x() * scale,
    y: group.y() * scale,
  };

  updateBboxKeyframe(trackId, currentFrame.value, updatedBox);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after drag:", error);
  }
};

const handleBboxTransformEnd = async () => {
  const nodes = transformerRef.value?.nodes();
  if (!nodes || nodes.length === 0) return;

  const group = nodes[0] as Konva.Group;
  const trackId = group.id();

  const track = bboxTracks.value.get(trackId);
  if (!track) return;

  const currentBox = getBoxAtFrame(trackId, currentFrame.value);
  if (!currentBox) return;

  const rect = group.findOne("Rect");
  if (!rect) return;

  const scaleX = group.scaleX();
  const scaleY = group.scaleY();

  // Convert working resolution back to original resolution for storage
  const scale = storageScale.value;
  const updatedBox: BoundingBox = {
    ...currentBox,
    x: group.x() * scale,
    y: group.y() * scale,
    width: rect.width() * scaleX * scale,
    height: rect.height() * scaleY * scale,
    rotation: group.rotation(),
  };

  group.scaleX(1);
  group.scaleY(1);

  updateBboxKeyframe(trackId, currentFrame.value, updatedBox);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after transform:", error);
  }
};

const handlePolygonDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();

  const track = polygonTracks.value.get(trackId);
  if (!track) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  // dx, dy are in working resolution, scale up to original for storage
  const scale = storageScale.value;
  const dx = line.x() * scale;
  const dy = line.y() * scale;

  const updatedPoints = currentPolygon.points.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
  }));

  line.x(0);
  line.y(0);

  // Display points need to be in working resolution
  const dScale = displayScale.value;
  const flatPoints: number[] = [];
  for (const p of updatedPoints) {
    flatPoints.push(p.x * dScale, p.y * dScale);
  }
  line.points(flatPoints);

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: updatedPoints,
  };

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after polygon drag:", error);
  }
};

const handlePolygonTransformEnd = async () => {
  const nodes = transformerRef.value?.nodes();
  if (!nodes || nodes.length === 0) return;

  const line = nodes[0] as Konva.Line;
  const trackId = line.id();

  const track = polygonTracks.value.get(trackId);
  if (!track) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const scaleX = line.scaleX();
  const scaleY = line.scaleY();
  const rotation = line.rotation();
  const dx = line.x();
  const dy = line.y();

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const scale = storageScale.value;
  const dScale = displayScale.value;

  const updatedPoints = currentPolygon.points.map((p) => {
    const scaledX = p.x * scaleX;
    const scaledY = p.y * scaleY;
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;
    return {
      x: rotatedX + dx * scale,
      y: rotatedY + dy * scale,
    };
  });

  line.scaleX(1);
  line.scaleY(1);
  line.rotation(0);
  line.x(0);
  line.y(0);

  const flatPoints: number[] = [];
  for (const p of updatedPoints) {
    flatPoints.push(p.x * dScale, p.y * dScale);
  }
  line.points(flatPoints);

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: updatedPoints,
  };

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after polygon transform:", error);
  }
};

// Update polygon in real-time while dragging vertex
const handlePolygonPointDragging = (
  e: any,
  trackId: string,
  pointIndex: number
) => {
  const circle = e.target;
  if (!polygonLayerRef.value) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  // Find the line element for this polygon
  const layer = polygonLayerRef.value.getNode();
  const line = layer.findOne(`#${trackId}`);
  if (!line) return;

  // Get current line points and update the dragged point
  const dScale = displayScale.value;
  const points = [...currentPolygon.points];
  points[pointIndex] = {
    x: circle.x() * storageScale.value,
    y: circle.y() * storageScale.value,
  };

  // Update line with new points
  const flatPoints: number[] = [];
  for (const p of points) {
    flatPoints.push(p.x * dScale, p.y * dScale);
  }
  line.points(flatPoints);

  layer.batchDraw();
};

// Save polygon after vertex drag ends
const handlePolygonPointDragEnd = async (
  e: any,
  trackId: string,
  pointIndex: number
) => {
  const circle = e.target;
  const track = polygonTracks.value.get(trackId);
  if (!track) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  const scale = storageScale.value;
  const newX = circle.x() * scale;
  const newY = circle.y() * scale;

  // Update the point position in polygon
  const updatedPoints = currentPolygon.points.map((p, i) =>
    i === pointIndex ? { x: newX, y: newY } : p
  );

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: updatedPoints,
  };

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after polygon point drag:", error);
  }
};

// Handle clicking on polygon line to add a new point (in PAN mode)
const handlePolygonLineClick = async (e: any, trackId: string) => {
  // If not in PAN mode, just select the polygon
  if (currentTool.value !== Tool.PAN) {
    const line = e.target;
    if (line && line.id()) {
      selectedPolygonTrackId.value = line.id();
      selectedTrackId.value = null;
      selectedBboxTrackId.value = null;
      selectedSkeletonTrackId.value = null;
      currentTool.value = Tool.SELECT;
      updateTransformerSelection();
    }
    return;
  }

  const track = polygonTracks.value.get(trackId);
  if (!track) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon || currentPolygon.points.length < 2) return;

  // Get click position in stage coordinates
  const stage = e.target.getStage();
  const pos = stage.getRelativePointerPosition();
  const scale = storageScale.value;
  const clickX = pos.x * scale;
  const clickY = pos.y * scale;

  // Find which line segment was clicked (including the closing segment)
  let insertIndex = -1;
  let minDistance = Infinity;

  const numPoints = currentPolygon.points.length;
  for (let i = 0; i < numPoints; i++) {
    const p1 = currentPolygon.points[i]!;
    const p2 = currentPolygon.points[(i + 1) % numPoints]!;

    // Calculate distance from point to line segment
    const dist = pointToSegmentDistance(clickX, clickY, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDistance) {
      minDistance = dist;
      insertIndex = i + 1;
    }
  }

  if (insertIndex === -1) return;

  // Handle insertion at the end (closing segment)
  if (insertIndex === numPoints) {
    insertIndex = numPoints; // Insert at end
  }

  // Insert new point at click position
  const updatedPoints = [...currentPolygon.points];
  updatedPoints.splice(insertIndex, 0, { x: clickX, y: clickY });

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: updatedPoints,
  };

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon);

  // Select the polygon
  selectedPolygonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after adding polygon point:", error);
  }
};

// Handle clicking on polygon vertex to select
const handlePolygonVertexClick = (trackId: string) => {
  selectedPolygonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedSkeletonTrackId.value = null;
  updateTransformerSelection();
};

// Handle double-click on vertex to delete it (in PAN mode)
const handlePolygonPointDelete = async (trackId: string, pointIndex: number) => {
  // Only allow deletion in PAN mode
  if (currentTool.value !== Tool.PAN) return;

  const track = polygonTracks.value.get(trackId);
  if (!track) return;

  const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
  if (!currentPolygon) return;

  // Need at least 3 points to keep a valid polygon
  if (currentPolygon.points.length <= 3) {
    alert("Cannot delete point: polygon must have at least 3 points");
    return;
  }

  // Remove the point at the specified index
  const updatedPoints = currentPolygon.points.filter((_, i) => i !== pointIndex);

  const updatedPolygon: Polygon = {
    ...currentPolygon,
    points: updatedPoints,
  };

  updatePolygonKeyframe(trackId, currentFrame.value, updatedPolygon);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after deleting polygon point:", error);
  }
};

const handleSkeletonClick = (trackId: string) => {
  if (
    currentTool.value === Tool.BRUSH ||
    currentTool.value === Tool.ERASER ||
    currentTool.value === Tool.BBOX ||
    currentTool.value === Tool.POLYGON
  )
    return;

  selectedSkeletonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  currentTool.value = Tool.SELECT;
  updateTransformerSelection();
};

// Update skeleton line in real-time while dragging keypoint
const handleSkeletonKeypointDragging = (
  e: any,
  trackId: string,
  pointIndex: number
) => {
  const circle = e.target;
  if (!skeletonLayerRef.value) return;

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  // Find the line element for this skeleton
  const layer = skeletonLayerRef.value.getNode();
  const line = layer.findOne(`#${trackId}`);
  if (!line) return;

  // Get current line points and update the dragged point
  const dScale = displayScale.value;
  const points = [...currentSkeleton.points];
  points[pointIndex] = {
    x: circle.x() * storageScale.value,
    y: circle.y() * storageScale.value,
  };

  // Update line with new points
  const flatPoints: number[] = [];
  for (const p of points) {
    flatPoints.push(p.x * dScale, p.y * dScale);
  }
  line.points(flatPoints);

  layer.batchDraw();
};

const handleSkeletonKeypointDrag = async (
  e: any,
  trackId: string,
  pointIndex: number
) => {
  const circle = e.target;
  const track = skeletonTracks.value.get(trackId);
  if (!track) return;

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const scale = storageScale.value;
  const newX = circle.x() * scale;
  const newY = circle.y() * scale;

  // Update the point position in skeleton
  const updatedPoints = currentSkeleton.points.map((p, i) =>
    i === pointIndex ? { x: newX, y: newY } : p
  );

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: updatedPoints,
  };

  updateSkeletonKeyframe(trackId, currentFrame.value, updatedSkeleton);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after skeleton keypoint drag:", error);
  }

  // Check for auto-merge with other skeletons (in PAN mode)
  await checkAndMergeSkeletons(trackId, pointIndex);
};

const handleSkeletonDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();

  const track = skeletonTracks.value.get(trackId);
  if (!track) return;

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  const scale = storageScale.value;
  const dx = line.x() * scale;
  const dy = line.y() * scale;

  const updatedPoints = currentSkeleton.points.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
  }));

  line.x(0);
  line.y(0);

  const dScale = displayScale.value;
  const flatPoints: number[] = [];
  for (const p of updatedPoints) {
    flatPoints.push(p.x * dScale, p.y * dScale);
  }
  line.points(flatPoints);

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: updatedPoints,
  };

  updateSkeletonKeyframe(trackId, currentFrame.value, updatedSkeleton);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after skeleton drag:", error);
  }
};

// Handle clicking on skeleton line to add a new point (in PAN mode)
const handleSkeletonLineClick = async (e: any, trackId: string) => {
  // If not in PAN mode, just select the skeleton
  if (currentTool.value !== Tool.PAN) {
    handleSkeletonClick(trackId);
    return;
  }

  const track = skeletonTracks.value.get(trackId);
  if (!track) return;

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton || currentSkeleton.points.length < 2) return;

  // Get click position in stage coordinates
  const stage = e.target.getStage();
  const pos = stage.getRelativePointerPosition();
  const scale = storageScale.value;
  const clickX = pos.x * scale;
  const clickY = pos.y * scale;

  // Find which line segment was clicked
  let insertIndex = -1;
  let minDistance = Infinity;

  for (let i = 0; i < currentSkeleton.points.length - 1; i++) {
    const p1 = currentSkeleton.points[i]!;
    const p2 = currentSkeleton.points[i + 1]!;

    // Calculate distance from point to line segment
    const dist = pointToSegmentDistance(clickX, clickY, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDistance) {
      minDistance = dist;
      insertIndex = i + 1;
    }
  }

  if (insertIndex === -1) return;

  // Insert new point at click position
  const updatedPoints = [...currentSkeleton.points];
  updatedPoints.splice(insertIndex, 0, { x: clickX, y: clickY });

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: updatedPoints,
  };

  updateSkeletonKeyframe(trackId, currentFrame.value, updatedSkeleton);

  // Select the skeleton
  selectedSkeletonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after adding skeleton point:", error);
  }
};

// Helper function to calculate distance from point to line segment
const pointToSegmentDistance = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return Math.sqrt((px - nearestX) * (px - nearestX) + (py - nearestY) * (py - nearestY));
};

// Handle double-click on keypoint to delete it (in PAN mode)
const handleSkeletonKeypointDelete = async (trackId: string, pointIndex: number) => {
  // Only allow deletion in PAN mode
  if (currentTool.value !== Tool.PAN) return;

  const track = skeletonTracks.value.get(trackId);
  if (!track) return;

  const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
  if (!currentSkeleton) return;

  // Need at least 2 points to keep a valid skeleton
  if (currentSkeleton.points.length <= 2) {
    alert("Cannot delete point: skeleton must have at least 2 points");
    return;
  }

  // Remove the point at the specified index
  const updatedPoints = currentSkeleton.points.filter((_, i) => i !== pointIndex);

  const updatedSkeleton: Skeleton = {
    ...currentSkeleton,
    points: updatedPoints,
  };

  updateSkeletonKeyframe(trackId, currentFrame.value, updatedSkeleton);

  try {
    await saveAllAnnotationsToApi();
  } catch (error) {
    console.error("Failed to save after deleting skeleton point:", error);
  }
};

// Check and merge skeletons within 10px proximity (in PAN mode)
const checkAndMergeSkeletons = async (
  draggedTrackId: string,
  draggedPointIndex: number
) => {
  if (currentTool.value !== Tool.PAN) return;

  const draggedTrack = skeletonTracks.value.get(draggedTrackId);
  if (!draggedTrack) return;

  const draggedSkeleton = getSkeletonAtFrame(draggedTrackId, currentFrame.value);
  if (!draggedSkeleton) return;

  const draggedPoint = draggedSkeleton.points[draggedPointIndex];
  if (!draggedPoint) return;

  const MERGE_DISTANCE = 10;
  const isEndpoint = draggedPointIndex === 0 || draggedPointIndex === draggedSkeleton.points.length - 1;

  // Only merge if dragging an endpoint
  if (!isEndpoint) return;

  // Check against all other skeletons
  for (const [otherTrackId] of skeletonTracks.value) {
    if (otherTrackId === draggedTrackId) continue;

    const otherSkeleton = getSkeletonAtFrame(otherTrackId, currentFrame.value);
    if (!otherSkeleton || otherSkeleton.points.length === 0) continue;

    // Check distance to other skeleton's endpoints
    const otherStart = otherSkeleton.points[0]!;
    const otherEnd = otherSkeleton.points[otherSkeleton.points.length - 1]!;

    const distToStart = Math.sqrt(
      Math.pow(draggedPoint.x - otherStart.x, 2) +
      Math.pow(draggedPoint.y - otherStart.y, 2)
    );

    const distToEnd = Math.sqrt(
      Math.pow(draggedPoint.x - otherEnd.x, 2) +
      Math.pow(draggedPoint.y - otherEnd.y, 2)
    );

    if (distToStart < MERGE_DISTANCE || distToEnd < MERGE_DISTANCE) {
      // Merge the skeletons
      let mergedPoints: { x: number; y: number }[];

      if (draggedPointIndex === 0) {
        // Dragged skeleton's start point
        if (distToEnd < distToStart) {
          // Connect other's end to dragged's start -> other + dragged
          mergedPoints = [...otherSkeleton.points, ...draggedSkeleton.points.slice(1)];
        } else {
          // Connect other's start to dragged's start -> reverse(other) + dragged
          mergedPoints = [...otherSkeleton.points.slice().reverse(), ...draggedSkeleton.points.slice(1)];
        }
      } else {
        // Dragged skeleton's end point
        if (distToStart < distToEnd) {
          // Connect dragged's end to other's start -> dragged + other
          mergedPoints = [...draggedSkeleton.points.slice(0, -1), ...otherSkeleton.points];
        } else {
          // Connect dragged's end to other's end -> dragged + reverse(other)
          mergedPoints = [...draggedSkeleton.points.slice(0, -1), ...otherSkeleton.points.slice().reverse()];
        }
      }

      // Update the dragged skeleton with merged points
      const mergedSkeleton: Skeleton = {
        ...draggedSkeleton,
        points: mergedPoints,
      };

      updateSkeletonKeyframe(draggedTrackId, currentFrame.value, mergedSkeleton);

      // Delete the other skeleton
      deleteSkeletonTrack(otherTrackId);

      try {
        await saveAllAnnotationsToApi();
      } catch (error) {
        console.error("Failed to save after merging skeletons:", error);
      }

      break; // Only merge with one skeleton at a time
    }
  }
};

const handleDeleteSelected = async () => {
  if (selectedTrackId.value) {
    const trackId = selectedTrackId.value;
    deleteTrack(trackId);
    selectedTrackId.value = null;

    try {
      await saveAllAnnotationsToApi();
    } catch (error) {
      console.error("Failed to save after deleting track:", error);
    }

    loadBrushCanvasForFrame();
  }

  if (selectedBboxTrackId.value) {
    const trackId = selectedBboxTrackId.value;
    deleteBboxTrack(trackId);
    selectedBboxTrackId.value = null;

    try {
      await saveAllAnnotationsToApi();
    } catch (error) {
      console.error("Failed to save after deleting bbox track:", error);
    }

    updateTransformerSelection();
  }

  if (selectedPolygonTrackId.value) {
    const trackId = selectedPolygonTrackId.value;
    deletePolygonTrack(trackId);
    selectedPolygonTrackId.value = null;

    try {
      await saveAllAnnotationsToApi();
    } catch (error) {
      console.error("Failed to save after deleting polygon track:", error);
    }

    updateTransformerSelection();
  }

  if (selectedSkeletonTrackId.value) {
    const trackId = selectedSkeletonTrackId.value;
    deleteSkeletonTrack(trackId);
    selectedSkeletonTrackId.value = null;

    try {
      await saveAllAnnotationsToApi();
    } catch (error) {
      console.error("Failed to save after deleting skeleton track:", error);
    }

    updateTransformerSelection();
  }
};

// Cleanup function for tab switching
const cleanupCurrentVideo = () => {
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedSkeletonTrackId.value = null;

  tracks.value.clear();
  bboxTracks.value.clear();
  polygonTracks.value.clear();
  skeletonTracks.value.clear();

  if (segmentationBrush.value) {
    segmentationBrush.value.clearOffscreenCanvas();
  }

  isDrawing.value = false;

  if (bboxTool.previewRect.value) {
    bboxTool.previewRect.value.destroy();
    bboxTool.previewRect.value = null;
  }

  polygonTool.cancelDrawing();
  skeletonTool.cancelDrawing();

  if (transformerRef.value) {
    transformerRef.value.nodes([]);
  }
};

// Clear all annotation data
const clearAllAnnotations = async () => {
  const confirmed = confirm(
    "Are you sure you want to clear ALL annotation data?\n\n" +
      "This will delete all annotations for this video and cannot be undone!"
  );

  if (!confirmed) return;

  try {
    // Clear local state
    tracks.value.clear();
    bboxTracks.value.clear();
    polygonTracks.value.clear();
    skeletonTracks.value.clear();
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;

    // Clear brush canvas
    if (segmentationBrush.value) {
      segmentationBrush.value.clearOffscreenCanvas();
    }

    // Clear transformer
    if (transformerRef.value) {
      transformerRef.value.nodes([]);
    }

    // Clear store and send empty result to API
    if (videoFileName.value) {
      annotationStore.setVideoFileName(videoFileName.value);
      await annotationStore.clearAll();
    }

    // Redraw
    if (drawingLayerRef.value) {
      drawingLayerRef.value.getNode().batchDraw();
    }
    if (bboxLayerRef.value) {
      bboxLayerRef.value.getNode().batchDraw();
    }
    if (polygonLayerRef.value) {
      polygonLayerRef.value.getNode().batchDraw();
    }

    alert("All annotation data has been cleared successfully!");
  } catch (error) {
    console.error("Failed to clear annotations:", error);
    alert("Failed to clear annotations. Please try again.");
  }
};

// Tab switch handler
const switchVideoTab = async (tab: VideoTab) => {
  // Guard clauses
  if (tab === activeVideoTab.value) return;
  if (isDrawing.value || polygonTool.isDrawing.value || skeletonTool.isDrawing.value) {
    alert("Please finish current operation first");
    return;
  }
  if (isTransitioning.value) return;

  isTransitioning.value = true;

  try {
    // Cleanup current video state
    cleanupCurrentVideo();

    // Update active tab
    activeVideoTab.value = tab;

    // Load new video
    const config = VIDEO_SOURCES[tab];
    loadVideoFromUrl(config.source, config.filename);

    // Annotations will load automatically via watch(videoLoaded)
  } finally {
    isTransitioning.value = false;
  }
};

const addManualKeyframe = async () => {
  if (
    !selectedTrackId.value ||
    isCurrentFrameKeyframe.value ||
    !segmentationBrush.value
  )
    return;

  const offscreenCanvas = segmentationBrush.value.getOffscreenCanvas();
  const contours = await getSegmentationImageContoursForSaving(
    offscreenCanvas,
    1,
    toolClasses.value
  );

  if (contours.length > 0) {
    addKeyframe(selectedTrackId.value, currentFrame.value, contours);

    try {
      await saveAllAnnotationsToApi();
    } catch (error) {
      console.error("Failed to save keyframe:", error);
    }
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && polygonTool.isDrawing.value) {
    polygonTool.cancelDrawing();
    return;
  }

  if (e.key === "Escape" && skeletonTool.isDrawing.value) {
    skeletonTool.cancelDrawing();
    return;
  }

  if (e.key === "k" && selectedTrackId.value) {
    addManualKeyframe();
  }

  if (
    e.key === "i" &&
    (selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedSkeletonTrackId.value)
  ) {
    handleToggleInterpolation();
  }

  if (
    e.key === "[" &&
    (selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedSkeletonTrackId.value)
  ) {
    handleJumpToPreviousKeyframe();
  }

  if (
    e.key === "]" &&
    (selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedSkeletonTrackId.value)
  ) {
    handleJumpToNextKeyframe();
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    if (
      selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedSkeletonTrackId.value
    ) {
      e.preventDefault();
      handleDeleteSelected();
    }
  }
};

watch(brushSize, (newSize) => {
  if (segmentationBrush.value) {
    segmentationBrush.value.setBrushSize(newSize);
  }
});

watch(brushColor, (newColor) => {
  if (segmentationBrush.value) {
    segmentationBrush.value.setBrushColor(newColor);
  }
});

watch(currentTool, (newTool) => {
  if (segmentationBrush.value) {
    segmentationBrush.value.setDeleteMode(newTool === "eraser");
  }

  if (stageRef.value) {
    const stage = stageRef.value.getNode();
    stage.draggable(newTool === "pan");
  }
});

watch(segmentationOpacity, (newOpacity) => {
  if (segmentationBrush.value) {
    segmentationBrush.value.setOpacity(newOpacity);
  }
});

watch(selectedBboxTrackId, () => {
  nextTick(() => {
    updateTransformerSelection();
  });
});

const startRangeResize = (
  e: MouseEvent,
  trackId: string,
  trackType: "brush" | "bbox" | "polygon" | "skeleton",
  rangeIndex: number,
  edge: "left" | "right",
  currentStartFrame: number,
  currentEndFrame: number
) => {
  e.stopPropagation();
  e.preventDefault();

  isResizingRange.value = true;
  resizeTrackId.value = trackId;
  resizeTrackType.value = trackType;
  resizeRangeIndex.value = rangeIndex;
  resizeEdge.value = edge;
  resizeStartX.value = e.clientX;
  resizeStartFrame.value =
    edge === "left" ? currentStartFrame : currentEndFrame;
};

const handleRangeResize = (e: MouseEvent) => {
  if (!isResizingRange.value || !resizeTrackId.value || !resizeTrackType.value)
    return;

  const timelineElement = document.querySelector(".track-timeline");
  if (!timelineElement) return;

  const rect = timelineElement.getBoundingClientRect();
  const deltaX = e.clientX - resizeStartX.value;
  const framesDelta = Math.round((deltaX / rect.width) * totalFrames.value);

  let newFrame = resizeStartFrame.value + framesDelta;
  newFrame = Math.max(0, Math.min(newFrame, totalFrames.value));

  let track;
  if (resizeTrackType.value === "brush") {
    track = tracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === "bbox") {
    track = bboxTracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === "polygon") {
    track = polygonTracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === "skeleton") {
    track = skeletonTracks.value.get(resizeTrackId.value);
  }

  if (!track || !track.ranges[resizeRangeIndex.value]) return;

  const range = track.ranges[resizeRangeIndex.value]!;
  if (resizeEdge.value === "left") {
    const minFrame = 0;
    const maxFrame = range[1] - 1;
    newFrame = Math.max(minFrame, Math.min(newFrame, maxFrame));
    range[0] = newFrame;
  } else {
    const minFrame = range[0] + 1;
    const maxFrame = totalFrames.value;
    newFrame = Math.max(minFrame, Math.min(newFrame, maxFrame));
    range[1] = newFrame;
  }
};

const endRangeResize = async () => {
  if (!isResizingRange.value || !resizeTrackId.value || !resizeTrackType.value)
    return;

  let track;
  if (resizeTrackType.value === "brush") {
    track = tracks.value.get(resizeTrackId.value);
    if (track) {
      await saveAllAnnotationsToApi();
    }
  } else if (resizeTrackType.value === "bbox") {
    track = bboxTracks.value.get(resizeTrackId.value);
    if (track) {
      await saveAllAnnotationsToApi();
    }
  } else if (resizeTrackType.value === "polygon") {
    track = polygonTracks.value.get(resizeTrackId.value);
    if (track) {
      await saveAllAnnotationsToApi();
    }
  } else if (resizeTrackType.value === "skeleton") {
    track = skeletonTracks.value.get(resizeTrackId.value);
    if (track) {
      await saveAllAnnotationsToApi();
    }
  }

  isResizingRange.value = false;
  resizeTrackId.value = null;
  resizeTrackType.value = null;
  resizeEdge.value = null;
};

onMounted(async () => {
  (Konva as any).pixelRatio = KONVA_PIXEL_RATIO;

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("mousemove", handleRangeResize);
  window.addEventListener("mouseup", endRangeResize);

  const config = VIDEO_SOURCES[activeVideoTab.value];
  loadVideoFromUrl(config.source, config.filename);
});

onBeforeUnmount(() => {
  if (segmentationBrush.value) {
    segmentationBrush.value.destroy();
  }
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("mousemove", handleRangeResize);
  window.removeEventListener("mouseup", endRangeResize);
});

watch(videoLoaded, async (loaded) => {
  if (loaded) {
    await nextTick();

    // Load annotations from API
    await loadAllAnnotationsFromApi();

    await nextTick();

    if (stageRef.value) {
      const stage = stageRef.value.getNode();
      stage.on("mousedown touchstart", handleStageMouseDown);
      stage.on("mousemove touchmove", handleStageMouseMove);
      stage.on("mouseup touchend", handleStageMouseUp);
      stage.on("mouseout", handleStageMouseOut);
      stage.on("dblclick dbltap", handleStageDblClick);
    }

    await initializeOffscreenCanvas();
    setupTransformer();
  }
});
</script>

<style scoped>
.konva-container {
  padding: 20px;
  user-select: none;
}

/* Video Source Tabs */
.video-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
  padding: 10px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover:not(:disabled) {
  background: #e8e8e8;
  border-color: #ccc;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-btn.clear-btn {
  margin-left: auto;
  background: #ff4444;
  color: white;
  border-color: #ff4444;
}

.tab-btn.clear-btn:hover:not(:disabled) {
  background: #cc0000;
  border-color: #cc0000;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.interpolation-controls-row {
  display: flex;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.interpolation-info {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

.track-id {
  color: white;
  font-size: 13px;
  font-family: monospace;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.keyframe-status {
  color: white;
  font-size: 13px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
}

.keyframe-status.is-keyframe {
  background-color: rgba(255, 215, 0, 0.3);
  border: 1px solid #ffd700;
}

.interpolation-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 13px;
  cursor: pointer;
}

.interpolation-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.timeline-section {
  width: 100%;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding-right: 10px;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  border-bottom: 1px solid #e0e0e0;
}

.frame-counter {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.timestamp {
  font-family: monospace;
  font-size: 13px;
  color: #333;
  font-weight: bold;
}

.timeline-tracks-container {
  max-height: 300px;
  overflow-y: auto;
  background: #fafafa;
}

.timeline-empty {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-style: italic;
  font-size: 14px;
}

.timeline-track-row {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  background: white;
  cursor: pointer;
  transition: background 0.2s;
}

.timeline-track-row:hover {
  background: #f9f9ff;
}

.timeline-track-row.selected {
  background: #f0f0ff;
  border-left: 3px solid #646cff;
}

.track-label {
  min-width: 180px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafafa;
  border-right: 1px solid #e8e8e8;
}

.track-icon {
  font-size: 18px;
}

.track-name {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  flex: 1;
}

.keyframe-count {
  font-size: 10px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
}

.track-timeline {
  flex: 1;
  position: relative;
  height: 48px;
  background: white;
}

.current-frame-line {
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background: #2196f3;
  z-index: 10;
  pointer-events: none;
}

.playhead {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: #2196f3;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.timeline-segment-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 28px;
  background: rgba(255, 102, 0, 0.25);
  border: 2px solid #ff6600;
  border-radius: 6px;
  transition: all 0.2s;
  z-index: 2;
}

.timeline-segment-bar.bbox {
  background: rgba(0, 255, 0, 0.25);
  border-color: #00ff00;
}

.timeline-segment-bar.polygon {
  background: rgba(0, 0, 255, 0.25);
  border-color: #0000ff;
}

.timeline-segment-bar.selected {
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.3);
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 10;
}

.resize-handle.left {
  left: -4px;
  border-radius: 4px 0 0 4px;
}

.resize-handle.right {
  right: -4px;
  border-radius: 0 4px 4px 0;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.5);
}

.resize-handle:active {
  background: rgba(255, 255, 255, 0.8);
}

.keyframe-diamond {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 5;
}

.diamond-shape {
  width: 12px;
  height: 12px;
  background: #ffaa00;
  border: 2px solid white;
  transform: rotate(45deg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.keyframe-diamond:hover .diamond-shape {
  width: 16px;
  height: 16px;
  background: #ff8800;
}

.keyframe-diamond.active .diamond-shape {
  background: #646cff;
  border-color: white;
}

.timeline-scrubber-container {
  padding: 8px 16px 12px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
}

.timeline-scrubber {
  width: 100%;
  height: 8px;
  background: transparent;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.timeline-scrubber::-webkit-slider-runnable-track {
  width: 100%;
  height: 8px;
  background: linear-gradient(to right, #e0e0e0, #d0d0d0);
  border-radius: 4px;
  border: 1px solid #ccc;
}

.timeline-scrubber::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #2196f3;
  border: 3px solid white;
  border-radius: 50%;
  cursor: pointer;
  margin-top: -5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.control-btn {
  padding: 8px 16px;
  background-color: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.control-btn:hover:not(:disabled) {
  background-color: #535ac8;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.frame-duration-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.frame-duration-control label {
  font-size: 12px;
  white-space: nowrap;
  min-width: 100px;
}

.frame-duration-slider {
  width: 100px;
  height: 4px;
  cursor: pointer;
}

.fps-display {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.frame-navigation {
  display: flex;
  gap: 5px;
  padding-left: 10px;
  border-left: 2px solid #ddd;
}

.tool-selector {
  display: flex;
  gap: 8px;
  padding-left: 15px;
  border-left: 2px solid #ddd;
}

.tool-btn {
  padding: 8px 16px;
  background-color: #f0f0f0;
  color: #333;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.tool-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
  border-color: #999;
}

.tool-btn.active {
  background-color: #646cff;
  color: white;
  border-color: #646cff;
}

.tool-btn.delete {
  background-color: #ff4444;
  color: white;
  border-color: #ff4444;
}

.tool-btn.delete:hover:not(:disabled) {
  background-color: #cc0000;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.brush-controls,
.bbox-controls,
.polygon-controls,
.skeleton-controls,
.opacity-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.brush-controls label,
.bbox-controls label,
.polygon-controls label,
.skeleton-controls label,
.opacity-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.brush-slider,
.opacity-slider {
  width: 150px;
  height: 6px;
  background: #ddd;
  outline: none;
  border-radius: 3px;
  cursor: pointer;
}

.brush-slider::-webkit-slider-thumb,
.opacity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #646cff;
  border-radius: 50%;
  cursor: pointer;
}

.color-picker {
  width: 40px;
  height: 30px;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.drawing-hint {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.info {
  display: flex;
  gap: 20px;
  align-items: center;
  padding-left: 15px;
  border-left: 2px solid #ddd;
}

.video-info,
.frame-info,
.zoom-info {
  color: #666;
  font-size: 13px;
  font-family: monospace;
}

.placeholder {
  width: 800px;
  height: 400px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 18px;
}

:deep(.konvajs-content) {
  border: 2px solid #ccc;
  border-radius: 4px;
  cursor: crosshair;
}

.pan-tool-active :deep(.konvajs-content) {
  cursor: grab;
}

.pan-tool-active :deep(.konvajs-content:active) {
  cursor: grabbing;
}
</style>
