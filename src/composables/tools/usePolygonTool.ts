import { ref, type Ref } from 'vue';
import Konva from 'konva';
import type { Polygon, PolygonPoint } from '../../types/polygon';

interface UsePolygonToolOptions {
  stageRef: Ref<any>;
  layerRef: Ref<any>;
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  storageScale: Ref<number>;
  color: Ref<string>;
  polygonTracks: Ref<Map<string, any>>;
  selectedPolygonTrackId: Ref<string | null>;
  selectedTrackId: Ref<string | null>;
  selectedBboxTrackId: Ref<string | null>;
  selectedSkeletonTrackId: Ref<string | null>;
  createTrack: (frame: number, polygon: Polygon, label?: string, totalFrames?: number) => string;
  getPolygonAtFrame: (trackId: string, frame: number) => Polygon | null;
  updateKeyframe: (trackId: string, frame: number, polygon: Polygon) => void;
  saveTrack: (track: any, videoFileName: string) => Promise<void>;
  videoFileName: Ref<string>;
  updateTransformerSelection: () => void;
}

export function usePolygonTool(options: UsePolygonToolOptions) {
  const {
    stageRef,
    layerRef,
    currentFrame,
    totalFrames,
    storageScale,
    color,
    polygonTracks,
    selectedPolygonTrackId,
    selectedTrackId,
    selectedBboxTrackId,
    selectedSkeletonTrackId,
    createTrack,
    getPolygonAtFrame,
    updateKeyframe,
    saveTrack,
    videoFileName,
    updateTransformerSelection,
  } = options;

  const POINT_RADIUS = 6;

  const isDrawing = ref(false);
  const currentPoints = ref<PolygonPoint[]>([]);
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

  const handleMouseDown = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.value || !layerRef.value) return false;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    if (!isDrawing.value) {
      isDrawing.value = true;
      currentPoints.value = [{ x: pos.x, y: pos.y }];

      const layer = layerRef.value.getNode();

      // Create preview line with closed shape and fill
      previewLine.value = new Konva.Line({
        points: [pos.x, pos.y],
        stroke: color.value,
        strokeWidth: 2,
        dash: [5, 5],
        closed: true,
        fill: color.value + '30',
        listening: false,
      });
      layer.add(previewLine.value);

      // Create first preview circle
      const circle = createPreviewCircle(pos.x, pos.y);
      layer.add(circle);
      previewCircles.value.push(circle);

      layer.batchDraw();
    } else {
      const firstPoint = currentPoints.value[0];
      if (!firstPoint) return false;

      const distance = Math.sqrt(
        Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
      );

      if (distance < 15 && currentPoints.value.length >= 3) {
        completeDrawing();
      } else {
        currentPoints.value.push({ x: pos.x, y: pos.y });

        // Add preview circle for new point
        const layer = layerRef.value.getNode();
        const circle = createPreviewCircle(pos.x, pos.y);
        layer.add(circle);
        previewCircles.value.push(circle);

        updatePreview();
      }
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
    if (currentPoints.value.length < 3) {
      cancelDrawing();
      return;
    }

    const scale = storageScale.value;
    const polygon: Polygon = {
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
      polygon,
      undefined,
      totalFrames.value
    );

    selectedPolygonTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedSkeletonTrackId.value = null;

    const track = polygonTracks.value.get(trackId);
    if (track) {
      try {
        await saveTrack(track, videoFileName.value);
      } catch (error) {
        console.error('Failed to save polygon track:', error);
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

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const line = e.target as Konva.Line;
    const trackId = line.id();

    selectedPolygonTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedBboxTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    updateTransformerSelection();
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const line = e.target as Konva.Line;
    const trackId = line.id();

    const track = polygonTracks.value.get(trackId);
    if (!track) return;

    const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (!currentPolygon) return;

    const scale = storageScale.value;
    const dx = line.x() * scale;
    const dy = line.y() * scale;

    const updatedPoints = currentPolygon.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    line.x(0);
    line.y(0);

    const updatedPolygon: Polygon = {
      ...currentPolygon,
      points: updatedPoints,
    };

    updateKeyframe(trackId, currentFrame.value, updatedPolygon);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after polygon drag:', error);
    }
  };

  const handleTransformEnd = async (transformerRef: Ref<Konva.Transformer | null>, displayScale: Ref<number>) => {
    const nodes = transformerRef.value?.nodes();
    if (!nodes || nodes.length === 0) return;

    const line = nodes[0] as Konva.Line;
    const trackId = line.id();

    const track = polygonTracks.value.get(trackId);
    if (!track) return;

    const currentPolygon = getPolygonAtFrame(trackId, currentFrame.value);
    if (!currentPolygon) return;

    const scaleX = line.scaleX();
    const scaleY = line.scaleY();
    const rotation = line.rotation();
    const dx = line.x();
    const dy = line.y();

    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const scale = storageScale.value;

    const updatedPoints = currentPolygon.points.map((p) => {
      const scaledX = p.x * displayScale.value * scaleX;
      const scaledY = p.y * displayScale.value * scaleY;

      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      return {
        x: (rotatedX + dx) * scale,
        y: (rotatedY + dy) * scale,
      };
    });

    line.scaleX(1);
    line.scaleY(1);
    line.rotation(0);
    line.x(0);
    line.y(0);

    const flatPoints: number[] = [];
    for (const p of updatedPoints) {
      flatPoints.push(p.x * displayScale.value, p.y * displayScale.value);
    }
    line.points(flatPoints);

    const updatedPolygon: Polygon = {
      ...currentPolygon,
      points: updatedPoints,
    };

    updateKeyframe(trackId, currentFrame.value, updatedPolygon);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after polygon transform:', error);
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
    handleDragEnd,
    handleTransformEnd,
  };
}
