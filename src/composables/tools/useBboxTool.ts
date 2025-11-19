import { ref, type Ref } from 'vue';
import Konva from 'konva';
import type { BoundingBox } from '../../types/boundingBox';

interface UseBboxToolOptions {
  stageRef: Ref<any>;
  layerRef: Ref<any>;
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  storageScale: Ref<number>;
  displayScale: Ref<number>;
  color: Ref<string>;
  bboxTracks: Ref<Map<string, any>>;
  selectedBboxTrackId: Ref<string | null>;
  selectedTrackId: Ref<string | null>;
  selectedPolygonTrackId: Ref<string | null>;
  selectedSkeletonTrackId: Ref<string | null>;
  createTrack: (frame: number, box: BoundingBox, label?: string, totalFrames?: number) => string;
  getBoxAtFrame: (trackId: string, frame: number) => BoundingBox | null;
  updateKeyframe: (trackId: string, frame: number, box: BoundingBox) => void;
  saveTrack: (track: any, videoFileName: string) => Promise<void>;
  videoFileName: Ref<string>;
  updateTransformerSelection: () => void;
}

export function useBboxTool(options: UseBboxToolOptions) {
  const {
    stageRef,
    layerRef,
    currentFrame,
    totalFrames,
    storageScale,
    displayScale,
    color,
    bboxTracks,
    selectedBboxTrackId,
    selectedTrackId,
    selectedPolygonTrackId,
    selectedSkeletonTrackId,
    createTrack,
    getBoxAtFrame,
    updateKeyframe,
    saveTrack,
    videoFileName,
    updateTransformerSelection,
  } = options;

  const isDrawing = ref(false);
  const drawStartPos = ref({ x: 0, y: 0 });
  const previewRect = ref<Konva.Rect | null>(null);

  const handleMouseDown = (_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.value || !layerRef.value) return false;

    const stage = stageRef.value.getNode();
    const pos = stage.getRelativePointerPosition();

    isDrawing.value = true;
    drawStartPos.value = { x: pos.x, y: pos.y };

    const layer = layerRef.value.getNode();

    previewRect.value = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: color.value,
      strokeWidth: 2,
      dash: [5, 5],
      listening: false,
    });

    layer.add(previewRect.value);
    layer.batchDraw();
    return true;
  };

  const handleMouseMove = (pos: { x: number; y: number }) => {
    if (!isDrawing.value || !previewRect.value || !layerRef.value) return false;

    const width = pos.x - drawStartPos.value.x;
    const height = pos.y - drawStartPos.value.y;

    previewRect.value.setAttrs({
      x: width < 0 ? pos.x : drawStartPos.value.x,
      y: height < 0 ? pos.y : drawStartPos.value.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    layerRef.value.getNode().batchDraw();
    return true;
  };

  const handleMouseUp = async () => {
    if (!isDrawing.value || !previewRect.value) return;

    isDrawing.value = false;

    const width = previewRect.value.width();
    const height = previewRect.value.height();

    if (width < 10 || height < 10) {
      previewRect.value.destroy();
      previewRect.value = null;
      layerRef.value.getNode().batchDraw();
      return;
    }

    const scale = storageScale.value;
    const box: BoundingBox = {
      id: '',
      x: previewRect.value.x() * scale,
      y: previewRect.value.y() * scale,
      width: width * scale,
      height: height * scale,
      rotation: 0,
      color: color.value,
      classId: 0,
    };

    previewRect.value.destroy();
    previewRect.value = null;

    const trackId = createTrack(
      currentFrame.value,
      box,
      undefined,
      totalFrames.value
    );

    selectedBboxTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;

    const track = bboxTracks.value.get(trackId);
    if (track) {
      try {
        await saveTrack(track, videoFileName.value);
      } catch (error) {
        console.error('Failed to save bbox track:', error);
      }
    }

    updateTransformerSelection();
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const rect = e.target as Konva.Rect;
    const trackId = rect.id();

    selectedBboxTrackId.value = trackId;
    selectedTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
    updateTransformerSelection();
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const rect = e.target as Konva.Rect;
    const trackId = rect.id();

    const track = bboxTracks.value.get(trackId);
    if (!track) return;

    const currentBox = getBoxAtFrame(trackId, currentFrame.value);
    if (!currentBox) return;

    const scale = storageScale.value;
    const updatedBox: BoundingBox = {
      ...currentBox,
      x: rect.x() * scale,
      y: rect.y() * scale,
      width: rect.width() * rect.scaleX() * scale,
      height: rect.height() * rect.scaleY() * scale,
    };

    rect.scaleX(1);
    rect.scaleY(1);
    rect.width(updatedBox.width * displayScale.value);
    rect.height(updatedBox.height * displayScale.value);
    rect.x(updatedBox.x * displayScale.value);
    rect.y(updatedBox.y * displayScale.value);

    updateKeyframe(trackId, currentFrame.value, updatedBox);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after bbox drag:', error);
    }
  };

  const handleTransformEnd = async (transformerRef: Ref<Konva.Transformer | null>) => {
    const nodes = transformerRef.value?.nodes();
    if (!nodes || nodes.length === 0) return;

    const rect = nodes[0] as Konva.Rect;
    const trackId = rect.id();

    const track = bboxTracks.value.get(trackId);
    if (!track) return;

    const currentBox = getBoxAtFrame(trackId, currentFrame.value);
    if (!currentBox) return;

    const scale = storageScale.value;
    const updatedBox: BoundingBox = {
      ...currentBox,
      x: rect.x() * scale,
      y: rect.y() * scale,
      width: rect.width() * rect.scaleX() * scale,
      height: rect.height() * rect.scaleY() * scale,
    };

    rect.scaleX(1);
    rect.scaleY(1);
    rect.width(updatedBox.width * displayScale.value);
    rect.height(updatedBox.height * displayScale.value);
    rect.x(updatedBox.x * displayScale.value);
    rect.y(updatedBox.y * displayScale.value);

    updateKeyframe(trackId, currentFrame.value, updatedBox);

    try {
      await saveTrack(track, videoFileName.value);
    } catch (error) {
      console.error('Failed to save after bbox transform:', error);
    }
  };

  return {
    isDrawing,
    drawStartPos,
    previewRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick,
    handleDragEnd,
    handleTransformEnd,
  };
}
