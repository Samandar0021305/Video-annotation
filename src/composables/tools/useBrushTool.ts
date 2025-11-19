import { ref, type Ref } from 'vue';
import Konva from 'konva';
import type { KonvaSegmentationBrush } from '../../utils/konvaBrush';
import type { SegmentationContour } from '../../types/contours';

interface UseBrushToolOptions {
  stageRef: Ref<any>;
  segmentationBrush: Ref<KonvaSegmentationBrush | null>;
  currentFrame: Ref<number>;
  totalFrames: Ref<number>;
  brushSize: Ref<number>;
  brushColor: Ref<string>;
  tracks: Ref<Map<string, any>>;
  selectedTrackId: Ref<string | null>;
  selectedBboxTrackId: Ref<string | null>;
  selectedPolygonTrackId: Ref<string | null>;
  selectedPolylineTrackId: Ref<string | null>;
  selectedSkeletonTrackId: Ref<string | null>;
  createTrack: (frame: number, contours: SegmentationContour[], label?: string, totalFrames?: number) => string;
  addKeyframe: (trackId: string, frame: number, contours: SegmentationContour[]) => void;
  saveTrackWithKeyframes: (track: any, keyframes: Map<number, SegmentationContour[]>, videoFileName: string) => Promise<void>;
  videoFileName: Ref<string>;
  getSegmentationImageContoursForSaving: (image: any, storageScale: number) => SegmentationContour[];
  storageScale: Ref<number>;
}

export function useBrushTool(options: UseBrushToolOptions) {
  const {
    stageRef,
    segmentationBrush,
    currentFrame,
    totalFrames,
    tracks,
    selectedTrackId,
    selectedBboxTrackId,
    selectedPolygonTrackId,
    selectedPolylineTrackId,
    selectedSkeletonTrackId,
    createTrack,
    addKeyframe,
    saveTrackWithKeyframes,
    videoFileName,
    getSegmentationImageContoursForSaving,
    storageScale,
  } = options;

  const isDrawing = ref(false);
  const drawingStartFrame = ref(0);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.value || !segmentationBrush.value) return false;

    drawingStartFrame.value = currentFrame.value;
    isDrawing.value = true;

    segmentationBrush.value.onMouseDown(e);
    return true;
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.value || !segmentationBrush.value) return false;
    segmentationBrush.value.onMouseMove(e);
    return true;
  };

  const handleMouseUp = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.value || !segmentationBrush.value) return;

    isDrawing.value = false;
    segmentationBrush.value.onMouseUp(e);

    const brushImage = segmentationBrush.value.getBrushImage();
    if (!brushImage) return;

    const contours = getSegmentationImageContoursForSaving(
      brushImage.image(),
      storageScale.value
    );

    if (contours.length === 0) return;

    if (selectedTrackId.value) {
      addKeyframe(selectedTrackId.value, currentFrame.value, contours);

      const track = tracks.value.get(selectedTrackId.value);
      if (track) {
        try {
          await saveTrackWithKeyframes(
            track,
            track.keyframes,
            videoFileName.value
          );
        } catch (error) {
          console.error('Failed to save brush keyframe:', error);
        }
      }
    } else {
      const trackId = createTrack(
        currentFrame.value,
        contours,
        undefined,
        totalFrames.value
      );

      selectedTrackId.value = trackId;
      selectedBboxTrackId.value = null;
      selectedPolygonTrackId.value = null;
      selectedPolylineTrackId.value = null;
      selectedSkeletonTrackId.value = null;

      const track = tracks.value.get(trackId);
      if (track) {
        try {
          await saveTrackWithKeyframes(
            track,
            track.keyframes,
            videoFileName.value
          );
        } catch (error) {
          console.error('Failed to save new brush track:', error);
        }
      }
    }
  };

  const handleMouseOut = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDrawing.value) {
      await handleMouseUp(e);
    }
  };

  return {
    isDrawing,
    drawingStartFrame,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
  };
}
