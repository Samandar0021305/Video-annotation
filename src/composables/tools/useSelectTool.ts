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
  deleteBrushTrackFromDB: (trackId: string, videoFileName: string) => Promise<void>;
  deleteBboxTrackFromDB: (trackId: string, videoFileName: string) => Promise<void>;
  deletePolygonTrackFromDB: (trackId: string, videoFileName: string) => Promise<void>;
  deleteSkeletonTrackFromDB: (trackId: string, videoFileName: string) => Promise<void>;
  videoFileName: Ref<string>;
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
    deleteBrushTrackFromDB,
    deleteBboxTrackFromDB,
    deletePolygonTrackFromDB,
    deleteSkeletonTrackFromDB,
    videoFileName,
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
        await deleteBrushTrackFromDB(trackId, videoFileName.value);
      } catch (error) {
        console.error('Failed to delete brush track from DB:', error);
      }

      selectedTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedBboxTrackId.value) {
      const trackId = selectedBboxTrackId.value;
      deleteBboxTrack(trackId);

      try {
        await deleteBboxTrackFromDB(trackId, videoFileName.value);
      } catch (error) {
        console.error('Failed to delete bbox track from DB:', error);
      }

      selectedBboxTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedPolygonTrackId.value) {
      const trackId = selectedPolygonTrackId.value;
      deletePolygonTrack(trackId);

      try {
        await deletePolygonTrackFromDB(trackId, videoFileName.value);
      } catch (error) {
        console.error('Failed to delete polygon track from DB:', error);
      }

      selectedPolygonTrackId.value = null;
      currentTool.value = Tool.SELECT;
      return;
    }

    if (selectedSkeletonTrackId.value) {
      const trackId = selectedSkeletonTrackId.value;
      deleteSkeletonTrack(trackId);

      try {
        await deleteSkeletonTrackFromDB(trackId, videoFileName.value);
      } catch (error) {
        console.error('Failed to delete skeleton track from DB:', error);
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
