<template>
  <div class="playback-controls">
    <button @click="$emit('previous-frame')" class="playback-btn">
      ⏮ Previous
    </button>
    <button @click="$emit('toggle-play')" class="playback-btn play-btn">
      {{ isPlaying ? "⏸ Pause" : "▶ Play" }}
    </button>
    <button @click="$emit('next-frame')" class="playback-btn">Next ⏭</button>
    <span class="frame-info">
      Frame: {{ currentFrame + 1 }} / {{ totalFrames }}
    </span>

    <div class="playback-divider"></div>

    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <span class="zoom-label">{{ Math.round(zoomLevel * 100) }}%</span>
      <button @click="$emit('zoom-in')" class="utility-btn" title="Zoom In">
        +
      </button>
      <button @click="$emit('zoom-out')" class="utility-btn" title="Zoom Out">
        -
      </button>
      <button
        @click="$emit('reset-zoom')"
        class="utility-btn"
        title="Reset Zoom"
      >
        Reset
      </button>
    </div>

    <div class="playback-divider"></div>

    <!-- Utility Controls -->
    <button
      @click="$emit('clear-cache')"
      class="utility-btn clear-cache-btn"
      :disabled="isClearingCache"
      title="Clear Cache"
    >
      {{ isClearingCache ? "Clearing..." : "Clear Cache" }}
    </button>

    <label class="auto-suggest-toggle" title="Auto Suggest">
      <input
        type="checkbox"
        :checked="autoSuggest"
        @change="$emit('update:autoSuggest', ($event.target as HTMLInputElement).checked)"
      />
      <span>Auto {{ autoSuggest ? "ON" : "OFF" }}</span>
    </label>
  </div>

  <!-- Timeline Scrubber -->
  <div class="timeline-scrubber-container">
    <input
      type="range"
      class="timeline-scrubber"
      :min="0"
      :max="totalFrames - 1"
      :value="currentFrame"
      @input="handleScrubberInput"
    />
  </div>
</template>

<script setup lang="ts">
import type { PlaybackControlsProps, PlaybackControlsEmits } from "./types";

defineProps<PlaybackControlsProps>();

const emit = defineEmits<PlaybackControlsEmits>();

const handleScrubberInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("scrub", parseInt(target.value, 10));
};
</script>

<style scoped>
.playback-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #2d3748;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-wrap: wrap;
}

.playback-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  background: #4a5568;
  color: white;
}

.playback-btn:hover {
  background: #5a6778;
  transform: translateY(-1px);
}

.playback-btn:active {
  transform: translateY(0);
}

.playback-btn.play-btn {
  background: #48bb78;
  padding: 10px 30px;
}

.playback-btn.play-btn:hover {
  background: #38a169;
}

.frame-info {
  color: #a0aec0;
  font-size: 14px;
  font-weight: 500;
  padding: 0 10px;
  min-width: 140px;
  text-align: center;
}

.playback-divider {
  width: 1px;
  height: 24px;
  background: #4a5568;
}

/* Zoom Controls */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.zoom-label {
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
  min-width: 45px;
  text-align: right;
}

.utility-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  background: #4a5568;
  color: white;
}

.utility-btn:hover {
  background: #5a6778;
}

.utility-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.utility-btn.clear-cache-btn {
  background: #6b7280;
}

.utility-btn.clear-cache-btn:hover:not(:disabled) {
  background: #4b5563;
}

/* Auto Suggest Toggle */
.auto-suggest-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  background: #4a5568;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #a0aec0;
  transition: all 0.2s;
}

.auto-suggest-toggle:hover {
  background: #5a6778;
}

.auto-suggest-toggle input {
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.auto-suggest-toggle input:checked + span {
  color: #48bb78;
}

/* Timeline Scrubber */
.timeline-scrubber-container {
  padding: 8px 16px;
  background: #1a1a2e;
  border-radius: 8px;
}

.timeline-scrubber {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: #4a5568;
  border-radius: 4px;
  cursor: pointer;
}

.timeline-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #4299e1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.timeline-scrubber::-webkit-slider-thumb:hover {
  background: #3182ce;
  transform: scale(1.1);
}

.timeline-scrubber::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #4299e1;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
