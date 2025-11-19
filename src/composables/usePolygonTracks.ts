import { ref, computed, type Ref } from 'vue';
import type { Polygon, PolygonTrack, PolygonPoint } from '../types/polygon';

function findSurroundingKeyframes(
  keyframes: Map<number, Polygon>,
  targetFrame: number
): { before: [number, Polygon] | null; after: [number, Polygon] | null } {
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

function interpolatePolygon(
  poly1: Polygon,
  poly2: Polygon,
  frame1: number,
  frame2: number,
  targetFrame: number
): Polygon {
  if (poly1.points.length !== poly2.points.length) {
    return poly1;
  }

  const t = (targetFrame - frame1) / (frame2 - frame1);

  const interpolatedPoints: PolygonPoint[] = poly1.points.map((p1, i) => {
    const p2 = poly2.points[i]!;
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  });

  return {
    id: poly1.id,
    points: interpolatedPoints,
    label: poly1.label,
    color: poly1.color,
    classId: poly1.classId
  };
}

export function usePolygonTracks(currentFrame: Ref<number>) {
  const tracks = ref<Map<string, PolygonTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);

  function createTrack(
    initialFrame: number,
    polygon: Polygon,
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `polygon_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const track: PolygonTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...polygon, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, totalFrames]],
      hiddenAreas: [],
      color: polygon.color,
      classId: polygon.classId
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function addKeyframe(
    trackId: string,
    frame: number,
    polygon: Polygon
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...polygon, id: trackId });
  }

  function getPolygonAtFrame(
    trackId: string,
    frame: number
  ): Polygon | null {
    const track = tracks.value.get(trackId);
    if (!track) return null;

    const isInRange = track.ranges.some(([start, end]) =>
      frame >= start && frame < end
    );
    if (!isInRange) return null;

    const isHidden = track.hiddenAreas.some(([start, end]) =>
      frame >= start && frame < end
    );
    if (isHidden) return null;

    if (track.keyframes.has(frame)) {
      return track.keyframes.get(frame)!;
    }

    if (!track.interpolationEnabled) {
      return null;
    }

    const { before, after } = findSurroundingKeyframes(track.keyframes, frame);

    if (!before && !after) return null;
    if (!before && after) return after[1];
    if (before && !after) return before[1];

    const [frame1, poly1] = before!;
    const [frame2, poly2] = after!;

    return interpolatePolygon(poly1, poly2, frame1, frame2, frame);
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    polygon: Polygon
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...polygon, id: trackId });
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
    getPolygonAtFrame,
    updateKeyframe,
    toggleInterpolation,
    deleteTrack,
    isKeyframe,
    clearAllTracks,
    jumpToNextKeyframe,
    jumpToPreviousKeyframe,
    isFrameInRanges
  };
}
