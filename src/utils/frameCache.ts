const DB_NAME = 'video-annotation-frames';
const DB_VERSION = 1;
const FRAMES_STORE = 'frames';
const METADATA_STORE = 'metadata';

interface CachedFrame {
  id: string;
  frameNumber: number;
  timestamp: number;
  blob: Blob;
}

interface CachedMetadata {
  id: string;
  fps: number;
  duration: number;
  width: number;
  height: number;
  frameCount: number;
  cachedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(FRAMES_STORE)) {
        db.createObjectStore(FRAMES_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveFramesToCache(
  frames: Array<{ id: string; imageUrl: string; frameNumber: number; timestamp: number }>,
  fps: number,
  metadata: { duration: number; width: number; height: number }
): Promise<void> {
  const db = await openDB();

  const clearTx = db.transaction([FRAMES_STORE, METADATA_STORE], 'readwrite');
  clearTx.objectStore(FRAMES_STORE).clear();
  clearTx.objectStore(METADATA_STORE).clear();

  await new Promise<void>((resolve, reject) => {
    clearTx.oncomplete = () => resolve();
    clearTx.onerror = () => reject(clearTx.error);
  });

  const blobPromises = frames.map(async (frame) => {
    const response = await fetch(frame.imageUrl);
    const blob = await response.blob();
    return {
      id: frame.id,
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      blob,
    };
  });

  const cachedFrames = await Promise.all(blobPromises);

  const tx = db.transaction([FRAMES_STORE, METADATA_STORE], 'readwrite');
  const framesStore = tx.objectStore(FRAMES_STORE);
  const metadataStore = tx.objectStore(METADATA_STORE);

  for (const frame of cachedFrames) {
    framesStore.put(frame);
  }

  const metadataEntry: CachedMetadata = {
    id: 'current',
    fps,
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    frameCount: frames.length,
    cachedAt: Date.now(),
  };

  metadataStore.put(metadataEntry);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function loadFramesFromCache(): Promise<{
  frames: Array<{ id: string; imageUrl: string; frameNumber: number; timestamp: number }>;
  fps: number;
  metadata: { duration: number; width: number; height: number };
} | null> {
  try {
    const db = await openDB();

    const metadataTx = db.transaction(METADATA_STORE, 'readonly');
    const metadataStore = metadataTx.objectStore(METADATA_STORE);
    const metadataRequest = metadataStore.get('current');

    const metadata = await new Promise<CachedMetadata | undefined>((resolve, reject) => {
      metadataRequest.onsuccess = () => resolve(metadataRequest.result);
      metadataRequest.onerror = () => reject(metadataRequest.error);
    });

    if (!metadata || metadata.frameCount === 0) {
      db.close();
      return null;
    }

    const framesTx = db.transaction(FRAMES_STORE, 'readonly');
    const framesStore = framesTx.objectStore(FRAMES_STORE);
    const framesRequest = framesStore.getAll();

    const cachedFrames = await new Promise<CachedFrame[]>((resolve, reject) => {
      framesRequest.onsuccess = () => resolve(framesRequest.result);
      framesRequest.onerror = () => reject(framesRequest.error);
    });

    db.close();

    if (cachedFrames.length === 0) {
      return null;
    }

    cachedFrames.sort((a, b) => a.frameNumber - b.frameNumber);

    const frames = cachedFrames.map((frame) => ({
      id: frame.id,
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      imageUrl: URL.createObjectURL(frame.blob),
    }));

    return {
      frames,
      fps: metadata.fps,
      metadata: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
      },
    };
  } catch (error) {
    console.error('Failed to load frames from cache:', error);
    return null;
  }
}

export async function clearFrameCache(): Promise<void> {
  try {
    const db = await openDB();

    const tx = db.transaction([FRAMES_STORE, METADATA_STORE], 'readwrite');
    tx.objectStore(FRAMES_STORE).clear();
    tx.objectStore(METADATA_STORE).clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to clear frame cache:', error);
  }
}

export async function hasCachedFrames(): Promise<boolean> {
  try {
    const db = await openDB();

    const tx = db.transaction(METADATA_STORE, 'readonly');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.get('current');

    const metadata = await new Promise<CachedMetadata | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    return metadata !== undefined && metadata.frameCount > 0;
  } catch {
    return false;
  }
}

export async function getCacheInfo(): Promise<{
  frameCount: number;
  cachedAt: Date | null;
  fps: number;
  duration: number;
} | null> {
  try {
    const db = await openDB();

    const tx = db.transaction(METADATA_STORE, 'readonly');
    const store = tx.objectStore(METADATA_STORE);
    const request = store.get('current');

    const metadata = await new Promise<CachedMetadata | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!metadata) {
      return null;
    }

    return {
      frameCount: metadata.frameCount,
      cachedAt: new Date(metadata.cachedAt),
      fps: metadata.fps,
      duration: metadata.duration,
    };
  } catch {
    return null;
  }
}
