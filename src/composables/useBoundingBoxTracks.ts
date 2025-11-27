import { ref, computed, type Ref } from 'vue';
import type { BoundingBox, BoundingBoxTrack } from '../components/layers';

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
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames);

    const track: BoundingBoxTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...box, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      color: box.color,
      classId: box.classId ?? 0
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

    return before![1];
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    box: BoundingBox,
    autoSuggestEnabled: boolean = false
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggestEnabled) {
      const originalBox = getBoxAtFrame(trackId, frame);
      track.keyframes.set(frame, { ...box, id: trackId });

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (originalBox && !track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, { ...originalBox, id: trackId });
      }
    } else {
      track.keyframes.set(frame, { ...box, id: trackId });
    }
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
