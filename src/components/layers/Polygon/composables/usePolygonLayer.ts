import { ref, computed, type Ref } from "vue";
import type Konva from "konva";
import type { Polygon, PolygonTrack, PolygonPoint } from "../types";
import { usePolygonDrawing } from "./usePolygonDrawing";

export interface UsePolygonLayerOptions {
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  color: Ref<string>;
  autoSuggest: Ref<boolean>;
}

export function usePolygonLayer(options: UsePolygonLayerOptions) {
  const { currentFrame, totalFrames, color, autoSuggest } = options;

  const tracks = ref<Map<string, PolygonTrack>>(new Map());
  const selectedTrackId = ref<string | null>(null);
  const editingTrackId = ref<string | null>(null);
  const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

  const drawing = usePolygonDrawing();

  const currentFramePolygons = computed((): Polygon[] => {
    const result: Polygon[] = [];

    for (const [trackId] of tracks.value) {
      const polygon = getPolygonAtFrame(trackId, currentFrame.value);
      if (polygon) {
        result.push(polygon);
      }
    }

    if (drawing.pendingPolygon.value) {
      result.push({
        id: "pending_polygon",
        points: drawing.pendingPolygon.value.points,
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
      after: afterFrame !== null ? [afterFrame, keyframes.get(afterFrame)!] : null,
    };
  }

  function getPolygonAtFrame(trackId: string, frame: number): Polygon | null {
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
    polygon: Polygon,
    label?: string
  ): string {
    const trackId = `polygon_track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const defaultRangeLength = 15;
    const rangeEnd = Math.min(initialFrame + defaultRangeLength, totalFrames.value);

    const track: PolygonTrack = {
      trackId,
      keyframes: new Map([[initialFrame, { ...polygon, id: trackId }]]),
      interpolationEnabled: true,
      label,
      ranges: [[initialFrame, rangeEnd]],
      hiddenAreas: [],
      color: polygon.color,
      classId: polygon.classId ?? 0,
    };

    tracks.value.set(trackId, track);
    return trackId;
  }

  function updateKeyframe(
    trackId: string,
    frame: number,
    polygon: Polygon
  ): void {
    const track = tracks.value.get(trackId);
    if (!track) return;

    if (autoSuggest.value) {
      const originalPolygon = getPolygonAtFrame(trackId, frame);
      track.keyframes.set(frame, { ...polygon, id: trackId });

      const nextFrame = frame + 1;
      const isNextFrameInRange = track.ranges.some(
        ([start, end]) => nextFrame >= start && nextFrame < end
      );

      if (originalPolygon && !track.keyframes.has(nextFrame) && isNextFrameInRange) {
        track.keyframes.set(nextFrame, { ...originalPolygon, id: trackId });
      }
    } else {
      track.keyframes.set(frame, { ...polygon, id: trackId });
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

    for (const [frame, polygon] of track.keyframes) {
      track.keyframes.set(frame, {
        ...polygon,
        value: classValue,
        color: classColor,
      });
    }
    track.color = classColor;
    track.classId = classValue;
    tracks.value.set(trackId, { ...track });
  }

  function handleClick(trackId: string): void {
    if (trackId === "pending_polygon") return;
    selectTrack(trackId);
  }

  function handleDragEnd(trackId: string, deltaX: number, deltaY: number): void {
    const polygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (!polygon) return;

    const updatedPoints = polygon.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    }));

    updateKeyframe(trackId, currentFrame.value, {
      ...polygon,
      points: updatedPoints,
    });
  }

  function handleVertexDragEnd(trackId: string, pointIndex: number, x: number, y: number): void {
    const polygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (!polygon) return;

    const updatedPoints = [...polygon.points];
    updatedPoints[pointIndex] = { x, y };

    updateKeyframe(trackId, currentFrame.value, {
      ...polygon,
      points: updatedPoints,
    });
  }

  function initializeLayer(layer: Konva.Layer): void {
    drawing.initialize(layer);
  }

  function startDrawing(pos: PolygonPoint): void {
    drawing.startDrawing(pos, color.value);
  }

  function addDrawingPoint(pos: PolygonPoint): void {
    drawing.addPoint(pos, color.value);
  }

  function updateDrawingPreview(pos: PolygonPoint): void {
    drawing.updatePreview(pos);
  }

  function finishDrawing(): Polygon | null {
    return drawing.finishDrawing(color.value, currentFrame.value);
  }

  function cancelDrawing(): void {
    drawing.cancelDrawing();
  }

  function isDrawingActive(): boolean {
    return drawing.isDrawingActive();
  }

  function confirmPendingPolygon(classValue: number): string | null {
    const pending = drawing.pendingPolygon.value;
    if (!pending) return null;

    const polygon: Polygon = {
      id: `polygon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      points: pending.points,
      color: color.value,
      value: classValue,
      classId: classValue,
    };

    const trackId = createTrack(pending.frame, polygon);
    drawing.clearPendingPolygon();

    return trackId;
  }

  function clearPendingPolygon(): void {
    drawing.clearPendingPolygon();
  }

  function setTracks(newTracks: Map<string, PolygonTrack>): void {
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
    currentFramePolygons,
    selectedTrack,
    isCurrentFrameKeyframe,
    isDrawing: drawing.drawingState,
    pendingPolygon: drawing.pendingPolygon,

    getPolygonAtFrame,
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
    handleVertexDragEnd,

    initializeLayer,
    startDrawing,
    addDrawingPoint,
    updateDrawingPreview,
    finishDrawing,
    cancelDrawing,
    isDrawingActive,
    confirmPendingPolygon,
    clearPendingPolygon,

    setTracks,
    clearAllTracks,
    dispose,
  };
}
