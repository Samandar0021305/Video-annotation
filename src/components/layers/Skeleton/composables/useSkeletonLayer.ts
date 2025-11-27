import { ref, computed, type Ref } from "vue";
import type Konva from "konva";
import type { Skeleton, SkeletonTrack, SkeletonPoint } from "../types";
import { useSkeletonDrawing } from "./useSkeletonDrawing";

export interface UseSkeletonLayerOptions {
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  color: Ref<string>;
  autoSuggest: Ref<boolean>;
}

export function useSkeletonLayer(options: UseSkeletonLayerOptions) {
  const { currentFrame, totalFrames, color, autoSuggest } = options;

  const tracks = ref<Map<string, SkeletonTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);
  const editingTrackId = ref<string | null>(null);
  const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

  const drawing = useSkeletonDrawing();

  const currentFrameSkeletons = computed((): Skeleton[] => {
    const result: Skeleton[] = [];

    for (const [trackId] of tracks.value) {
      const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
      if (skeleton) {
        result.push(skeleton);
      }
    }

    if (drawing.pendingSkeleton.value) {
      result.push({
        id: "pending_skeleton",
        points: drawing.pendingSkeleton.value.points,
        color: color.value,
      });
    }

    return result;
  });

  const selectedTrack = computed(() => {
    if (!selectedTrackId.value) return null;
    return tracks.value.get(selectedTrackId.value) || null;
  });

  const isCurrentFrameKeyframe = computed(() => {
    if (!selectedTrackId.value) return false;
    const track = tracks.value.get(selectedTrackId.value);
    return track ? track.keyframes.has(currentFrame.value) : false;
  });

  function findSurroundingKeyframes(
    keyframes: Map<number, Skeleton>,
    targetFrame: number
  ): { before: [number, Skeleton] | null; after: [number, Skeleton] | null } {
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
      after: afterFrame !== null ? [afterFrame, keyframes.get(afterFrame)!] : null,
    };
  }

  function getSkeletonAtFrame(trackId: string, frame: number): Skeleton | null {
    const track = tracks.value.get(trackId);
    if (!track) return null;

    const isInRange = track.ranges.some(
      ([start, end]) => frame >= start && frame < end
    );
    if (!isInRange) return null;

    const isHidden = track.hiddenAreas.some(
      ([start, end]) => frame >= start && frame < end
    );
    if (isHidden) return null;

    if (track.keyframes.has(frame)) {
      return track.keyframes.get(frame)!;
    }

    if (!track.interpolationEnabled) {
      return null;
    }

    const { before } = findSurroundingKeyframes(track.keyframes, frame);
    return before ? before[1] : null;
  }

  function createTrack(
    initialFrame: number,
    skeleton: Skeleton,
    label?: string
  ): string {
    const trackId = `skeleton_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames.value);

    const track: SkeletonTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...skeleton, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      color: skeleton.color,
      classId: skeleton.classId ?? 0,
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    skeleton: Skeleton
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggest.value) {
      const originalSkeleton = getSkeletonAtFrame(trackId, frame);
      track.keyframes.set(frame, { ...skeleton, id: trackId });

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (originalSkeleton && !track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, { ...originalSkeleton, id: trackId });
      }
    } else {
      track.keyframes.set(frame, { ...skeleton, id: trackId });
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

  function selectTrack(trackId: string | null): void {
    selectedTrackId.value = trackId;
  }

  function clearSelection(): void {
    selectedTrackId.value = null;
    editingTrackId.value = null;
  }

  function setEditingTrack(trackId: string | null): void {
    editingTrackId.value = trackId;
  }

  function updateTrackClass(trackId: string, classValue: number, classColor: string): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    for (const [frame, skeleton] of track.keyframes) {
      track.keyframes.set(frame, {
        ...skeleton,
        value: classValue,
        color: classColor,
      });
    }
    track.color = classColor;
    track.classId = classValue;
    tracks.value.set(trackId, { ...track });
  }

  function handleClick(trackId: string): void {
    if (trackId === "pending_skeleton") return;
    selectTrack(trackId);
  }

  function handleDragEnd(trackId: string, deltaX: number, deltaY: number): void {
    const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (!skeleton) return;

    const updatedPoints = skeleton.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    }));

    updateKeyframe(trackId, currentFrame.value, {
      ...skeleton,
      points: updatedPoints,
    });
  }

  function handleKeypointDragEnd(trackId: string, pointIndex: number, x: number, y: number): void {
    const skeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (!skeleton) return;

    const updatedPoints = [...skeleton.points];
    updatedPoints[pointIndex] = { x, y };

    updateKeyframe(trackId, currentFrame.value, {
      ...skeleton,
      points: updatedPoints,
    });
  }

  function initializeLayer(layer: Konva.Layer): void {
    drawing.initialize(layer);
  }

  function startDrawing(pos: SkeletonPoint): void {
    drawing.startDrawing(pos, color.value);
  }

  function addDrawingPoint(pos: SkeletonPoint): void {
    drawing.addPoint(pos, color.value);
  }

  function updateDrawingPreview(pos: SkeletonPoint): void {
    drawing.updatePreview(pos);
  }

  function finishDrawing(): Skeleton | null {
    return drawing.finishDrawing(color.value, currentFrame.value);
  }

  function cancelDrawing(): void {
    drawing.cancelDrawing();
  }

  function isDrawingActive(): boolean {
    return drawing.isDrawingActive();
  }

  function confirmPendingSkeleton(classValue: number): string | null {
    const pending = drawing.pendingSkeleton.value;
    if (!pending) return null;

    const skeleton: Skeleton = {
      id: `skeleton_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      points: pending.points,
      color: color.value,
      value: classValue,
      classId: classValue,
    };

    const trackId = createTrack(pending.frame, skeleton);
    drawing.clearPendingSkeleton();

    return trackId;
  }

  function clearPendingSkeleton(): void {
    drawing.clearPendingSkeleton();
  }

  function setTracks(newTracks: Map<string, SkeletonTrack>): void {
    tracks.value = new Map(newTracks);
  }

  function clearAllTracks(): void {
    tracks.value.clear();
    selectedTrackId.value = null;
    editingTrackId.value = null;
  }

  function dispose(): void {
    drawing.dispose();
    clearAllTracks();
  }

  return {
    tracks,
    selectedTrackId,
    editingTrackId,
    groupRef,
    currentFrameSkeletons,
    selectedTrack,
    isCurrentFrameKeyframe,
    isDrawing: drawing.drawingState,
    pendingSkeleton: drawing.pendingSkeleton,

    getSkeletonAtFrame,
    createTrack,
    updateKeyframe,
    toggleInterpolation,
    deleteTrack,
    selectTrack,
    clearSelection,
    setEditingTrack,
    updateTrackClass,

    handleClick,
    handleDragEnd,
    handleKeypointDragEnd,

    initializeLayer,
    startDrawing,
    addDrawingPoint,
    updateDrawingPreview,
    finishDrawing,
    cancelDrawing,
    isDrawingActive,
    confirmPendingSkeleton,
    clearPendingSkeleton,

    setTracks,
    clearAllTracks,
    dispose,
  };
}
