import { ref, computed, type Ref } from "vue";

export interface Point {
  id: string;
  x: number;
  y: number;
  color: string;
  classId: number;
  label?: string;
}

export interface PointTrack {
  id: string;
  keyframes: Map<number, Point>;
  interpolationEnabled: boolean;
  ranges: [number, number][];
  color: string;
  classId: number;
}

export function usePointTracks(_currentFrame: Ref<number>) {
  const tracks = ref<Map<string, PointTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);
  const editingTrackId = ref<string | null>(null);

  const createTrack = (
    frame: number,
    point: Point,
    color: string,
    classId: number,
    totalFrames: number = 1000
  ): string => {
    const trackId = `point_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(frame + defaultRangeLength, totalFrames);
    const newPoint: Point = {
      ...point,
      id: trackId,
      color,
      classId,
    };
    const track: PointTrack = {
      id: trackId,
      keyframes: new Map([[frame, newPoint]]),
      interpolationEnabled: true,
      ranges: [[frame, rangeEnd]],
      color,
      classId,
    };
    tracks.value.set(trackId, track);
    tracks.value = new Map(tracks.value);
    return trackId;
  };

  const updateKeyframe = (trackId: string, frame: number, point: Point): void => {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.set(frame, point);
    updateTrackRanges(track);
    tracks.value = new Map(tracks.value);
  };

  const updateTrackRanges = (track: PointTrack): void => {
    const frames = Array.from(track.keyframes.keys()).sort((a, b) => a - b);
    if (frames.length > 0) {
      const firstFrame = frames[0];
      const lastFrame = frames[frames.length - 1];
      if (firstFrame !== undefined && lastFrame !== undefined) {
        track.ranges = [[firstFrame, lastFrame + 1]];
      }
    }
  };

  const deleteTrack = (trackId: string): void => {
    tracks.value.delete(trackId);
    if (selectedTrackId.value === trackId) {
      selectedTrackId.value = null;
    }
    if (editingTrackId.value === trackId) {
      editingTrackId.value = null;
    }
    tracks.value = new Map(tracks.value);
  };

  const deleteKeyframe = (trackId: string, frame: number): void => {
    const track = tracks.value.get(trackId);
    if (!track) return;

    track.keyframes.delete(frame);
    if (track.keyframes.size === 0) {
      deleteTrack(trackId);
    } else {
      updateTrackRanges(track);
      tracks.value = new Map(tracks.value);
    }
  };

  const isFrameInRanges = (frame: number, ranges: [number, number][]): boolean => {
    return ranges.some(([start, end]) => frame >= start && frame < end);
  };

  const getPointAtFrame = (trackId: string, frame: number): Point | null => {
    const track = tracks.value.get(trackId);
    if (!track) return null;

    if (!isFrameInRanges(frame, track.ranges)) return null;

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

  const toggleInterpolation = (trackId: string): void => {
    const track = tracks.value.get(trackId);
    if (!track) return;
    track.interpolationEnabled = !track.interpolationEnabled;
    tracks.value = new Map(tracks.value);
  };

  const selectTrack = (trackId: string | null): void => {
    selectedTrackId.value = trackId;
  };

  const visibleTracks = computed(() => {
    return tracks.value;
  });

  const clearTracks = (): void => {
    tracks.value.clear();
    selectedTrackId.value = null;
    editingTrackId.value = null;
    tracks.value = new Map(tracks.value);
  };

  return {
    tracks,
    selectedTrackId,
    editingTrackId,
    visibleTracks,
    createTrack,
    updateKeyframe,
    deleteTrack,
    deleteKeyframe,
    getPointAtFrame,
    toggleInterpolation,
    selectTrack,
    clearTracks,
  };
}
