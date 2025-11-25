<template>
  <div class="frame-card">
    <div class="frame-image-container">
      <img :src="frame.imageUrl" :alt="`Frame ${frame.frameNumber}`" />
    </div>
    <div class="frame-info">
      <span class="frame-number">Frame {{ frame.frameNumber }}</span>
      <span class="frame-time">{{ formatTime(frame.timestamp) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExtractedFrame } from '../../types/video';

defineProps<{
  frame: ExtractedFrame;
}>();

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};
</script>

<style scoped>
.frame-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.frame-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.frame-image-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;
}

.frame-image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.frame-info {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.frame-number {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.frame-time {
  font-size: 12px;
  color: #666;
  font-family: 'Courier New', monospace;
}
</style>
