import { type Ref } from 'vue';
import Konva from 'konva';
import { Tool } from '../../types/enums';

interface UseSelectToolOptions {
  currentTool: Ref<Tool>;
  selectedTrackId: Ref<string | null>;
  selectedBboxTrackId: Ref<string | null>;
  selectedPolygonTrackId: Ref<string | null>;
  selectedSkeletonTrackId: Ref<string | null>;
  tracks: Ref<Map<string, any>>;
  bboxTracks: Ref<Map<string, any>>;
  polygonTracks: Ref<Map<string, any>>;
  skeletonTracks: Ref<Map<string, any>>;
  deleteTrack: (trackId: string) => void;
  deleteBboxTrack: (trackId: string) => void;
  deletePolygonTrack: (trackId: string) => void;
  deleteSkeletonTrack: (trackId: string) => void;
  saveAllAnnotations: () => Promise<void>;
  segmentationBrush: Ref<any>;
}

export function useSelectTool(options: UseSelectToolOptions) {
  const {
    currentTool,
    selectedTrackId,
    selectedBboxTrackId,
    selectedPolygonTrackId,
    selectedSkeletonTrackId,
    deleteTrack,
    deleteBboxTrack,
    deletePolygonTrack,
    deleteSkeletonTrack,
    saveAllAnnotations,
    segmentationBrush,
  } = options;

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      clearAllSelections();
      return true;
    }
    return false;
  };

  const clearAllSelections = () => {
    selectedBboxTrackId.value = null;
    selectedTrackId.value = null;
    selectedPolygonTrackId.value = null;
    selectedSkeletonTrackId.value = null;
  };

  const handleDeleteSelected = async () => {
    if (selectedTrackId.value) {
      const trackId = selectedTrackId.value;
      deleteTrack(trackId);

      if (segmentationBrush.value) {
        segmentationBrush.value.clearCanvas();
      }

      try {
        await saveAllAnnotations();
      } catch (error) {
        console.error('Failed to save after deleting brush track:', error);
      }

      selectedTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedBboxTrackId.value) {
      const trackId = selectedBboxTrackId.value;
      deleteBboxTrack(trackId);

      try {
        await saveAllAnnotations();
      } catch (error) {
        console.error('Failed to save after deleting bbox track:', error);
      }

      selectedBboxTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedPolygonTrackId.value) {
      const trackId = selectedPolygonTrackId.value;
      deletePolygonTrack(trackId);

      try {
        await saveAllAnnotations();
      } catch (error) {
        console.error('Failed to save after deleting polygon track:', error);
      }

      selectedPolygonTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedSkeletonTrackId.value) {
      const trackId = selectedSkeletonTrackId.value;
      deleteSkeletonTrack(trackId);

      try {
        await saveAllAnnotations();
      } catch (error) {
        console.error('Failed to save after deleting skeleton track:', error);
      }

      selectedSkeletonTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }
  };

  return {
    handleMouseDown,
    clearAllSelections,
    handleDeleteSelected,
  };
}
