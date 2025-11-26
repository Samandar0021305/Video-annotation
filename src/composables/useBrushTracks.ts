import { ref, computed, type Ref } from 'vue';
import type { SegmentationContour } from '../types/contours';
import type { MaskData } from '../types/mask';
import { renderMasksToCanvas } from '../utils/rle';

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
   * @param trackId - Track ID
   * @param frame - Frame number
   * @param workingWidth - Working canvas width
   * @param workingHeight - Working canvas height
   * @param scale - Scale factor for rendering (default 1)
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

    // Check if frame is in range
    const ranges = track.ranges || [];
    const isInRange = ranges.length === 0
      ? true
      : ranges.some(([start, end]) => frame >= start && frame < end);
    if (!isInRange) return { masks: [], canvas: null, isInterpolated: false };

    // Check if frame is hidden
    const hiddenAreas = track.hiddenAreas || [];
    const isHidden = hiddenAreas.some(([start, end]) => frame >= start && frame < end);
    if (isHidden) return { masks: [], canvas: null, isInterpolated: false };

    // Get keyframe data
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

    // Handle RLE mask data
    if (isMaskData(keyframeData)) {
      const canvas = document.createElement('canvas');
      canvas.width = workingWidth;
      canvas.height = workingHeight;
      renderMasksToCanvas(keyframeData, canvas, true, scale);
      return { masks: keyframeData, canvas, isInterpolated };
    }

    // For legacy contour data, return empty (should use getContoursAtFrame instead)
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

    // For RLE tracks, use getMasksAtFrame instead
    if (track.dataFormat === 'rle') {
      const result = await getMasksAtFrame(trackId, frame, workingWidth, workingHeight, displayScale);
      // Return empty contours but with the rendered canvas
      return { contours: [], canvas: result.canvas, isInterpolated: result.isInterpolated };
    }

    // Check if frame is in range
    const ranges = track.ranges || [];
    const isInRange = ranges.length === 0
      ? true
      : ranges.some(([start, end]) => frame >= start && frame < end);
    if (!isInRange) return { contours: [], canvas: null, isInterpolated: false };

    // Check if frame is hidden
    const hiddenAreas = track.hiddenAreas || [];
    const isHidden = hiddenAreas.some(([start, end]) => frame >= start && frame < end);
    if (isHidden) return { contours: [], canvas: null, isInterpolated: false };

    // Get keyframe data
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

    // Handle legacy contour data
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
    if (selectedTrackId.value === trackId) {
      selectedTrackId.value = null;
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

  /**
   * Legacy alias for getTrackDataAtFrame
   */
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
    selectedTrackId.value = null;
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

  /**
   * Get the data format of a track
   */
  function getTrackFormat(trackId: string): 'rle' | 'contour' | null {
    const track = tracks.value.get(trackId);
    return track ? track.dataFormat : null;
  }

  return {
    tracks,
    selectedTrackId,
    selectedTrack,
    isCurrentFrameKeyframe,
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
    isContourData
  };
}
