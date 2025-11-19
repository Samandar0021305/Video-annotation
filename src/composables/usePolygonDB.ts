import { ref, toRaw } from 'vue';
import type { Polygon, PolygonTrack } from '../types/polygon';

const DB_NAME = 'VideoAnnotationDB';
const DB_VERSION = 7;
const TRACKS_STORE = 'brushTracksUnified';
const BBOX_STORE = 'boundingBoxTracks';
const POLYGON_STORE = 'polygonTracks';
const POLYLINE_STORE = 'polylineTracks';

interface KeyframeEntry {
  frameNumber: number;
  polygon: Polygon;
}

interface PolygonRecord {
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

export function usePolygonDB() {
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
      };
    });
  };

  const saveTrack = async (
    track: PolygonTrack,
    videoFileName: string
  ): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([POLYGON_STORE], 'readwrite');
      const objectStore = transaction.objectStore(POLYGON_STORE);

      const rawTrack = toRaw(track);
      const rawKeyframes = toRaw(rawTrack.keyframes);

      const keyframesData: KeyframeEntry[] = [];
      for (const [frameNumber, polygon] of rawKeyframes.entries()) {
        keyframesData.push({
          frameNumber,
          polygon: JSON.parse(JSON.stringify(toRaw(polygon)))
        });
      }

      const record: PolygonRecord = {
        id: `${videoFileName}_polygon_${rawTrack.trackId}`,
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
        reject(new Error('Failed to save polygon track: ' + event.target.error));
      };
    });
  };

  const loadTracksForVideo = async (
    videoFileName: string
  ): Promise<Map<string, PolygonTrack>> => {
    const database = db.value || await openDB();
    const tracks = new Map<string, PolygonTrack>();

    const records = await new Promise<PolygonRecord[]>((resolve, reject) => {
      const transaction = database.transaction([POLYGON_STORE], 'readonly');
      const objectStore = transaction.objectStore(POLYGON_STORE);
      const index = objectStore.index('videoFileName');
      const request = index.openCursor(IDBKeyRange.only(videoFileName));
      const results: PolygonRecord[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as PolygonRecord);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load polygon tracks'));
      };
    });

    for (const record of records) {
      const keyframes = new Map<number, Polygon>();

      if (record.keyframesData && Array.isArray(record.keyframesData)) {
        for (const entry of record.keyframesData) {
          keyframes.set(entry.frameNumber, entry.polygon);
        }
      }

      const track: PolygonTrack = {
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
      const transaction = database.transaction([POLYGON_STORE], 'readwrite');
      const objectStore = transaction.objectStore(POLYGON_STORE);
      const id = `${videoFileName}_polygon_${trackId}`;
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete polygon track'));
      };
    });
  };

  const clearAllTracksForVideo = async (videoFileName: string): Promise<void> => {
    const database = db.value || await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([POLYGON_STORE], 'readwrite');
      const objectStore = transaction.objectStore(POLYGON_STORE);
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
        reject(new Error('Failed to clear polygon tracks'));
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
