import { ref, computed, type Ref } from 'vue';
import type { Polyline, PolylineTrack, PolylinePoint } from '../types/polyline';

function findSurroundingKeyframes(
  keyframes: Map<number, Polyline>,
  targetFrame: number
): { before: [number, Polyline] | null; after: [number, Polyline] | null } {
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

function interpolatePolyline(
  line1: Polyline,
  line2: Polyline,
  frame1: number,
  frame2: number,
  targetFrame: number
): Polyline {
  if (line1.points.length !== line2.points.length) {
    return line1;
  }

  const t = (targetFrame - frame1) / (frame2 - frame1);

  const interpolatedPoints: PolylinePoint[] = line1.points.map((p1, i) => {
    const p2 = line2.points[i]!;
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  });

  return {
    id: line1.id,
    points: interpolatedPoints,
    label: line1.label,
    color: line1.color,
    classId: line1.classId
  };
}

export function usePolylineTracks(currentFrame: Ref<number>) {
  const tracks = ref<Map<string, PolylineTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);

  function createTrack(
    initialFrame: number,
    polyline: Polyline,
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `polyline_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const track: PolylineTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...polyline, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, totalFrames]],
      hiddenAreas: [],
      color: polyline.color,
      classId: polyline.classId
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function addKeyframe(
    trackId: string,
    frame: number,
    polyline: Polyline
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...polyline, id: trackId });
  }

  function getPolylineAtFrame(
    trackId: string,
    frame: number
  ): Polyline | null {
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

    const [frame1, line1] = before!;
    const [frame2, line2] = after!;

    return interpolatePolyline(line1, line2, frame1, frame2, frame);
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    polyline: Polyline
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...polyline, id: trackId });
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
    getPolylineAtFrame,
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
