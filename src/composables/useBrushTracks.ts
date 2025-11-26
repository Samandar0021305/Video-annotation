import { ref, computed, type Ref } from 'vue';
import type { SegmentationContour } from '../types/contours';
import type { MaskData } from '../types/mask';
import {
  renderMasksToCanvas,
  isPointInMask,
  canvasToMaskData
} from '../utils/rle';

// Union type for keyframe data - supports both old contour format and new RLE format
export type KeyframeData = SegmentationContour[] | MaskData[];

// Type guard to check if keyframe data is MaskData
export function isMaskData(data: KeyframeData): data is MaskData[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return first !== undefined && 'rle' in first && 'left' in first && 'right' in first;
}

// Type guard to check if keyframe data is SegmentationContour
export function isContourData(data: KeyframeData): data is SegmentationContour[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return first !== undefined && 'contours' in first && 'classColor' in first;
}

export interface BrushTrack {
  trackId: string;
  keyframes: Map<number, KeyframeData>;
  interpolationEnabled: boolean;
  label?: string;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolateAlgorithm: string;
  /** Format of keyframe data: 'rle' (new) or 'contour' (legacy) */
  dataFormat: 'rle' | 'contour';
}

/** Per-track editing state for selective editing */
export interface TrackEditState {
  trackId: string;
  editCanvas: HTMLCanvasElement;
  isSelected: boolean;
  isHovered: boolean;
  originalMasks: MaskData[];  // Original masks before editing
}

function findSurroundingKeyframes(
  keyframes: Map<number, KeyframeData>,
  targetFrame: number
): { before: [number, KeyframeData] | null; after: [number, KeyframeData] | null } {
  const frames = Array.from(keyframes.keys()).sort((a, b) => a - b);

  let beforeFrame: number | null = null;
  let afterFrame: number | null = null;

  for (const frame of frames) {
    if (frame <= targetFrame) {
      beforeFrame = frame;
    }
    if (frame >= targetFrame && afterFrame === null) {
      afterFrame = frame;
      break;
    }
  }

  return {
    before: beforeFrame !== null ? [beforeFrame, keyframes.get(beforeFrame)!] : null,
    after: afterFrame !== null ? [afterFrame, keyframes.get(afterFrame)!] : null
  };
}

export function useBrushTracks(currentFrame: Ref<number>) {
  const tracks = ref<Map<string, BrushTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);
  const hoveredTrackId = ref<string | null>(null);

  // Per-track editing canvases for selective editing
  const trackEditStates = ref<Map<string, TrackEditState>>(new Map());

  // Segmentation edit mode: 'none' | 'brush' | 'eraser'
  const segmentationEditMode = ref<'none' | 'brush' | 'eraser'>('none');

  /**
   * Create a new track with RLE-based mask data
   */
  function createTrack(
    initialFrame: number,
    masks: MaskData[],
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `brush_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames);

    const track: BrushTrack = {
      trackId,
      keyframes: new Map([[initialFrame, masks]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      interpolateAlgorithm: 'rle-1.0',
      dataFormat: 'rle'
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  /**
   * Create a track with legacy contour data (for backwards compatibility)
   */
  function createTrackLegacy(
    initialFrame: number,
    contours: SegmentationContour[],
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `brush_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames);

    const track: BrushTrack = {
      trackId,
      keyframes: new Map([[initialFrame, contours]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      interpolateAlgorithm: 'contour-morph-1.0',
      dataFormat: 'contour'
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function addKeyframe(
    trackId: string,
    frame: number,
    data: KeyframeData,
    autoSuggestEnabled: boolean = false
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggestEnabled) {
      const result = track.keyframes.get(frame);
      const originalData = result ? [...result] : null;
      track.keyframes.set(frame, data);

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (originalData && !track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, originalData as KeyframeData);
      }
    } else {
      track.keyframes.set(frame, data);
    }
  }

  /**
   * Get mask data at a specific frame and render to canvas
   */
  async function getMasksAtFrame(
    trackId: string,
    frame: number,
    workingWidth: number,
    workingHeight: number,
    scale: number = 1
  ): Promise<{ masks: MaskData[]; canvas: HTMLCanvasElement | null; isInterpolated: boolean }> {
    const track = tracks.value.get(trackId);
    if (!track) return { masks: [], canvas: null, isInterpolated: false };

    const ranges = track.ranges || [];
    const isInRange = ranges.length === 0
      ? true
      : ranges.some(([start, end]) => frame >= start && frame < end);
    if (!isInRange) return { masks: [], canvas: null, isInterpolated: false };

    const hiddenAreas = track.hiddenAreas || [];
    const isHidden = hiddenAreas.some(([start, end]) => frame >= start && frame < end);
    if (isHidden) return { masks: [], canvas: null, isInterpolated: false };

    let keyframeData: KeyframeData | undefined;
    let isInterpolated = false;

    if (track.keyframes.has(frame)) {
      keyframeData = track.keyframes.get(frame)!;
    } else if (track.interpolationEnabled) {
      const { before } = findSurroundingKeyframes(track.keyframes, frame);
      if (before) {
        keyframeData = before[1];
        isInterpolated = true;
      }
    }

    if (!keyframeData || keyframeData.length === 0) {
      return { masks: [], canvas: null, isInterpolated: false };
    }

    if (isMaskData(keyframeData)) {
      const canvas = document.createElement('canvas');
      canvas.width = workingWidth;
      canvas.height = workingHeight;
      renderMasksToCanvas(keyframeData, canvas, true, scale);
      return { masks: keyframeData, canvas, isInterpolated };
    }

    return { masks: [], canvas: null, isInterpolated };
  }

  /**
   * Legacy: Get contours at a specific frame (for backwards compatibility)
   */
  async function getContoursAtFrame(
    trackId: string,
    frame: number,
    toolClasses: any[],
    workingWidth: number,
    workingHeight: number,
    displayScale: number = 1
  ): Promise<{ contours: SegmentationContour[]; canvas: HTMLCanvasElement | null; isInterpolated: boolean }> {
    const track = tracks.value.get(trackId);
    if (!track) return { contours: [], canvas: null, isInterpolated: false };

    if (track.dataFormat === 'rle') {
      const result = await getMasksAtFrame(trackId, frame, workingWidth, workingHeight, displayScale);
      return { contours: [], canvas: result.canvas, isInterpolated: result.isInterpolated };
    }

    const ranges = track.ranges || [];
    const isInRange = ranges.length === 0
      ? true
      : ranges.some(([start, end]) => frame >= start && frame < end);
    if (!isInRange) return { contours: [], canvas: null, isInterpolated: false };

    const hiddenAreas = track.hiddenAreas || [];
    const isHidden = hiddenAreas.some(([start, end]) => frame >= start && frame < end);
    if (isHidden) return { contours: [], canvas: null, isInterpolated: false };

    let keyframeData: KeyframeData | undefined;
    let isInterpolated = false;

    if (track.keyframes.has(frame)) {
      keyframeData = track.keyframes.get(frame)!;
    } else if (track.interpolationEnabled) {
      const { before } = findSurroundingKeyframes(track.keyframes, frame);
      if (before) {
        keyframeData = before[1];
        isInterpolated = true;
      }
    }

    if (!keyframeData || keyframeData.length === 0) {
      return { contours: [], canvas: null, isInterpolated: false };
    }

    if (isContourData(keyframeData)) {
      const { getImageFromContours } = await import('../utils/opencv-contours');
      const canvas = await getImageFromContours(toolClasses, keyframeData, displayScale, workingWidth, workingHeight);
      return { contours: keyframeData, canvas, isInterpolated };
    }

    return { contours: [], canvas: null, isInterpolated: false };
  }

  function toggleInterpolation(trackId: string): void {
    const track = tracks.value.get(trackId);
    if (track) {
      track.interpolationEnabled = !track.interpolationEnabled;
    }
  }

  function deleteTrack(trackId: string): void {
    tracks.value.delete(trackId);
    trackEditStates.value.delete(trackId);
    if (selectedTrackId.value === trackId) {
      selectedTrackId.value = null;
      segmentationEditMode.value = 'none';
    }
    if (hoveredTrackId.value === trackId) {
      hoveredTrackId.value = null;
    }
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    data: KeyframeData,
    autoSuggestEnabled: boolean = false,
    originalData?: KeyframeData
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggestEnabled && originalData) {
      track.keyframes.set(frame, data);

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (!track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, originalData);
      }
    } else {
      track.keyframes.set(frame, data);
    }
  }

  function deleteKeyframe(
    trackId: string,
    frame: number,
    autoSuggestEnabled: boolean = false,
    originalData?: KeyframeData
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggestEnabled && originalData) {
      track.keyframes.delete(frame);

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (!track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, originalData);
      }
    } else {
      track.keyframes.delete(frame);
    }

    if (track.keyframes.size === 0) {
      deleteTrack(trackId);
    }
  }

  function getTrackDataAtFrame(
    trackId: string,
    frame: number
  ): KeyframeData | null {
    const track = tracks.value.get(trackId);
    if (!track) return null;
    return track.keyframes.get(frame) || null;
  }

  function getTrackCanvasAtFrame(
    trackId: string,
    frame: number
  ): SegmentationContour[] | null {
    const data = getTrackDataAtFrame(trackId, frame);
    if (!data) return null;
    if (isContourData(data)) return data;
    return null;
  }

  function isKeyframe(trackId: string, frame: number): boolean {
    const track = tracks.value.get(trackId);
    return track ? track.keyframes.has(frame) : false;
  }

  const isCurrentFrameKeyframe = computed(() => {
    if (!selectedTrackId.value) return false;
    return isKeyframe(selectedTrackId.value, currentFrame.value);
  });

  const selectedTrack = computed(() => {
    if (!selectedTrackId.value) return null;
    return tracks.value.get(selectedTrackId.value) || null;
  });

  function clearAllTracks(): void {
    tracks.value.clear();
    trackEditStates.value.clear();
    selectedTrackId.value = null;
    hoveredTrackId.value = null;
    segmentationEditMode.value = 'none';
  }

  function jumpToNextKeyframe(seekToFrame: (frame: number) => void): void {
    if (!selectedTrackId.value) return;

    const track = tracks.value.get(selectedTrackId.value);
    if (!track) return;

    const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
    const nextFrame = frames.find(f => f > currentFrame.value);

    if (nextFrame !== undefined) {
      seekToFrame(nextFrame);
    }
  }

  function jumpToPreviousKeyframe(seekToFrame: (frame: number) => void): void {
    if (!selectedTrackId.value) return;

    const track = tracks.value.get(selectedTrackId.value);
    if (!track) return;

    const frames = Array.from(track.keyframes.keys()).sort((a, b) => b - a);
    const prevFrame = frames.find(f => f < currentFrame.value);

    if (prevFrame !== undefined) {
      seekToFrame(prevFrame);
    }
  }

  function updateTrackRange(
    trackId: string,
    rangeIndex: number,
    newStart: number,
    newEnd: number
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (newStart >= newEnd || newStart < 0 || newEnd < 0) {
      return;
    }

    if (track.ranges[rangeIndex]) {
      track.ranges[rangeIndex] = [newStart, newEnd];
    }
  }

  function isFrameInRanges(frame: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => frame >= start && frame < end);
  }

  function getTrackFormat(trackId: string): 'rle' | 'contour' | null {
    const track = tracks.value.get(trackId);
    return track ? track.dataFormat : null;
  }

  // ========== NEW: Selection & Editing Functions ==========

  /**
   * Find which track contains the point at current frame
   */
  function findTrackAtPoint(
    x: number,
    y: number,
    frame: number
  ): string | null {
    // Check tracks in reverse order (last added = top = checked first)
    const trackEntries = Array.from(tracks.value.entries()).reverse();

    for (const [trackId, track] of trackEntries) {
      if (track.dataFormat !== 'rle') continue;

      // Check if frame is in range
      const ranges = track.ranges || [];
      const isInRange = ranges.length === 0
        ? true
        : ranges.some(([start, end]) => frame >= start && frame < end);
      if (!isInRange) continue;

      // Get masks for this frame
      let keyframeData: KeyframeData | undefined;
      if (track.keyframes.has(frame)) {
        keyframeData = track.keyframes.get(frame)!;
      } else if (track.interpolationEnabled) {
        const { before } = findSurroundingKeyframes(track.keyframes, frame);
        if (before) {
          keyframeData = before[1];
        }
      }

      if (!keyframeData || !isMaskData(keyframeData)) continue;

      // Check if point is in any mask of this track
      for (const mask of keyframeData) {
        if (isPointInMask(mask, x, y)) {
          return trackId;
        }
      }
    }

    return null;
  }

  /**
   * Select a track for editing
   */
  function selectTrackForEditing(
    trackId: string,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Deselect previous
    if (selectedTrackId.value && selectedTrackId.value !== trackId) {
      deselectTrack();
    }

    const track = tracks.value.get(trackId);
    if (!track || track.dataFormat !== 'rle') return;

    selectedTrackId.value = trackId;

    // Get current frame masks
    let keyframeData: KeyframeData | undefined;
    const frame = currentFrame.value;

    if (track.keyframes.has(frame)) {
      keyframeData = track.keyframes.get(frame)!;
    } else if (track.interpolationEnabled) {
      const { before } = findSurroundingKeyframes(track.keyframes, frame);
      if (before) {
        keyframeData = before[1];
      }
    }

    if (!keyframeData || !isMaskData(keyframeData)) return;

    // Create edit canvas for this track
    const editCanvas = document.createElement('canvas');
    editCanvas.width = canvasWidth;
    editCanvas.height = canvasHeight;

    // Render current masks to edit canvas
    renderMasksToCanvas(keyframeData, editCanvas, true, 1);

    // Store edit state
    trackEditStates.value.set(trackId, {
      trackId,
      editCanvas,
      isSelected: true,
      isHovered: false,
      originalMasks: [...keyframeData]
    });
  }

  /**
   * Deselect current track and save changes
   */
  function deselectTrack(): void {
    if (!selectedTrackId.value) return;

    const editState = trackEditStates.value.get(selectedTrackId.value);
    if (editState) {
      // Re-encode canvas to RLE and update keyframe
      const originalMask = editState.originalMasks[0];
      if (originalMask) {
        const newMaskData = canvasToMaskData(
          editState.editCanvas,
          originalMask.color,
          originalMask.className,
          originalMask.classID
        );

        if (newMaskData) {
          const track = tracks.value.get(selectedTrackId.value);
          if (track) {
            track.keyframes.set(currentFrame.value, [newMaskData]);
          }
        }
      }
    }

    trackEditStates.value.delete(selectedTrackId.value);
    selectedTrackId.value = null;
    segmentationEditMode.value = 'none';
  }

  /**
   * Set hover state for a track
   */
  function setHoveredTrack(trackId: string | null): void {
    hoveredTrackId.value = trackId;
  }

  /**
   * Get the edit canvas for the selected track
   */
  function getSelectedEditCanvas(): HTMLCanvasElement | null {
    if (!selectedTrackId.value) return null;
    const editState = trackEditStates.value.get(selectedTrackId.value);
    return editState?.editCanvas || null;
  }

  /**
   * Set the segmentation edit mode
   */
  function setSegmentationEditMode(mode: 'none' | 'brush' | 'eraser'): void {
    segmentationEditMode.value = mode;
  }

  /**
   * Draw on the selected track's canvas (brush mode)
   */
  function brushOnSelectedTrack(
    x: number,
    y: number,
    size: number,
    color: string,
    isStart: boolean = false
  ): void {
    if (!selectedTrackId.value) return;

    const editState = trackEditStates.value.get(selectedTrackId.value);
    if (!editState) return;

    const ctx = editState.editCanvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  /**
   * Erase on the selected track's canvas (eraser mode)
   */
  function eraseOnSelectedTrack(
    x: number,
    y: number,
    size: number
  ): void {
    if (!selectedTrackId.value) return;

    const editState = trackEditStates.value.get(selectedTrackId.value);
    if (!editState) return;

    const ctx = editState.editCanvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Change the color of the selected track
   */
  function changeSelectedTrackColor(newColor: string): void {
    if (!selectedTrackId.value) return;

    const editState = trackEditStates.value.get(selectedTrackId.value);
    if (!editState || editState.originalMasks.length === 0) return;

    const firstMask = editState.originalMasks[0];
    if (!firstMask) return;

    // Update the original mask color
    firstMask.color = newColor;

    // Re-render with new color
    const ctx = editState.editCanvas.getContext('2d');
    if (!ctx) return;

    // Get current canvas data
    const imageData = ctx.getImageData(
      0, 0,
      editState.editCanvas.width,
      editState.editCanvas.height
    );

    // Parse new color
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(newColor);
    if (!result || !result[1] || !result[2] || !result[3]) return;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    // Change all non-transparent pixels to new color
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      if (alpha !== undefined && alpha > 0) {
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Get the color of the selected track
   */
  function getSelectedTrackColor(): string | null {
    if (!selectedTrackId.value) return null;

    const editState = trackEditStates.value.get(selectedTrackId.value);
    if (!editState || editState.originalMasks.length === 0) return null;

    const firstMask = editState.originalMasks[0];
    return firstMask ? firstMask.color : null;
  }

  /**
   * Check if a track is currently selected
   */
  function isTrackSelected(trackId: string): boolean {
    return selectedTrackId.value === trackId;
  }

  /**
   * Check if a track is currently hovered
   */
  function isTrackHovered(trackId: string): boolean {
    return hoveredTrackId.value === trackId;
  }

  return {
    tracks,
    selectedTrackId,
    selectedTrack,
    isCurrentFrameKeyframe,
    hoveredTrackId,
    segmentationEditMode,
    trackEditStates,
    createTrack,
    createTrackLegacy,
    addKeyframe,
    getMasksAtFrame,
    getContoursAtFrame,
    toggleInterpolation,
    deleteTrack,
    updateKeyframe,
    deleteKeyframe,
    getTrackDataAtFrame,
    getTrackCanvasAtFrame,
    isKeyframe,
    clearAllTracks,
    jumpToNextKeyframe,
    jumpToPreviousKeyframe,
    updateTrackRange,
    isFrameInRanges,
    getTrackFormat,
    isMaskData,
    isContourData,
    // New selection & editing functions
    findTrackAtPoint,
    selectTrackForEditing,
    deselectTrack,
    setHoveredTrack,
    getSelectedEditCanvas,
    setSegmentationEditMode,
    brushOnSelectedTrack,
    eraseOnSelectedTrack,
    changeSelectedTrackColor,
    getSelectedTrackColor,
    isTrackSelected,
    isTrackHovered
  };
}
