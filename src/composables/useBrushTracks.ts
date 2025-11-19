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

function matchContours(
  contours1: SegmentationContour[],
  contours2: SegmentationContour[]
): Array<{ c1: SegmentationContour; c2: SegmentationContour }> {
  const matches: Array<{ c1: SegmentationContour; c2: SegmentationContour }> = [];
  const used = new Set<number>();

  for (let i = 0; i < contours1.length; i++) {
    const c1 = contours1[i];
    if (!c1) continue;

    let bestMatch = -1;
    let bestScore = Infinity;

    for (let j = 0; j < contours2.length; j++) {
      if (used.has(j)) continue;
      const c2 = contours2[j];
      if (!c2) continue;

      if (c1.classID !== c2.classID) continue;

      const totalPoints1 = c1.contours.reduce((sum, c) => sum + c.points.length, 0);
      const totalPoints2 = c2.contours.reduce((sum, c) => sum + c.points.length, 0);
      const sizeDiff = Math.abs(totalPoints1 - totalPoints2);

      const center1 = getContourCenter(c1);
      const center2 = getContourCenter(c2);
      const distance = Math.sqrt(
        Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
      );

      const score = sizeDiff + distance;

      if (score < bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      const c2 = contours2[bestMatch];
      if (c2) {
        matches.push({ c1, c2 });
        used.add(bestMatch);
      }
    }
  }

  return matches;
}

function getContourCenter(contour: SegmentationContour): { x: number; y: number } {
  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;

  for (const c of contour.contours) {
    for (const point of c.points) {
      totalX += point[0] || 0;
      totalY += point[1] || 0;
      totalPoints++;
    }
  }

  return {
    x: totalPoints > 0 ? totalX / totalPoints : 0,
    y: totalPoints > 0 ? totalY / totalPoints : 0
  };
}

function interpolateContourPair(
  c1: SegmentationContour,
  c2: SegmentationContour,
  t: number
): SegmentationContour {
  const interpolatedContours = [];

  const maxLen = Math.max(c1.contours.length, c2.contours.length);

  for (let i = 0; i < maxLen; i++) {
    const contour1 = c1.contours[i];
    const contour2 = c2.contours[i];

    if (!contour1 && contour2) {
      interpolatedContours.push({
        ...contour2,
        points: contour2.points.map(p => [
          (p[0] || 0) * t,
          (p[1] || 0) * t
        ])
      });
    } else if (contour1 && !contour2) {
      interpolatedContours.push({
        ...contour1,
        points: contour1.points.map(p => [
          (p[0] || 0) * (1 - t),
          (p[1] || 0) * (1 - t)
        ])
      });
    } else if (contour1 && contour2) {
      const maxPoints = Math.max(contour1.points.length, contour2.points.length);
      const interpolatedPoints: number[][] = [];

      for (let j = 0; j < maxPoints; j++) {
        const p1 = contour1.points[j % contour1.points.length];
        const p2 = contour2.points[j % contour2.points.length];

        if (p1 && p2) {
          interpolatedPoints.push([
            (p1[0] || 0) * (1 - t) + (p2[0] || 0) * t,
            (p1[1] || 0) * (1 - t) + (p2[1] || 0) * t
          ]);
        }
      }

      interpolatedContours.push({
        id: `${contour1.id}_interp`,
        points: interpolatedPoints,
        isHole: contour1.isHole
      });
    }
  }

  return {
    classColor: c1.classColor,
    className: c1.className,
    classID: c1.classID,
    contours: interpolatedContours,
    markup_type: c1.markup_type
  };
}

function interpolateBrushContours(
  contours1: SegmentationContour[],
  contours2: SegmentationContour[],
  frame1: number,
  frame2: number,
  targetFrame: number
): SegmentationContour[] {
  const t = (targetFrame - frame1) / (frame2 - frame1);

  const matches = matchContours(contours1, contours2);
  const interpolated: SegmentationContour[] = [];

  for (const match of matches) {
    if (match.c1 && match.c2) {
      interpolated.push(interpolateContourPair(match.c1, match.c2, t));
    }
  }

  const matched1 = new Set(matches.map(m => m.c1));
  const matched2 = new Set(matches.map(m => m.c2));

  for (const c of contours1) {
    if (!matched1.has(c)) {
      const faded = { ...c };
      faded.contours = faded.contours.map(ct => ({
        ...ct,
        points: ct.points.map(p => [(p[0] || 0) * (1 - t), (p[1] || 0) * (1 - t)])
      }));
      interpolated.push(faded);
    }
  }

  for (const c of contours2) {
    if (!matched2.has(c)) {
      const faded = { ...c };
      faded.contours = faded.contours.map(ct => ({
        ...ct,
        points: ct.points.map(p => [(p[0] || 0) * t, (p[1] || 0) * t])
      }));
      interpolated.push(faded);
    }
  }

  return interpolated;
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
    contours: SegmentationContour[]
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, contours);
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
    if (before && !after) {
      const canvas = await getImageFromContours(toolClasses, before[1], displayScale, workingWidth, workingHeight);
      return { contours: before[1], canvas, isInterpolated: false };
    }

    const [frame1, contours1] = before!;
    const [frame2, contours2] = after!;

    const interpolated = interpolateBrushContours(contours1, contours2, frame1, frame2, frame);
    const canvas = await getImageFromContours(toolClasses, interpolated, displayScale, workingWidth, workingHeight);

    return { contours: interpolated, canvas, isInterpolated: true };
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
