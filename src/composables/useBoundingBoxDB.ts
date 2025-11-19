import { ref, toRaw } from 'vue';
import type { BoundingBox, BoundingBoxTrack } from '../types/boundingBox';

const DB_NAME = 'VideoAnnotationDB';
const DB_VERSION = 7;
const TRACKS_STORE = 'brushTracksUnified';
const BBOX_STORE = 'boundingBoxTracks';
const POLYGON_STORE = 'polygonTracks';
const POLYLINE_STORE = 'polylineTracks';

interface KeyframeEntry {
  frameNumber: number;
  box: BoundingBox;
}

interface BoundingBoxRecord {
  id: string;
  trackId: string;
  videoFileName: string;
  label?: string;
  color: string;
  classId: number;
  interpolationEnabled: boolean;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  keyframesData: KeyframeEntry[];
  timestamp: number;
}

export function useBoundingBoxDB() {
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
          const brushStore = database.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          brushStore.createIndex('videoFileName', 'videoFileName', { unique: false });
          brushStore.createIndex('trackId', 'trackId', { unique: false });
        }

        if (!database.objectStoreNames.contains(BBOX_STORE)) {
          const store = database.createObjectStore(BBOX_STORE, { keyPath: 'id' });
          store.createIndex('videoFileName', 'videoFileName', { unique: false });
          store.createIndex('trackId', 'trackId', { unique: false });
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
      };
    });
  };

  const saveTrack = async (
    track: BoundingBoxTrack,
    videoFileName: string
  ): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([BBOX_STORE], 'readwrite');
      const objectStore = transaction.objectStore(BBOX_STORE);

      const rawTrack = toRaw(track);
      const rawKeyframes = toRaw(rawTrack.keyframes);

      const keyframesData: KeyframeEntry[] = [];
      for (const [frameNumber, box] of rawKeyframes.entries()) {
        keyframesData.push({
          frameNumber,
          box: JSON.parse(JSON.stringify(toRaw(box)))
        });
      }

      const record: BoundingBoxRecord = {
        id: `${videoFileName}_bbox_${rawTrack.trackId}`,
        trackId: rawTrack.trackId,
        videoFileName,
        label: rawTrack.label,
        color: rawTrack.color,
        classId: rawTrack.classId,
        interpolationEnabled: rawTrack.interpolationEnabled,
        ranges: JSON.parse(JSON.stringify(rawTrack.ranges || [])),
        hiddenAreas: JSON.parse(JSON.stringify(rawTrack.hiddenAreas || [])),
        keyframesData,
        timestamp: Date.now(),
      };

      const request = objectStore.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event: any) => {
        reject(new Error('Failed to save bounding box track: ' + event.target.error));
      };
    });
  };

  const loadTracksForVideo = async (
    videoFileName: string
  ): Promise<Map<string, BoundingBoxTrack>> => {
    const database = db.value || await openDB();
    const tracks = new Map<string, BoundingBoxTrack>();

    const records = await new Promise<BoundingBoxRecord[]>((resolve, reject) => {
      const transaction = database.transaction([BBOX_STORE], 'readonly');
      const objectStore = transaction.objectStore(BBOX_STORE);
      const index = objectStore.index('videoFileName');
      const request = index.openCursor(IDBKeyRange.only(videoFileName));
      const results: BoundingBoxRecord[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as BoundingBoxRecord);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load bounding box tracks'));
      };
    });

    for (const record of records) {
      const keyframes = new Map<number, BoundingBox>();

      if (record.keyframesData && Array.isArray(record.keyframesData)) {
        for (const entry of record.keyframesData) {
          keyframes.set(entry.frameNumber, entry.box);
        }
      }

      const track: BoundingBoxTrack = {
        trackId: record.trackId,
        keyframes,
        interpolationEnabled: record.interpolationEnabled ?? true,
        label: record.label,
        color: record.color || '#ff0000',
        classId: record.classId || 0,
        ranges: record.ranges || [],
        hiddenAreas: record.hiddenAreas || [],
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
      const transaction = database.transaction([BBOX_STORE], 'readwrite');
      const objectStore = transaction.objectStore(BBOX_STORE);
      const id = `${videoFileName}_bbox_${trackId}`;
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete bounding box track'));
      };
    });
  };

  const clearAllTracksForVideo = async (videoFileName: string): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([BBOX_STORE], 'readwrite');
      const objectStore = transaction.objectStore(BBOX_STORE);
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
        reject(new Error('Failed to clear bounding box tracks'));
      };
    });
  };

  return {
    openDB,
    saveTrack,
    loadTracksForVideo,
    deleteTrack,
    clearAllTracksForVideo,
  };
}
