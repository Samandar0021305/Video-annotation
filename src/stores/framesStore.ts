import { defineStore } from 'pinia';
import type { ExtractedFrame } from '../types/video';

interface FramesState {
  frames: ExtractedFrame[];
  currentFrameIndex: number;
  fps: number;
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
  } | null;
}

export const useFramesStore = defineStore('frames', {
  state: (): FramesState => ({
    frames: [],
    currentFrameIndex: 0,
    fps: 30,
    videoMetadata: null,
  }),

  getters: {
    hasFrames: (state) => state.frames.length > 0,
    totalFrames: (state) => state.frames.length,
    currentFrame: (state) => state.frames[state.currentFrameIndex] || null,
    allFrames: (state) => state.frames,
  },

  actions: {
    setFrames(frames: ExtractedFrame[], fps: number, metadata: any) {
      this.frames = frames;
      this.fps = fps;
      this.videoMetadata = metadata;
      this.currentFrameIndex = 0;
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
  },
});
