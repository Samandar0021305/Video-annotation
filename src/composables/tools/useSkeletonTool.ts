import { ref, type Ref } from 'vue';
import Konva from 'konva';
import type { Skeleton, SkeletonPoint } from '../../types/skeleton';

const MERGE_THRESHOLD = 5;
const POINT_RADIUS = 6;

interface UseSkeletonToolOptions {
  stageRef: Ref<any>;
  layerRef: Ref<any>;
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  storageScale: Ref<number>;
  displayScale: Ref<number>;
  color: Ref<string>;
  skeletonTracks: Ref<Map<string, any>>;
  selectedSkeletonTrackId: Ref<string | null>;
  selectedTrackId: Ref<string | null>;
  selectedBboxTrackId: Ref<string | null>;
  selectedPolygonTrackId: Ref<string | null>;
  createTrack: (frame: number, skeleton: Skeleton, label?: string, totalFrames?: number) => string;
  getSkeletonAtFrame: (trackId: string, frame: number) => Skeleton | null;
  updateKeyframe: (trackId: string, frame: number, skeleton: Skeleton) => void;
  saveTrack: (track: any, videoFileName: string) => Promise<void>;
  videoFileName: Ref<string>;
  updateTransformerSelection: () => void;
}

export function useSkeletonTool(options: UseSkeletonToolOptions) {
  const {
    stageRef,
    layerRef,
    currentFrame,
    totalFrames,
    storageScale,
    displayScale,
    color,
    skeletonTracks,
    selectedSkeletonTrackId,
    selectedTrackId,
    selectedBboxTrackId,
    selectedPolygonTrackId,
    createTrack,
    getSkeletonAtFrame,
    updateKeyframe,
    saveTrack,
    videoFileName,
    updateTransformerSelection,
  } = options;

  const isDrawing = ref(false);
  const currentPoints = ref<SkeletonPoint[]>([]);
  const previewLine = ref<Konva.Line | null>(null);
  const previewCircles = ref<Konva.Circle[]>([]);

  const createPreviewCircle = (x: number, y: number): Konva.Circle => {
    return new Konva.Circle({
      x,
      y,
      radius: POINT_RADIUS,
      fill: color.value,
      stroke: '#fff',
      strokeWidth: 2,
      listening: false,
    });
  };

  const clearPreviewCircles = () => {
    for (const circle of previewCircles.value) {
      circle.destroy();
    }
    previewCircles.value = [];
  };

  const shouldMergeWithExisting = (pos: { x: number; y: number }): boolean => {
    for (const existingPoint of currentPoints.value) {
      const distance = Math.sqrt(
        Math.pow(pos.x - existingPoint.x, 2) + Math.pow(pos.y - existingPoint.y, 2)
      );
      if (distance < MERGE_THRESHOLD) {
        return true;
      }
    }
    return false;
  };

  const handleMouseDown = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.value || !layerRef.value) return false;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    if (!isDrawing.value) {
      isDrawing.value = true;
      currentPoints.value = [{ x: pos.x, y: pos.y }];

      const layer = layerRef.value.getNode();
      previewLine.value = new Konva.Line({
        points: [pos.x, pos.y],
        stroke: color.value,
        strokeWidth: 2,
        dash: [5, 5],
        listening: false,
      });
      layer.add(previewLine.value);

      const circle = createPreviewCircle(pos.x, pos.y);
      layer.add(circle);
      previewCircles.value.push(circle);

      layer.batchDraw();
    } else {
      if (shouldMergeWithExisting(pos)) {
        return true;
      }

      currentPoints.value.push({ x: pos.x, y: pos.y });

      const layer = layerRef.value.getNode();
      const circle = createPreviewCircle(pos.x, pos.y);
      layer.add(circle);
      previewCircles.value.push(circle);

      updatePreview();
    }
    return true;
  };

  const updatePreview = () => {
    if (!previewLine.value || !layerRef.value) return;

    const points: number[] = [];
    for (const p of currentPoints.value) {
      points.push(p.x, p.y);
    }

    previewLine.value.points(points);
    layerRef.value.getNode().batchDraw();
  };

  const completeDrawing = async () => {
    if (currentPoints.value.length < 2) {
      cancelDrawing();
      return;
    }

    const scale = storageScale.value;
    const skeleton: Skeleton = {
      id: '',
      points: currentPoints.value.map((p) => ({
        x: p.x * scale,
        y: p.y * scale,
      })),
      color: color.value,
      classId: 0,
    };

    if (previewLine.value) {
      previewLine.value.destroy();
      previewLine.value = null;
    }

    clearPreviewCircles();

    const trackId = createTrack(
      currentFrame.value,
      skeleton,
      undefined,
      totalFrames.value
    );

    selectedSkeletonTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;

    const track = skeletonTracks.value.get(trackId);
    if (track) {
      try {
        await saveTrack(track, videoFileName.value);
      } catch (error) {
        console.error('Failed to save skeleton track:', error);
      }
    }

    isDrawing.value = false;
    currentPoints.value = [];

    updateTransformerSelection();
  };

  const cancelDrawing = () => {
    if (previewLine.value) {
      previewLine.value.destroy();
      previewLine.value = null;
    }
    clearPreviewCircles();
    isDrawing.value = false;
    currentPoints.value = [];
    if (layerRef.value) {
      layerRef.value.getNode().batchDraw();
    }
  };

  const handleMouseMove = (pos: { x: number; y: number }) => {
    if (!isDrawing.value || !previewLine.value || !layerRef.value) return false;

    const points: number[] = [];
    for (const p of currentPoints.value) {
      points.push(p.x, p.y);
    }
    points.push(pos.x, pos.y);

    previewLine.value.points(points);
    layerRef.value.getNode().batchDraw();
    return true;
  };

  const handleClick = (trackId: string) => {
    selectedSkeletonTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedPolygonTrackId.value = null;
    updateTransformerSelection();
  };

  const handleKeypointDrag = async (e: any, trackId: string, pointIndex: number) => {
    const circle = e.target;
    const track = skeletonTracks.value.get(trackId);
    if (!track) return;

    const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (!currentSkeleton) return;

    const scale = storageScale.value;
    const newX = circle.x() * scale;
    const newY = circle.y() * scale;

    const updatedPoints = currentSkeleton.points.map((p, i) =>
      i === pointIndex ? { x: newX, y: newY } : p
    );

    const updatedSkeleton: Skeleton = {
      ...currentSkeleton,
      points: updatedPoints,
    };

    updateKeyframe(trackId, currentFrame.value, updatedSkeleton);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after skeleton keypoint drag:', error);
    }
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const line = e.target as Konva.Line;
    const trackId = line.id();

    const track = skeletonTracks.value.get(trackId);
    if (!track) return;

    const currentSkeleton = getSkeletonAtFrame(trackId, currentFrame.value);
    if (!currentSkeleton) return;

    const scale = storageScale.value;
    const dx = line.x() * scale;
    const dy = line.y() * scale;

    const updatedPoints = currentSkeleton.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    line.x(0);
    line.y(0);

    const dScale = displayScale.value;
    const flatPoints: number[] = [];
    for (const p of updatedPoints) {
      flatPoints.push(p.x * dScale, p.y * dScale);
    }
    line.points(flatPoints);

    const updatedSkeleton: Skeleton = {
      ...currentSkeleton,
      points: updatedPoints,
    };

    updateKeyframe(trackId, currentFrame.value, updatedSkeleton);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after skeleton drag:', error);
    }
  };

  return {
    isDrawing,
    currentPoints,
    previewLine,
    handleMouseDown,
    handleMouseMove,
    updatePreview,
    completeDrawing,
    cancelDrawing,
    handleClick,
    handleKeypointDrag,
    handleDragEnd,
  };
}
