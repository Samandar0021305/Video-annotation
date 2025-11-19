<template>
  <div class="konva-container">
    <!-- Video Source Tabs -->
    <div class="video-tabs">
      <button
        v-for="(config, key) in VIDEO_SOURCES"
        :key="key"
        @click="switchVideoTab(key as VideoTabKey)"
        :class="['tab-btn', { active: activeVideoTab === key }]"
        :disabled="isTransitioning"
      >
        {{ config.label }}
      </button>
      <button
        @click="clearAllIndexedDB"
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
              !selectedPolylineTrackId
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
              !selectedPolylineTrackId
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
            @click="currentTool = 'pan'"
            :class="['tool-btn', { active: currentTool === 'pan' }]"
          >
            Pan
          </button>
          <button
            @click="currentTool = 'brush'"
            :class="['tool-btn', { active: currentTool === 'brush' }]"
          >
            Brush
          </button>
          <button
            @click="currentTool = 'eraser'"
            :class="['tool-btn', { active: currentTool === 'eraser' }]"
          >
            Eraser
          </button>
          <button
            @click="currentTool = 'bbox'"
            :class="['tool-btn', { active: currentTool === 'bbox' }]"
          >
            BBox
          </button>
          <button
            @click="currentTool = 'polygon'"
            :class="['tool-btn', { active: currentTool === 'polygon' }]"
          >
            Polygon
          </button>
          <button
            @click="currentTool = 'polyline'"
            :class="['tool-btn', { active: currentTool === 'polyline' }]"
          >
            Polyline
          </button>
          <button
            @click="currentTool = 'select'"
            :class="['tool-btn', { active: currentTool === 'select' }]"
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
              !selectedPolylineTrackId
            "
          >
            Delete
          </button>
        </div>

        <div
          v-if="currentTool === 'brush' || currentTool === 'eraser'"
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
          <label v-if="currentTool === 'brush'">
            Color:
            <input type="color" v-model="brushColor" class="color-picker" />
          </label>
        </div>

        <div v-if="currentTool === 'bbox'" class="bbox-controls">
          <label>
            Color:
            <input type="color" v-model="bboxColor" class="color-picker" />
          </label>
        </div>

        <div v-if="currentTool === 'polygon'" class="polygon-controls">
          <label>
            Color:
            <input type="color" v-model="polygonColor" class="color-picker" />
          </label>
          <span v-if="isDrawingPolygon" class="drawing-hint">
            Click to add points. Double-click or click near start to complete.
          </span>
        </div>

        <div v-if="currentTool === 'polyline'" class="polyline-controls">
          <label>
            Color:
            <input type="color" v-model="polylineColor" class="color-picker" />
          </label>
          <span v-if="isDrawingPolyline" class="drawing-hint">
            Click to add points. Double-click to complete.
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
          selectedPolylineTrack
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
                selectedPolylineTrackId
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
                isPolylineCurrentFrameKeyframe,
            }"
          >
            {{
              isCurrentFrameKeyframe ||
              isBboxCurrentFrameKeyframe ||
              isPolygonCurrentFrameKeyframe ||
              isPolylineCurrentFrameKeyframe
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
                (selectedPolygonTrack && selectedPolygonTrack.interpolationEnabled) ||
                (selectedPolylineTrack && selectedPolylineTrack.interpolationEnabled) ||
                false
              "
              @change="handleToggleInterpolation"
            />
            <span>
              Interpolation
              {{
                (selectedTrack && selectedTrack.interpolationEnabled) ||
                (selectedBboxTrack && selectedBboxTrack.interpolationEnabled) ||
                (selectedPolygonTrack && selectedPolygonTrack.interpolationEnabled) ||
                (selectedPolylineTrack && selectedPolylineTrack.interpolationEnabled)
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
              polylineTracks.size === 0
            "
            class="timeline-empty"
          >
            No tracks yet. Draw with brush, bbox, polygon, or polyline tool to
            create one.
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
                  @mousedown="startRangeResize($event, trackId, 'brush', rangeIndex, 'left', range[0], range[1])"
                ></div>
                <div
                  class="resize-handle right"
                  @mousedown="startRangeResize($event, trackId, 'brush', rangeIndex, 'right', range[0], range[1])"
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
                  @mousedown="startRangeResize($event, trackId, 'bbox', rangeIndex, 'left', range[0], range[1])"
                ></div>
                <div
                  class="resize-handle right"
                  @mousedown="startRangeResize($event, trackId, 'bbox', rangeIndex, 'right', range[0], range[1])"
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
                  @mousedown="startRangeResize($event, trackId, 'polygon', rangeIndex, 'left', range[0], range[1])"
                ></div>
                <div
                  class="resize-handle right"
                  @mousedown="startRangeResize($event, trackId, 'polygon', rangeIndex, 'right', range[0], range[1])"
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
            v-for="[trackId, track] in Array.from(polylineTracks.entries())"
            :key="trackId"
            class="timeline-track-row"
            :class="{ selected: selectedPolylineTrackId === trackId }"
            @click="selectPolylineTrack(trackId)"
          >
            <div class="track-label">
              <span class="track-icon">📈</span>
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
                :key="`${trackId}-polyline-range-${rangeIndex}`"
                class="timeline-segment-bar polyline"
                :class="{ selected: selectedPolylineTrackId === trackId }"
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
                  @mousedown="startRangeResize($event, trackId, 'polyline', rangeIndex, 'left', range[0], range[1])"
                ></div>
                <div
                  class="resize-handle right"
                  @mousedown="startRangeResize($event, trackId, 'polyline', rangeIndex, 'right', range[0], range[1])"
                ></div>
              </div>

              <div
                v-for="frameNum in Array.from(track.keyframes.keys())"
                :key="`${trackId}-polyline-${frameNum}`"
                v-show="isPolylineFrameInRanges(frameNum, track.ranges || [])"
                class="keyframe-diamond"
                :class="{
                  active: frameNum === currentFrame,
                  selected:
                    selectedPolylineTrackId === trackId &&
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
      :class="{ 'pan-tool-active': currentTool === 'pan' }"
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
            draggable: currentTool === 'select',
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
        <v-line
          v-for="polygon in visiblePolygons"
          :key="polygon.id"
          :config="{
            id: polygon.id,
            points: polygon.points.flatMap((p) => [
              p.x * displayScale,
              p.y * displayScale,
            ]),
            fill: polygon.color + '30',
            stroke: polygon.color,
            strokeWidth: 2,
            closed: true,
            draggable: currentTool === 'select',
            name: 'polygon',
          }"
          @dragend="handlePolygonDragEnd"
          @transformend="handlePolygonTransformEnd"
          @click="handlePolygonClick"
        />
      </v-layer>

      <v-layer ref="polylineLayerRef">
        <v-line
          v-for="polyline in visiblePolylines"
          :key="polyline.id"
          :config="{
            id: polyline.id,
            points: polyline.points.flatMap((p) => [
              p.x * displayScale,
              p.y * displayScale,
            ]),
            stroke: polyline.color,
            strokeWidth: 2,
            closed: false,
            draggable: currentTool === 'select',
            name: 'polyline',
          }"
          @dragend="handlePolylineDragEnd"
          @transformend="handlePolylineTransformEnd"
          @click="handlePolylineClick"
        />
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
import { useBrushTracksDB } from "../composables/useBrushTracksDB";
import { useBoundingBoxTracks } from "../composables/useBoundingBoxTracks";
import { useBoundingBoxDB } from "../composables/useBoundingBoxDB";
import { usePolygonTracks } from "../composables/usePolygonTracks";
import { usePolygonDB } from "../composables/usePolygonDB";
import { usePolylineTracks } from "../composables/usePolylineTracks";
import { usePolylineDB } from "../composables/usePolylineDB";
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
import type { Polygon, PolygonPoint } from "../types/polygon";
import type { Polyline, PolylinePoint } from "../types/polyline";
import { formatTime } from "../utils/formatters";
import videoFileHD from "../assets/video.mp4";
import videoFile4K from "../assets/video_4K.MOV";

// Video source configuration for tabs
const VIDEO_SOURCES = {
  hd: {
    source: videoFileHD,
    filename: "video.mp4",
    label: "HD Video",
  },
  "4k": {
    source: videoFile4K,
    filename: "video_4K.MOV",
    label: "4K Video",
  },
  url: {
    source:
      "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    filename: "BigBuckBunny.mp4",
    label: "URL Video",
  },
} as const;

type VideoTabKey = keyof typeof VIDEO_SOURCES;

const stageRef = ref<any>(null);
const drawingLayerRef = ref<any>(null);
const bboxLayerRef = ref<any>(null);
const polygonLayerRef = ref<any>(null);
const polylineLayerRef = ref<any>(null);
const brushImageRef = ref<any>(null);
const segmentationBrush = ref<KonvaSegmentationBrush | null>(null);
const transformerRef = ref<Konva.Transformer | null>(null);

// Video tab state
const activeVideoTab = ref<VideoTabKey>("hd");
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
  createTrack,
  addKeyframe,
  getContoursAtFrame,
  toggleInterpolation,
  deleteTrack,
  jumpToNextKeyframe,
  jumpToPreviousKeyframe,
  isFrameInRanges,
} = useBrushTracks(currentFrame);

const {
  openDB: openBrushDB,
  saveTrack: saveBrushTrack,
  saveKeyframe,
  saveTrackWithKeyframes,
  loadTracksForVideo: loadBrushTracksForVideo,
  deleteTrack: deleteBrushTrackFromDB,
} = useBrushTracksDB();

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
  openDB: openBboxDB,
  saveTrack: saveBboxTrack,
  loadTracksForVideo: loadBboxTracksForVideo,
  deleteTrack: deleteBboxTrackFromDB,
} = useBoundingBoxDB();

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
  openDB: openPolygonDB,
  saveTrack: savePolygonTrack,
  loadTracksForVideo: loadPolygonTracksForVideo,
  deleteTrack: deletePolygonTrackFromDB,
} = usePolygonDB();

const {
  tracks: polylineTracks,
  selectedTrackId: selectedPolylineTrackId,
  selectedTrack: selectedPolylineTrack,
  isCurrentFrameKeyframe: isPolylineCurrentFrameKeyframe,
  createTrack: createPolylineTrack,
  getPolylineAtFrame,
  updateKeyframe: updatePolylineKeyframe,
  toggleInterpolation: togglePolylineInterpolation,
  deleteTrack: deletePolylineTrack,
  jumpToNextKeyframe: jumpToNextPolylineKeyframe,
  jumpToPreviousKeyframe: jumpToPreviousPolylineKeyframe,
  isFrameInRanges: isPolylineFrameInRanges,
} = usePolylineTracks(currentFrame);

const {
  openDB: openPolylineDB,
  saveTrack: savePolylineTrack,
  loadTracksForVideo: loadPolylineTracksForVideo,
  deleteTrack: deletePolylineTrackFromDB,
} = usePolylineDB();

const stageScale = ref(1);
const stageConfig = ref({
  width: 900,
  height: 700,
  draggable: true,
  scaleX: 1,
  scaleY: 1,
});

// 4K Support: Working resolution calculations
const MAX_WORKING_DIMENSION = 1920; // Cap at 1080p for performance

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

  const containerWidth = 1200;
  const containerHeight = 900;

  return Math.min(
    containerWidth / workingWidth,
    containerHeight / workingHeight,
    1 // Don't scale up if smaller than container
  );
});

const currentTool = ref<
  "pan" | "brush" | "eraser" | "bbox" | "select" | "polygon" | "polyline"
>("pan");
const brushSize = ref(30);
const brushColor = ref("#ff0000");
const bboxColor = ref("#00ff00");
const polygonColor = ref("#0000ff");
const polylineColor = ref("#ff00ff");
const segmentationOpacity = ref(0.7);

const brushImageConfig = ref<any>(null);
const isDrawing = ref(false);
const drawingStartFrame = ref(0);
const drawStartPos = ref({ x: 0, y: 0 });
const previewRect = ref<Konva.Rect | null>(null);
const isDrawingPolygon = ref(false);
const currentPolygonPoints = ref<PolygonPoint[]>([]);
const previewPolygonLine = ref<Konva.Line | null>(null);
const isDrawingPolyline = ref(false);
const currentPolylinePoints = ref<PolylinePoint[]>([]);
const previewPolylineLine = ref<Konva.Line | null>(null);

const isResizingRange = ref(false);
const resizeTrackId = ref<string | null>(null);
const resizeTrackType = ref<'brush' | 'bbox' | 'polygon' | 'polyline' | null>(null);
const resizeRangeIndex = ref(0);
const resizeEdge = ref<'left' | 'right' | null>(null);
const resizeStartX = ref(0);
const resizeStartFrame = ref(0);

const toolClasses = ref<ToolClass[]>([
  { value: 0, name: "Red", color: "#ff0000", markup_type: "segment" },
]);

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

const visiblePolylines = computed(() => {
  const polylines: Polyline[] = [];

  for (const [trackId, track] of polylineTracks.value.entries()) {
    const isInRange = track.ranges.some(
      ([start, end]) => currentFrame.value >= start && currentFrame.value < end
    );

    if (!isInRange) continue;

    const polyline = getPolylineAtFrame(trackId, currentFrame.value);
    if (polyline) {
      polylines.push(polyline);
    }
  }

  return polylines;
});

const selectBrushTrack = (trackId: string) => {
  selectedTrackId.value = trackId;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedPolylineTrackId.value = null;
  updateTransformerSelection();
};

const selectBboxTrack = (trackId: string) => {
  selectedBboxTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedPolylineTrackId.value = null;
  updateTransformerSelection();
};

const selectPolygonTrack = (trackId: string) => {
  selectedPolygonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolylineTrackId.value = null;
  updateTransformerSelection();
};

const selectPolylineTrack = (trackId: string) => {
  selectedPolylineTrackId.value = trackId;
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
    polylineTracks.value.size > 0;

  if (hasAnyTracks) {
    const confirmChange = window.confirm(
      'Changing frame duration will affect existing annotations. ' +
      'Keyframes will remain at the same frame numbers but represent different times. ' +
      'Continue?'
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
  } else if (selectedPolylineTrackId.value) {
    jumpToNextPolylineKeyframe(seekToFrame);
  }
};

const handleJumpToPreviousKeyframe = () => {
  if (selectedTrackId.value) {
    jumpToPreviousKeyframe(seekToFrame);
  } else if (selectedBboxTrackId.value) {
    jumpToPreviousBboxKeyframe(seekToFrame);
  } else if (selectedPolygonTrackId.value) {
    jumpToPreviousPolygonKeyframe(seekToFrame);
  } else if (selectedPolylineTrackId.value) {
    jumpToPreviousPolylineKeyframe(seekToFrame);
  }
};

const handleToggleInterpolation = () => {
  if (selectedTrackId.value) {
    toggleInterpolation(selectedTrackId.value);
    const track = tracks.value.get(selectedTrackId.value);
    if (track) {
      saveBrushTrack(track, videoFileName.value);
    }
    loadBrushCanvasForFrame();
  } else if (selectedBboxTrackId.value) {
    toggleBboxInterpolation(selectedBboxTrackId.value);
    const track = bboxTracks.value.get(selectedBboxTrackId.value);
    if (track) {
      saveBboxTrack(track, videoFileName.value);
    }
  } else if (selectedPolygonTrackId.value) {
    togglePolygonInterpolation(selectedPolygonTrackId.value);
    const track = polygonTracks.value.get(selectedPolygonTrackId.value);
    if (track) {
      savePolygonTrack(track, videoFileName.value);
    }
  } else if (selectedPolylineTrackId.value) {
    togglePolylineInterpolation(selectedPolylineTrackId.value);
    const track = polylineTracks.value.get(selectedPolylineTrackId.value);
    if (track) {
      savePolylineTrack(track, videoFileName.value);
    }
  }
};

watch(videoSize, (newSize) => {
  if (!newSize.width || !newSize.height) return;

  const maxWidth = 900;
  const maxHeight = 700;

  // Use working resolution for stage sizing
  const { width: workingWidth, height: workingHeight } =
    workingResolution.value;

  // Calculate initial scale to fit working resolution in container
  const initScale = initialStageScale.value;
  stageScale.value = initScale;

  // Stage dimensions (container size)
  let stageWidth = Math.min(workingWidth * initScale + 100, maxWidth);
  let stageHeight = Math.min(workingHeight * initScale + 100, maxHeight);

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
      const minSize = 10;
      if (newBox.width < minSize) newBox.width = minSize;
      if (newBox.height < minSize) newBox.height = minSize;
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
  if (currentTool.value === "pan") return;

  if (currentTool.value === "polygon") {
    if (!stageRef.value || !polygonLayerRef.value) return;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    if (!isDrawingPolygon.value) {
      isDrawingPolygon.value = true;
      currentPolygonPoints.value = [{ x: pos.x, y: pos.y }];

      const layer = polygonLayerRef.value.getNode();
      previewPolygonLine.value = new Konva.Line({
        points: [pos.x, pos.y],
        stroke: polygonColor.value,
        strokeWidth: 2,
        dash: [5, 5],
        listening: false,
      });
      layer.add(previewPolygonLine.value);
      layer.batchDraw();
    } else {
      const firstPoint = currentPolygonPoints.value[0];
      if (!firstPoint) return;

      const distance = Math.sqrt(
        Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
      );

      if (distance < 15 && currentPolygonPoints.value.length >= 3) {
        completePolygonDrawing();
      } else {
        currentPolygonPoints.value.push({ x: pos.x, y: pos.y });
        updatePolygonPreview();
      }
    }
    return;
  }

  if (currentTool.value === "polyline") {
    if (!stageRef.value || !polylineLayerRef.value) return;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    if (!isDrawingPolyline.value) {
      isDrawingPolyline.value = true;
      currentPolylinePoints.value = [{ x: pos.x, y: pos.y }];

      const layer = polylineLayerRef.value.getNode();
      previewPolylineLine.value = new Konva.Line({
        points: [pos.x, pos.y],
        stroke: polylineColor.value,
        strokeWidth: 2,
        dash: [5, 5],
        listening: false,
      });
      layer.add(previewPolylineLine.value);
      layer.batchDraw();
    } else {
      currentPolylinePoints.value.push({ x: pos.x, y: pos.y });
      updatePolylinePreview();
    }
    return;
  }

  if (currentTool.value === "bbox") {
    if (!stageRef.value || !bboxLayerRef.value) return;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    isDrawing.value = true;
    drawStartPos.value = { x: pos.x, y: pos.y };

    const layer = bboxLayerRef.value.getNode();

    previewRect.value = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: bboxColor.value,
      strokeWidth: 2,
      dash: [5, 5],
      listening: false,
    });

    layer.add(previewRect.value);
    layer.batchDraw();
    return;
  }

  if (currentTool.value === "select") {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectedBboxTrackId.value = null;
      selectedTrackId.value = null;
      selectedPolygonTrackId.value = null;
      selectedPolylineTrackId.value = null;
      updateTransformerSelection();
    }
    return;
  }

  if (currentTool.value === "brush" || currentTool.value === "eraser") {
    if (!stageRef.value || !segmentationBrush.value) return;

    drawingStartFrame.value = currentFrame.value;
    isDrawing.value = true;

    segmentationBrush.value.onMouseDown(e);
  }
};

const updatePolygonPreview = () => {
  if (!previewPolygonLine.value || !polygonLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentPolygonPoints.value) {
    points.push(p.x, p.y);
  }

  previewPolygonLine.value.points(points);
  polygonLayerRef.value.getNode().batchDraw();
};

const completePolygonDrawing = async () => {
  if (currentPolygonPoints.value.length < 3) {
    cancelPolygonDrawing();
    return;
  }

  // Scale up from working resolution to original resolution for storage
  const scale = storageScale.value;
  const polygon: Polygon = {
    id: "",
    points: currentPolygonPoints.value.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    })),
    color: polygonColor.value,
    classId: 0,
  };

  if (previewPolygonLine.value) {
    previewPolygonLine.value.destroy();
    previewPolygonLine.value = null;
  }

  const trackId = createPolygonTrack(
    currentFrame.value,
    polygon,
    undefined,
    totalFrames.value
  );

  selectedPolygonTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;

  const track = polygonTracks.value.get(trackId);
  if (track) {
    try {
      await savePolygonTrack(track, videoFileName.value);
    } catch (error) {
      console.error("Failed to save polygon track:", error);
    }
  }

  isDrawingPolygon.value = false;
  currentPolygonPoints.value = [];

  await nextTick();
  updateTransformerSelection();
};

const cancelPolygonDrawing = () => {
  if (previewPolygonLine.value) {
    previewPolygonLine.value.destroy();
    previewPolygonLine.value = null;
  }
  isDrawingPolygon.value = false;
  currentPolygonPoints.value = [];
  if (polygonLayerRef.value) {
    polygonLayerRef.value.getNode().batchDraw();
  }
};

const updatePolylinePreview = () => {
  if (!previewPolylineLine.value || !polylineLayerRef.value) return;

  const points: number[] = [];
  for (const p of currentPolylinePoints.value) {
    points.push(p.x, p.y);
  }

  previewPolylineLine.value.points(points);
  polylineLayerRef.value.getNode().batchDraw();
};

const completePolylineDrawing = async () => {
  if (currentPolylinePoints.value.length < 2) {
    cancelPolylineDrawing();
    return;
  }

  const scale = storageScale.value;
  const polyline: Polyline = {
    id: "",
    points: currentPolylinePoints.value.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    })),
    color: polylineColor.value,
    classId: 0,
  };

  if (previewPolylineLine.value) {
    previewPolylineLine.value.destroy();
    previewPolylineLine.value = null;
  }

  const trackId = createPolylineTrack(
    currentFrame.value,
    polyline,
    undefined,
    totalFrames.value
  );

  selectedPolylineTrackId.value = trackId;
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;

  const track = polylineTracks.value.get(trackId);
  if (track) {
    try {
      await savePolylineTrack(track, videoFileName.value);
    } catch (error) {
      console.error("Failed to save polyline track:", error);
    }
  }

  isDrawingPolyline.value = false;
  currentPolylinePoints.value = [];

  await nextTick();
  updateTransformerSelection();
};

const cancelPolylineDrawing = () => {
  if (previewPolylineLine.value) {
    previewPolylineLine.value.destroy();
    previewPolylineLine.value = null;
  }
  isDrawingPolyline.value = false;
  currentPolylinePoints.value = [];
  if (polylineLayerRef.value) {
    polylineLayerRef.value.getNode().batchDraw();
  }
};

const handleStageDblClick = async () => {
  if (currentTool.value === "polygon" && isDrawingPolygon.value) {
    await completePolygonDrawing();
  }
  if (currentTool.value === "polyline" && isDrawingPolyline.value) {
    await completePolylineDrawing();
  }
};

const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (
    currentTool.value === "polygon" &&
    isDrawingPolygon.value &&
    previewPolygonLine.value &&
    stageRef.value
  ) {
    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    const points: number[] = [];
    for (const p of currentPolygonPoints.value) {
      points.push(p.x, p.y);
    }
    points.push(pos.x, pos.y);

    previewPolygonLine.value.points(points);
    polygonLayerRef.value.getNode().batchDraw();
    return;
  }

  if (
    currentTool.value === "polyline" &&
    isDrawingPolyline.value &&
    previewPolylineLine.value &&
    stageRef.value
  ) {
    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    const points: number[] = [];
    for (const p of currentPolylinePoints.value) {
      points.push(p.x, p.y);
    }
    points.push(pos.x, pos.y);

    previewPolylineLine.value.points(points);
    polylineLayerRef.value.getNode().batchDraw();
    return;
  }

  if (
    currentTool.value === "bbox" &&
    isDrawing.value &&
    previewRect.value &&
    stageRef.value
  ) {
    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    const width = pos.x - drawStartPos.value.x;
    const height = pos.y - drawStartPos.value.y;

    previewRect.value.setAttrs({
      x: width < 0 ? pos.x : drawStartPos.value.x,
      y: height < 0 ? pos.y : drawStartPos.value.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    bboxLayerRef.value.getNode().batchDraw();
    return;
  }

  if (!isDrawing.value || !segmentationBrush.value) return;
  segmentationBrush.value.onMouseMove(e);
};

const handleStageMouseUp = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (currentTool.value === "bbox" && isDrawing.value && previewRect.value) {
    isDrawing.value = false;

    const width = previewRect.value.width();
    const height = previewRect.value.height();

    if (width < 10 || height < 10) {
      previewRect.value.destroy();
      previewRect.value = null;
      bboxLayerRef.value.getNode().batchDraw();
      return;
    }

    // Scale up from working resolution to original resolution for storage
    const scale = storageScale.value;
    const box: BoundingBox = {
      id: "",
      x: previewRect.value.x() * scale,
      y: previewRect.value.y() * scale,
      width: width * scale,
      height: height * scale,
      rotation: 0,
      color: bboxColor.value,
      classId: 0,
    };

    previewRect.value.destroy();
    previewRect.value = null;

    const trackId = createBboxTrack(
      currentFrame.value,
      box,
      undefined,
      totalFrames.value
    );

    selectedBboxTrackId.value = trackId;
    selectedTrackId.value = null;

    const track = bboxTracks.value.get(trackId);
    if (track) {
      try {
        await saveBboxTrack(track, videoFileName.value);
      } catch (error) {
        console.error("Failed to save bounding box track:", error);
      }
    }

    await nextTick();
    updateTransformerSelection();
    return;
  }

  if (currentTool.value === "pan" || currentTool.value === "select") return;
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
        await saveTrackWithKeyframes(track, videoFileName.value);
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
        await saveTrackWithKeyframes(track, videoFileName.value);
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
    drawingLayerRef.value.getNode().batchDraw();
    segmentationBrush.value.clearTempCanvas();
  }
};

const handleStageMouseOut = async () => {
  if (isDrawing.value && stageRef.value) {
    if (currentTool.value === "bbox" && previewRect.value) {
      previewRect.value.destroy();
      previewRect.value = null;
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
    currentTool.value === "brush" ||
    currentTool.value === "eraser" ||
    currentTool.value === "bbox" ||
    currentTool.value === "polygon" ||
    currentTool.value === "polyline"
  )
    return;

  const group = e.target.findAncestor("Group");
  if (group) {
    selectedBboxTrackId.value = group.id();
    selectedTrackId.value = null;
    selectedPolygonTrackId.value = null;
    currentTool.value = "select";
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
    await saveBboxTrack(track, videoFileName.value);
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
    await saveBboxTrack(track, videoFileName.value);
  } catch (error) {
    console.error("Failed to save after transform:", error);
  }
};

const handlePolygonClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (
    currentTool.value === "brush" ||
    currentTool.value === "eraser" ||
    currentTool.value === "bbox" ||
    currentTool.value === "polygon"
  )
    return;

  const line = e.target;
  if (line && line.id()) {
    selectedPolygonTrackId.value = line.id();
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    currentTool.value = "select";
    updateTransformerSelection();
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
    await savePolygonTrack(track, videoFileName.value);
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
    await savePolygonTrack(track, videoFileName.value);
  } catch (error) {
    console.error("Failed to save after polygon transform:", error);
  }
};

const handlePolylineClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (
    currentTool.value === "brush" ||
    currentTool.value === "eraser" ||
    currentTool.value === "bbox" ||
    currentTool.value === "polygon" ||
    currentTool.value === "polyline"
  )
    return;

  const line = e.target;
  if (line && line.id()) {
    selectedPolylineTrackId.value = line.id();
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    currentTool.value = "select";
    updateTransformerSelection();
  }
};

const handlePolylineDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();

  const track = polylineTracks.value.get(trackId);
  if (!track) return;

  const currentPolyline = getPolylineAtFrame(trackId, currentFrame.value);
  if (!currentPolyline) return;

  const scale = storageScale.value;
  const dx = line.x() * scale;
  const dy = line.y() * scale;

  const updatedPoints = currentPolyline.points.map((p) => ({
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

  const updatedPolyline: Polyline = {
    ...currentPolyline,
    points: updatedPoints,
  };

  updatePolylineKeyframe(trackId, currentFrame.value, updatedPolyline);

  try {
    await savePolylineTrack(track, videoFileName.value);
  } catch (error) {
    console.error("Failed to save after polyline drag:", error);
  }
};

const handlePolylineTransformEnd = async () => {
  const nodes = transformerRef.value?.nodes();
  if (!nodes || nodes.length === 0) return;

  const line = nodes[0] as Konva.Line;
  const trackId = line.id();

  const track = polylineTracks.value.get(trackId);
  if (!track) return;

  const currentPolyline = getPolylineAtFrame(trackId, currentFrame.value);
  if (!currentPolyline) return;

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

  const updatedPoints = currentPolyline.points.map((p) => {
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

  const updatedPolyline: Polyline = {
    ...currentPolyline,
    points: updatedPoints,
  };

  updatePolylineKeyframe(trackId, currentFrame.value, updatedPolyline);

  try {
    await savePolylineTrack(track, videoFileName.value);
  } catch (error) {
    console.error("Failed to save after polyline transform:", error);
  }
};

const handleDeleteSelected = async () => {
  if (selectedTrackId.value) {
    const trackId = selectedTrackId.value;
    deleteTrack(trackId);
    selectedTrackId.value = null;

    try {
      await deleteBrushTrackFromDB(trackId, videoFileName.value);
    } catch (error) {
      console.error("Failed to delete track from IndexedDB:", error);
    }

    loadBrushCanvasForFrame();
  }

  if (selectedBboxTrackId.value) {
    const trackId = selectedBboxTrackId.value;
    deleteBboxTrack(trackId);
    selectedBboxTrackId.value = null;

    try {
      await deleteBboxTrackFromDB(trackId, videoFileName.value);
    } catch (error) {
      console.error("Failed to delete bbox track from IndexedDB:", error);
    }

    updateTransformerSelection();
  }

  if (selectedPolygonTrackId.value) {
    const trackId = selectedPolygonTrackId.value;
    deletePolygonTrack(trackId);
    selectedPolygonTrackId.value = null;

    try {
      await deletePolygonTrackFromDB(trackId, videoFileName.value);
    } catch (error) {
      console.error("Failed to delete polygon track from IndexedDB:", error);
    }

    updateTransformerSelection();
  }

  if (selectedPolylineTrackId.value) {
    const trackId = selectedPolylineTrackId.value;
    deletePolylineTrack(trackId);
    selectedPolylineTrackId.value = null;

    try {
      await deletePolylineTrackFromDB(trackId, videoFileName.value);
    } catch (error) {
      console.error("Failed to delete polyline track from IndexedDB:", error);
    }

    updateTransformerSelection();
  }
};

// Cleanup function for tab switching
const cleanupCurrentVideo = () => {
  selectedTrackId.value = null;
  selectedBboxTrackId.value = null;
  selectedPolygonTrackId.value = null;
  selectedPolylineTrackId.value = null;

  tracks.value.clear();
  bboxTracks.value.clear();
  polygonTracks.value.clear();
  polylineTracks.value.clear();

  if (segmentationBrush.value) {
    segmentationBrush.value.clearOffscreenCanvas();
  }

  isDrawing.value = false;
  isDrawingPolygon.value = false;
  currentPolygonPoints.value = [];
  isDrawingPolyline.value = false;
  currentPolylinePoints.value = [];

  if (previewRect.value) {
    previewRect.value.destroy();
    previewRect.value = null;
  }
  if (previewPolygonLine.value) {
    previewPolygonLine.value.destroy();
    previewPolygonLine.value = null;
  }
  if (previewPolylineLine.value) {
    previewPolylineLine.value.destroy();
    previewPolylineLine.value = null;
  }

  if (transformerRef.value) {
    transformerRef.value.nodes([]);
  }
};

// Clear all IndexedDB data
const clearAllIndexedDB = async () => {
  const confirmed = confirm(
    "Are you sure you want to clear ALL annotation data from IndexedDB?\n\n" +
      "This will delete annotations for ALL videos (HD, 4K, URL) and cannot be undone!"
  );

  if (!confirmed) return;

  try {
    // Clear all stores by deleting and recreating the database
    const dbName = "VideoAnnotationDB";

    // Close any open connections first
    indexedDB.deleteDatabase(dbName);

    tracks.value.clear();
    bboxTracks.value.clear();
    polygonTracks.value.clear();
    polylineTracks.value.clear();
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedPolylineTrackId.value = null;

    // Clear brush canvas
    if (segmentationBrush.value) {
      segmentationBrush.value.clearOffscreenCanvas();
    }

    // Clear transformer
    if (transformerRef.value) {
      transformerRef.value.nodes([]);
    }

    await openBrushDB();
    await openBboxDB();
    await openPolygonDB();
    await openPolylineDB();

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

    alert("All IndexedDB data has been cleared successfully!");
  } catch (error) {
    console.error("Failed to clear IndexedDB:", error);
    alert("Failed to clear IndexedDB. Please try again.");
  }
};

// Tab switch handler
const switchVideoTab = async (tab: VideoTabKey) => {
  // Guard clauses
  if (tab === activeVideoTab.value) return;
  if (isDrawing.value || isDrawingPolygon.value) {
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
      await saveKeyframe(
        selectedTrackId.value,
        currentFrame.value,
        contours,
        videoFileName.value
      );
    } catch (error) {
      console.error("Failed to save keyframe:", error);
    }
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && isDrawingPolygon.value) {
    cancelPolygonDrawing();
    return;
  }

  if (e.key === "Escape" && isDrawingPolyline.value) {
    cancelPolylineDrawing();
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
      selectedPolylineTrackId.value)
  ) {
    handleToggleInterpolation();
  }

  if (
    e.key === "[" &&
    (selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedPolylineTrackId.value)
  ) {
    handleJumpToPreviousKeyframe();
  }

  if (
    e.key === "]" &&
    (selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedPolylineTrackId.value)
  ) {
    handleJumpToNextKeyframe();
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    if (
      selectedTrackId.value ||
      selectedBboxTrackId.value ||
      selectedPolygonTrackId.value ||
      selectedPolylineTrackId.value
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
  trackType: 'brush' | 'bbox' | 'polygon' | 'polyline',
  rangeIndex: number,
  edge: 'left' | 'right',
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
  resizeStartFrame.value = edge === 'left' ? currentStartFrame : currentEndFrame;
};

const handleRangeResize = (e: MouseEvent) => {
  if (!isResizingRange.value || !resizeTrackId.value || !resizeTrackType.value) return;

  const timelineElement = document.querySelector('.track-timeline');
  if (!timelineElement) return;

  const rect = timelineElement.getBoundingClientRect();
  const deltaX = e.clientX - resizeStartX.value;
  const framesDelta = Math.round((deltaX / rect.width) * totalFrames.value);

  let newFrame = resizeStartFrame.value + framesDelta;
  newFrame = Math.max(0, Math.min(newFrame, totalFrames.value));

  let track;
  if (resizeTrackType.value === 'brush') {
    track = tracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === 'bbox') {
    track = bboxTracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === 'polygon') {
    track = polygonTracks.value.get(resizeTrackId.value);
  } else if (resizeTrackType.value === 'polyline') {
    track = polylineTracks.value.get(resizeTrackId.value);
  }

  if (!track || !track.ranges[resizeRangeIndex.value]) return;

  const range = track.ranges[resizeRangeIndex.value]!;
  if (resizeEdge.value === 'left') {
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
  if (!isResizingRange.value || !resizeTrackId.value || !resizeTrackType.value) return;

  let track;
  if (resizeTrackType.value === 'brush') {
    track = tracks.value.get(resizeTrackId.value);
    if (track) {
      await saveBrushTrack(track, videoFileName.value);
    }
  } else if (resizeTrackType.value === 'bbox') {
    track = bboxTracks.value.get(resizeTrackId.value);
    if (track) {
      await saveBboxTrack(track, videoFileName.value);
    }
  } else if (resizeTrackType.value === 'polygon') {
    track = polygonTracks.value.get(resizeTrackId.value);
    if (track) {
      await savePolygonTrack(track, videoFileName.value);
    }
  } else if (resizeTrackType.value === 'polyline') {
    track = polylineTracks.value.get(resizeTrackId.value);
    if (track) {
      await savePolylineTrack(track, videoFileName.value);
    }
  }

  isResizingRange.value = false;
  resizeTrackId.value = null;
  resizeTrackType.value = null;
  resizeEdge.value = null;
};

onMounted(async () => {
  (Konva as any).pixelRatio = 1;

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("mousemove", handleRangeResize);
  window.addEventListener("mouseup", endRangeResize);

  try {
    await openBrushDB();
    await openBboxDB();
    await openPolygonDB();
    await openPolylineDB();
  } catch (error) {
    console.error("Failed to open IndexedDB:", error);
  }

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

    try {
      const loadedBrushTracks = await loadBrushTracksForVideo(
        videoFileName.value
      );
      tracks.value = loadedBrushTracks;

      const loadedBboxTracks = await loadBboxTracksForVideo(
        videoFileName.value
      );
      bboxTracks.value = loadedBboxTracks;

      const loadedPolygonTracks = await loadPolygonTracksForVideo(
        videoFileName.value
      );
      polygonTracks.value = loadedPolygonTracks;

      const loadedPolylineTracks = await loadPolylineTracksForVideo(
        videoFileName.value
      );
      polylineTracks.value = loadedPolylineTracks;
    } catch (error) {
      console.error("Failed to load tracks:", error);
    }

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

.timeline-segment-bar.polyline {
  background: rgba(255, 0, 255, 0.25);
  border-color: #ff00ff;
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
.polyline-controls,
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
.polyline-controls label,
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
