import { ref, toRaw } from 'vue';
import type { SegmentationContour } from '../types/contours';
import type { BrushTrack } from './useBrushTracks';

const DB_NAME = 'VideoAnnotationDB';
const DB_VERSION = 8;
const TRACKS_STORE = 'brushTracksUnified';
const BBOX_STORE = 'boundingBoxTracks';
const POLYGON_STORE = 'polygonTracks';
const POLYLINE_STORE = 'polylineTracks';
const SKELETON_STORE = 'skeletonTracks';

interface KeyframeEntry {
  frameNumber: number;
  contours: SegmentationContour[];
}

interface UnifiedTrackRecord {
  id: string;
  trackId: string;
  videoFileName: string;
  label?: string;
  interpolationEnabled: boolean;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolateAlgorithm: string;
  keyframesData: KeyframeEntry[];
  timestamp: number;
}

export function useBrushTracksDB() {
  const db = ref<IDBDatabase | null>(null);

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        db.value = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (!database.objectStoreNames.contains(TRACKS_STORE)) {
          const store = database.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          store.createIndex('videoFileName', 'videoFileName', { unique: false });
          store.createIndex('trackId', 'trackId', { unique: false });
        }

        if (!database.objectStoreNames.contains(BBOX_STORE)) {
          const bboxStore = database.createObjectStore(BBOX_STORE, { keyPath: 'id' });
          bboxStore.createIndex('videoFileName', 'videoFileName', { unique: false });
          bboxStore.createIndex('trackId', 'trackId', { unique: false });
        }

        if (!database.objectStoreNames.contains(POLYGON_STORE)) {
          const polygonStore = database.createObjectStore(POLYGON_STORE, { keyPath: 'id' });
          polygonStore.createIndex('videoFileName', 'videoFileName', { unique: false });
          polygonStore.createIndex('trackId', 'trackId', { unique: false });
        }

        if (!database.objectStoreNames.contains(POLYLINE_STORE)) {
          const polylineStore = database.createObjectStore(POLYLINE_STORE, { keyPath: 'id' });
          polylineStore.createIndex('videoFileName', 'videoFileName', { unique: false });
          polylineStore.createIndex('trackId', 'trackId', { unique: false });
        }

        if (!database.objectStoreNames.contains(SKELETON_STORE)) {
          const skeletonStore = database.createObjectStore(SKELETON_STORE, { keyPath: 'id' });
          skeletonStore.createIndex('videoFileName', 'videoFileName', { unique: false });
          skeletonStore.createIndex('trackId', 'trackId', { unique: false });
        }
      };
    });
  };

  const saveTrack = async (
    track: BrushTrack,
    videoFileName: string
  ): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE], 'readwrite');
      const objectStore = transaction.objectStore(TRACKS_STORE);

      const rawTrack = toRaw(track);
      const rawKeyframes = toRaw(rawTrack.keyframes);

      const keyframesData: KeyframeEntry[] = [];
      for (const [frameNumber, contours] of rawKeyframes.entries()) {
        keyframesData.push({
          frameNumber,
          contours: JSON.parse(JSON.stringify(toRaw(contours)))
        });
      }

      const record: UnifiedTrackRecord = {
        id: `${videoFileName}_track_${rawTrack.trackId}`,
        trackId: rawTrack.trackId,
        videoFileName,
        label: rawTrack.label,
        interpolationEnabled: rawTrack.interpolationEnabled,
        ranges: JSON.parse(JSON.stringify(rawTrack.ranges || [])),
        hiddenAreas: JSON.parse(JSON.stringify(rawTrack.hiddenAreas || [])),
        interpolateAlgorithm: rawTrack.interpolateAlgorithm,
        keyframesData,
        timestamp: Date.now(),
      };

      const request = objectStore.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event: any) => {
        reject(new Error('Failed to save track: ' + event.target.error));
      };
    });
  };

  const saveKeyframe = async (
    trackId: string,
    frameNumber: number,
    contours: SegmentationContour[],
    videoFileName: string
  ): Promise<void> => {
    await openDB();
    const tracks = await loadTracksForVideo(videoFileName);
    const track = tracks.get(trackId);

    if (track) {
      track.keyframes.set(frameNumber, contours);
      await saveTrack(track, videoFileName);
    }
  };

  const saveTrackWithKeyframes = async (
    track: BrushTrack,
    videoFileName: string
  ): Promise<void> => {
    await saveTrack(track, videoFileName);
  };

  const loadTracksForVideo = async (
    videoFileName: string
  ): Promise<Map<string, BrushTrack>> => {
    const database = db.value || await openDB();
    const tracks = new Map<string, BrushTrack>();

    const records = await new Promise<UnifiedTrackRecord[]>((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE], 'readonly');
      const objectStore = transaction.objectStore(TRACKS_STORE);
      const index = objectStore.index('videoFileName');
      const request = index.openCursor(IDBKeyRange.only(videoFileName));
      const results: UnifiedTrackRecord[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as UnifiedTrackRecord);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load tracks'));
      };
    });

    for (const record of records) {
      const keyframes = new Map<number, SegmentationContour[]>();

      if (record.keyframesData && Array.isArray(record.keyframesData)) {
        for (const entry of record.keyframesData) {
          keyframes.set(entry.frameNumber, entry.contours);
        }
      }

      const track: BrushTrack = {
        trackId: record.trackId,
        keyframes,
        interpolationEnabled: record.interpolationEnabled ?? true,
        label: record.label,
        ranges: record.ranges || [],
        hiddenAreas: record.hiddenAreas || [],
        interpolateAlgorithm: record.interpolateAlgorithm || 'contour-morph-1.0',
      };

      tracks.set(record.trackId, track);
    }

    return tracks;
  };

  const deleteTrack = async (
    trackId: string,
    videoFileName: string
  ): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE], 'readwrite');
      const objectStore = transaction.objectStore(TRACKS_STORE);
      const id = `${videoFileName}_track_${trackId}`;
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete track'));
      };
    });
  };

  const clearAllTracksForVideo = async (videoFileName: string): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([TRACKS_STORE], 'readwrite');
      const objectStore = transaction.objectStore(TRACKS_STORE);
      const index = objectStore.index('videoFileName');
      const request = index.openCursor(IDBKeyRange.only(videoFileName));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to clear tracks'));
      };
    });
  };

  return {
    openDB,
    saveTrack,
    saveKeyframe,
    saveTrackWithKeyframes,
    loadTracksForVideo,
    deleteTrack,
    clearAllTracksForVideo,
  };
}
