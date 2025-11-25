import { defineStore } from 'pinia';
import type { ExtractedFrame } from '../types/video';
import {
  saveFramesToCache,
  loadFramesFromCache,
  clearFrameCache,
  hasCachedFrames,
  getCacheInfo,
} from '../utils/frameCache';

interface FramesState {
  frames: ExtractedFrame[];
  currentFrameIndex: number;
  fps: number;
  videoFileName: string;
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
  } | null;
  isLoadingFromCache: boolean;
  cacheInfo: {
    frameCount: number;
    cachedAt: Date | null;
    fps: number;
    duration: number;
  } | null;
}

export const useFramesStore = defineStore('frames', {
  state: (): FramesState => ({
    frames: [],
    currentFrameIndex: 0,
    fps: 30,
    videoFileName: '',
    videoMetadata: null,
    isLoadingFromCache: false,
    cacheInfo: null,
  }),

  getters: {
    hasFrames: (state) => state.frames.length > 0,
    totalFrames: (state) => state.frames.length,
    currentFrame: (state) => state.frames[state.currentFrameIndex] || null,
    allFrames: (state) => state.frames,
    hasCachedData: (state) => state.cacheInfo !== null && state.cacheInfo.frameCount > 0,
  },

  actions: {
    setFrames(frames: ExtractedFrame[], fps: number, metadata: any, videoFileName?: string) {
      this.frames = frames;
      this.fps = fps;
      this.videoMetadata = metadata;
      this.currentFrameIndex = 0;
      if (videoFileName) {
        this.videoFileName = videoFileName;
      }
    },

    setVideoFileName(fileName: string) {
      this.videoFileName = fileName;
    },

    clearFrames() {
      this.frames.forEach((frame) => {
        URL.revokeObjectURL(frame.imageUrl);
      });
      this.frames = [];
      this.currentFrameIndex = 0;
      this.videoMetadata = null;
    },

    setCurrentFrameIndex(index: number) {
      if (index >= 0 && index < this.frames.length) {
        this.currentFrameIndex = index;
      }
    },

    nextFrame() {
      if (this.currentFrameIndex < this.frames.length - 1) {
        this.currentFrameIndex++;
      }
    },

    previousFrame() {
      if (this.currentFrameIndex > 0) {
        this.currentFrameIndex--;
      }
    },

    getFrameByIndex(index: number): ExtractedFrame | null {
      return this.frames[index] || null;
    },

    async saveToCache(): Promise<boolean> {
      if (this.frames.length === 0 || !this.videoMetadata) {
        return false;
      }

      try {
        await saveFramesToCache(this.frames, this.fps, this.videoMetadata, this.videoFileName);
        await this.updateCacheInfo();
        return true;
      } catch (error) {
        console.error('Failed to save frames to cache:', error);
        return false;
      }
    },

    async loadFromCache(): Promise<boolean> {
      this.isLoadingFromCache = true;

      try {
        const cached = await loadFramesFromCache();

        if (!cached) {
          this.isLoadingFromCache = false;
          return false;
        }

        this.frames = cached.frames;
        this.fps = cached.fps;
        this.videoMetadata = cached.metadata;
        this.videoFileName = cached.videoFileName || '';
        this.currentFrameIndex = 0;
        this.isLoadingFromCache = false;

        return true;
      } catch (error) {
        console.error('Failed to load frames from cache:', error);
        this.isLoadingFromCache = false;
        return false;
      }
    },

    async clearCache(): Promise<void> {
      await clearFrameCache();
      this.cacheInfo = null;
    },

    async checkCache(): Promise<boolean> {
      return await hasCachedFrames();
    },

    async updateCacheInfo(): Promise<void> {
      this.cacheInfo = await getCacheInfo();
    },
  },
});
