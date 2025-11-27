import { ref, computed, type Ref } from "vue";
import type Konva from "konva";
import type { BoundingBox, BoundingBoxTrack } from "../types";
import { useBoundingBoxDrawing } from "./useBoundingBoxDrawing";

export interface UseBoundingBoxLayerOptions {
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  color: Ref<string>;
  autoSuggest: Ref<boolean>;
}

export function useBoundingBoxLayer(options: UseBoundingBoxLayerOptions) {
  const { currentFrame, totalFrames, color, autoSuggest } = options;

  const tracks = ref<Map<string, BoundingBoxTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);
  const editingTrackId = ref<string | null>(null);
  const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

  const drawing = useBoundingBoxDrawing();

  const currentFrameBboxes = computed((): BoundingBox[] => {
    const result: BoundingBox[] = [];

    for (const [trackId] of tracks.value) {
      const bbox = getBoxAtFrame(trackId, currentFrame.value);
      if (bbox) {
        result.push(bbox);
      }
    }

    if (drawing.pendingBbox.value) {
      result.push({
        id: "pending_bbox",
        x: drawing.pendingBbox.value.x,
        y: drawing.pendingBbox.value.y,
        width: drawing.pendingBbox.value.width,
        height: drawing.pendingBbox.value.height,
        rotation: drawing.pendingBbox.value.rotation,
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
      after: afterFrame !== null ? [afterFrame, keyframes.get(afterFrame)!] : null,
    };
  }

  function getBoxAtFrame(trackId: string, frame: number): BoundingBox | null {
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
    box: BoundingBox,
    label?: string
  ): string {
    const trackId = `bbox_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames.value);

    const track: BoundingBoxTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...box, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      color: box.color,
      classId: box.classId ?? 0,
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    box: BoundingBox
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggest.value) {
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

  function selectTrack(trackId: string | null): void {
    selectedTrackId.value = trackId;
    drawing.updateTransformerSelection(trackId);
  }

  function clearSelection(): void {
    selectedTrackId.value = null;
    editingTrackId.value = null;
    drawing.updateTransformerSelection(null);
  }

  function setEditingTrack(trackId: string | null): void {
    editingTrackId.value = trackId;
  }

  function updateTrackClass(trackId: string, classValue: number, classColor: string): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    for (const [frame, bbox] of track.keyframes) {
      track.keyframes.set(frame, {
        ...bbox,
        value: classValue,
        color: classColor,
      });
    }
    track.color = classColor;
    track.classId = classValue;
    tracks.value.set(trackId, { ...track });
  }

  function handleClick(trackId: string): void {
    if (trackId === "pending_bbox") return;
    selectTrack(trackId);
  }

  function handleDragEnd(
    trackId: string,
    newX: number,
    newY: number
  ): void {
    const bbox = getBoxAtFrame(trackId, currentFrame.value);
    if (!bbox) return;

    updateKeyframe(trackId, currentFrame.value, {
      ...bbox,
      x: newX,
      y: newY,
    });
  }

  function handleTransformEnd(trackId: string): void {
    const transformData = drawing.getTransformData(trackId);
    if (!transformData) return;

    const bbox = getBoxAtFrame(trackId, currentFrame.value);
    if (!bbox) return;

    const { x, y, width, height, rotation, scaleX, scaleY } = transformData;

    updateKeyframe(trackId, currentFrame.value, {
      ...bbox,
      x,
      y,
      width: width * scaleX,
      height: height * scaleY,
      rotation,
    });

    drawing.resetGroupScale(trackId);
  }

  function initializeLayer(layer: Konva.Layer): void {
    drawing.initialize(layer);
  }

  function startDrawing(pos: { x: number; y: number }): void {
    drawing.startDrawing(pos, color.value);
  }

  function updateDrawingPreview(pos: { x: number; y: number }): void {
    drawing.updatePreview(pos);
  }

  function finishDrawing(): BoundingBox | null {
    return drawing.finishDrawing(color.value, currentFrame.value);
  }

  function cancelDrawing(): void {
    drawing.cancelDrawing();
  }

  function confirmPendingBbox(classValue: number): string | null {
    const pending = drawing.pendingBbox.value;
    if (!pending) return null;

    const bbox: BoundingBox = {
      id: `bbox_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      x: pending.x,
      y: pending.y,
      width: pending.width,
      height: pending.height,
      rotation: pending.rotation,
      color: color.value,
      value: classValue,
      classId: classValue,
    };

    const trackId = createTrack(pending.frame, bbox);
    drawing.clearPendingBbox();

    return trackId;
  }

  function clearPendingBbox(): void {
    drawing.clearPendingBbox();
  }

  function setTracks(newTracks: Map<string, BoundingBoxTrack>): void {
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
    currentFrameBboxes,
    selectedTrack,
    isCurrentFrameKeyframe,
    isDrawing: drawing.drawingState,
    pendingBbox: drawing.pendingBbox,

    getBoxAtFrame,
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
    handleTransformEnd,

    initializeLayer,
    startDrawing,
    updateDrawingPreview,
    finishDrawing,
    cancelDrawing,
    confirmPendingBbox,
    clearPendingBbox,

    setTracks,
    clearAllTracks,
    dispose,
  };
}
