import { ref, computed, type Ref } from 'vue';
import type { BoundingBox, BoundingBoxTrack } from '../types/boundingBox';

function findSurroundingKeyframes(
  keyframes: Map<number, BoundingBox>,
  targetFrame: number
): { before: [number, BoundingBox] | null; after: [number, BoundingBox] | null } {
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

function interpolateRotation(r1: number, r2: number, t: number): number {
  let diff = r2 - r1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return r1 + diff * t;
}

function interpolateBoundingBox(
  box1: BoundingBox,
  box2: BoundingBox,
  frame1: number,
  frame2: number,
  targetFrame: number
): BoundingBox {
  const t = (targetFrame - frame1) / (frame2 - frame1);

  return {
    id: box1.id,
    x: box1.x + (box2.x - box1.x) * t,
    y: box1.y + (box2.y - box1.y) * t,
    width: box1.width + (box2.width - box1.width) * t,
    height: box1.height + (box2.height - box1.height) * t,
    rotation: interpolateRotation(box1.rotation, box2.rotation, t),
    label: box1.label,
    color: box1.color,
    classId: box1.classId
  };
}

export function useBoundingBoxTracks(currentFrame: Ref<number>) {
  const tracks = ref<Map<string, BoundingBoxTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);

  function createTrack(
    initialFrame: number,
    box: BoundingBox,
    label?: string,
    totalFrames: number = 1000
  ): string {
    const trackId = `bbox_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const track: BoundingBoxTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...box, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, totalFrames]],
      hiddenAreas: [],
      color: box.color,
      classId: box.classId
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function addKeyframe(
    trackId: string,
    frame: number,
    box: BoundingBox
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...box, id: trackId });
  }

  function getBoxAtFrame(
    trackId: string,
    frame: number
  ): BoundingBox | null {
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

    const [frame1, box1] = before!;
    const [frame2, box2] = after!;

    return interpolateBoundingBox(box1, box2, frame1, frame2, frame);
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    box: BoundingBox
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, { ...box, id: trackId });
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
    getBoxAtFrame,
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
