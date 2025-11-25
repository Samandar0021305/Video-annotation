import { ref, computed, type Ref } from 'vue';
import type { SegmentationContour } from '../types/contours';
import { getImageFromContours } from '../utils/opencv-contours';

export interface BrushTrack {
  trackId: string;
  keyframes: Map<number, SegmentationContour[]>;
  interpolationEnabled: boolean;
  label?: string;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolateAlgorithm: string;
}

function findSurroundingKeyframes(
  keyframes: Map<number, SegmentationContour[]>,
  targetFrame: number
): { before: [number, SegmentationContour[]] | null; after: [number, SegmentationContour[]] | null } {
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

  function createTrack(
    initialFrame: number,
    contours: SegmentationContour[],
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `brush_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const track: BrushTrack = {
      trackId,
      keyframes: new Map([[initialFrame, contours]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, totalFrames]],
      hiddenAreas: [],
      interpolateAlgorithm: 'contour-morph-1.0'
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function addKeyframe(
    trackId: string,
    frame: number,
    contours: SegmentationContour[],
    autoSuggestEnabled: boolean = false
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggestEnabled) {
      const result = track.keyframes.get(frame);
      const originalContours = result ? [...result] : null;
      track.keyframes.set(frame, contours);

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (originalContours && !track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, originalContours);
      }
    } else {
      track.keyframes.set(frame, contours);
    }
  }

  /**
   * Get contours at a specific frame with scaling support for 4K
   * @param trackId - Track ID
   * @param frame - Frame number
   * @param toolClasses - Tool classes for rendering
   * @param workingWidth - Working canvas width (e.g., 1920 for 4K)
   * @param workingHeight - Working canvas height (e.g., 1080 for 4K)
   * @param displayScale - Scale factor from original to working (e.g., 0.5 for 4K→1080p)
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

    const isInRange = track.ranges.some(([start, end]) =>
      frame >= start && frame < end
    );
    if (!isInRange) return { contours: [], canvas: null, isInterpolated: false };

    const isHidden = track.hiddenAreas.some(([start, end]) =>
      frame >= start && frame < end
    );
    if (isHidden) return { contours: [], canvas: null, isInterpolated: false };

    if (track.keyframes.has(frame)) {
      const contours = track.keyframes.get(frame)!;
      // Contours are stored at original resolution, render at working resolution
      const canvas = await getImageFromContours(toolClasses, contours, displayScale, workingWidth, workingHeight);
      return { contours, canvas, isInterpolated: false };
    }

    if (!track.interpolationEnabled) {
      return { contours: [], canvas: null, isInterpolated: false };
    }

    const { before, after } = findSurroundingKeyframes(track.keyframes, frame);

    if (!before && !after) return { contours: [], canvas: null, isInterpolated: false };
    if (!before && after) {
      const canvas = await getImageFromContours(toolClasses, after[1], displayScale, workingWidth, workingHeight);
      return { contours: after[1], canvas, isInterpolated: false };
    }

    const canvas = await getImageFromContours(toolClasses, before![1], displayScale, workingWidth, workingHeight);
    return { contours: before![1], canvas, isInterpolated: false };
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

  return {
    tracks,
    selectedTrackId,
    selectedTrack,
    isCurrentFrameKeyframe,
    createTrack,
    addKeyframe,
    getContoursAtFrame,
    toggleInterpolation,
    deleteTrack,
    isKeyframe,
    clearAllTracks,
    jumpToNextKeyframe,
    jumpToPreviousKeyframe,
    updateTrackRange,
    isFrameInRanges
  };
}
