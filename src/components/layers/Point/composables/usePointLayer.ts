import { ref, computed } from "vue";
import type { Point, PointTrack } from "../types";

export function usePointLayer() {
  const pointTracks = ref<Map<string, PointTrack>>(new Map());
  const selectedPointTrackId = ref<string | null>(null);

  const createPointTrack = (frame: number, point: Point, color: string, classId: number): string => {
    const trackId = `point_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const track: PointTrack = {
      id: trackId,
      keyframes: new Map([[frame, { ...point, color, classId }]]),
      interpolationEnabled: false,
      ranges: [[frame, frame + 1]],
    };
    pointTracks.value.set(trackId, track);
    return trackId;
  };

  const updatePointTrack = (trackId: string, frame: number, point: Point): void => {
    const track = pointTracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, point);

    const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
    if (frames.length > 0) {
      const firstFrame = frames[0];
      const lastFrame = frames[frames.length - 1];
      if (firstFrame !== undefined && lastFrame !== undefined) {
        track.ranges = [[firstFrame, lastFrame + 1]];
      }
    }
  };

  const deletePointTrack = (trackId: string): void => {
    pointTracks.value.delete(trackId);
    if (selectedPointTrackId.value === trackId) {
      selectedPointTrackId.value = null;
    }
  };

  const getPointAtFrame = (trackId: string, frame: number): Point | null => {
    const track = pointTracks.value.get(trackId);
    if (!track) return null;

    const point = track.keyframes.get(frame);
    if (point) return point;

    if (track.interpolationEnabled) {
      const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
      let beforeFrame: number | null = null;
      for (const f of frames) {
        if (f <= frame) beforeFrame = f;
        else break;
      }
      if (beforeFrame !== null) {
        return track.keyframes.get(beforeFrame) || null;
      }
    }

    return null;
  };

  const visiblePointTracks = computed(() => {
    return pointTracks.value;
  });

  const selectPointTrack = (trackId: string | null): void => {
    selectedPointTrackId.value = trackId;
  };

  const clearPointTracks = (): void => {
    pointTracks.value.clear();
    selectedPointTrackId.value = null;
  };

  return {
    pointTracks,
    selectedPointTrackId,
    visiblePointTracks,
    createPointTrack,
    updatePointTrack,
    deletePointTrack,
    getPointAtFrame,
    selectPointTrack,
    clearPointTracks,
  };
}
