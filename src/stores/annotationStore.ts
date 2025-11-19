import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  loadAnnotations,
  saveAnnotations,
  tracksMapToArray,
  tracksArrayToMap,
} from '../services/annotationApi';

export const useAnnotationStore = defineStore('annotations', () => {
  // State - using Maps for efficient track access by ID
  const bboxTracks = ref<Map<string, any>>(new Map());
  const polygonTracks = ref<Map<string, any>>(new Map());
  const skeletonTracks = ref<Map<string, any>>(new Map());
  const brushTracks = ref<Map<string, any>>(new Map());

  // Metadata
  const videoFileName = ref<string>('');
  const isLoading = ref<boolean>(false);
  const isSaving = ref<boolean>(false);

  // Getters
  const hasTracks = computed(() => {
    return (
      bboxTracks.value.size > 0 ||
      polygonTracks.value.size > 0 ||
      skeletonTracks.value.size > 0 ||
      brushTracks.value.size > 0
    );
  });

  // Actions
  async function load(fileName: string) {
    if (!fileName) return;

    isLoading.value = true;
    try {
      const data = await loadAnnotations(fileName);
      bboxTracks.value = tracksArrayToMap(data.bbox || []);
      polygonTracks.value = tracksArrayToMap(data.polygon || []);
      skeletonTracks.value = tracksArrayToMap(data.skeleton || []);
      brushTracks.value = tracksArrayToMap(data.brush || []);
      videoFileName.value = fileName;
    } catch (error) {
      console.error('Failed to load annotations:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function save() {
    if (!videoFileName.value) return;

    isSaving.value = true;
    try {
      const payload = {
        bbox: tracksMapToArray(bboxTracks.value),
        polygon: tracksMapToArray(polygonTracks.value),
        skeleton: tracksMapToArray(skeletonTracks.value),
        brush: tracksMapToArray(brushTracks.value),
      };
      await saveAnnotations(videoFileName.value, payload);
    } catch (error) {
      console.error('Failed to save annotations:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  async function clearAll() {
    bboxTracks.value.clear();
    polygonTracks.value.clear();
    skeletonTracks.value.clear();
    brushTracks.value.clear();

    // Save empty state to API
    await save();
  }

  // Bbox track operations
  function setBboxTrack(trackId: string, track: any) {
    bboxTracks.value.set(trackId, track);
  }

  function deleteBboxTrack(trackId: string) {
    bboxTracks.value.delete(trackId);
  }

  function getBboxTrack(trackId: string) {
    return bboxTracks.value.get(trackId);
  }

  // Polygon track operations
  function setPolygonTrack(trackId: string, track: any) {
    polygonTracks.value.set(trackId, track);
  }

  function deletePolygonTrack(trackId: string) {
    polygonTracks.value.delete(trackId);
  }

  function getPolygonTrack(trackId: string) {
    return polygonTracks.value.get(trackId);
  }

  // Skeleton track operations
  function setSkeletonTrack(trackId: string, track: any) {
    skeletonTracks.value.set(trackId, track);
  }

  function deleteSkeletonTrack(trackId: string) {
    skeletonTracks.value.delete(trackId);
  }

  function getSkeletonTrack(trackId: string) {
    return skeletonTracks.value.get(trackId);
  }

  // Brush track operations
  function setBrushTrack(trackId: string, track: any) {
    brushTracks.value.set(trackId, track);
  }

  function deleteBrushTrack(trackId: string) {
    brushTracks.value.delete(trackId);
  }

  function getBrushTrack(trackId: string) {
    return brushTracks.value.get(trackId);
  }

  // Set video filename (for when video changes)
  function setVideoFileName(fileName: string) {
    videoFileName.value = fileName;
  }

  // Replace all tracks (used when loading or syncing)
  function setAllTracks(data: {
    bbox: Map<string, any>;
    polygon: Map<string, any>;
    skeleton: Map<string, any>;
    brush: Map<string, any>;
  }) {
    bboxTracks.value = data.bbox;
    polygonTracks.value = data.polygon;
    skeletonTracks.value = data.skeleton;
    brushTracks.value = data.brush;
  }

  return {
    // State
    bboxTracks,
    polygonTracks,
    skeletonTracks,
    brushTracks,
    videoFileName,
    isLoading,
    isSaving,

    // Getters
    hasTracks,

    // Actions
    load,
    save,
    clearAll,
    setVideoFileName,
    setAllTracks,

    // Bbox operations
    setBboxTrack,
    deleteBboxTrack,
    getBboxTrack,

    // Polygon operations
    setPolygonTrack,
    deletePolygonTrack,
    getPolygonTrack,

    // Skeleton operations
    setSkeletonTrack,
    deleteSkeletonTrack,
    getSkeletonTrack,

    // Brush operations
    setBrushTrack,
    deleteBrushTrack,
    getBrushTrack,
  };
});
