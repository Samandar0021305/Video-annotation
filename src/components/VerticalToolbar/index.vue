<template>
  <div class="vertical-toolbar">
    <div class="toolbar-section">
      <div class="toolbar-title">Tools</div>
      <button
        :class="['tool-btn', { active: mode === 'pan' }]"
        @click="$emit('update:mode', 'pan')"
        title="Pan"
        :disabled="toolsDisabled"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"
          />
        </svg>
        <span>Pan</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'brush' }]"
        @click="$emit('update:mode', 'brush')"
        title="Brush"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"
          />
        </svg>
        <span>Brush</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'eraser' }]"
        @click="$emit('update:mode', 'eraser')"
        title="Eraser"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 01-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z"
          />
        </svg>
        <span>Eraser</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'bbox' }]"
        @click="$emit('update:mode', 'bbox')"
        title="Bounding Box"
        :disabled="toolsDisabled"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
          />
        </svg>
        <span>BBox</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'polygon' }]"
        @click="$emit('update:mode', 'polygon')"
        title="Polygon"
        :disabled="toolsDisabled"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M17.63 5.84C17.27 5.33 16.67 5 16 5H8c-.67 0-1.27.33-1.63.84L2 12l4.37 6.16c.36.51.96.84 1.63.84h8c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"
          />
        </svg>
        <span>Polygon</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'skeleton' }]"
        @click="$emit('update:mode', 'skeleton')"
        title="Skeleton"
        :disabled="toolsDisabled"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
          />
        </svg>
        <span>Skeleton</span>
      </button>
      <button
        :class="['tool-btn', { active: mode === 'point' }]"
        @click="$emit('update:mode', 'point')"
        title="Point"
        :disabled="toolsDisabled"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
          />
        </svg>
        <span>Point</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div v-if="mode === 'brush' || mode === 'eraser'" class="toolbar-section">
      <div class="toolbar-title">Size</div>
      <div class="size-control">
        <input
          type="range"
          min="5"
          max="100"
          :value="brushSize"
          @input="$emit('update:brushSize', Number(($event.target as HTMLInputElement).value))"
          class="vertical-slider"
        />
        <span class="size-value">{{ brushSize }}px</span>
      </div>
    </div>

    <!-- Color Picker (not for brush - color comes from class) -->
    <div v-if="mode === 'bbox'" class="toolbar-section">
      <div class="toolbar-title">Color</div>
      <input
        type="color"
        :value="bboxColor"
        @input="$emit('update:bboxColor', ($event.target as HTMLInputElement).value)"
        class="color-picker"
      />
    </div>
    <div v-if="mode === 'polygon'" class="toolbar-section">
      <div class="toolbar-title">Color</div>
      <input
        type="color"
        :value="polygonColor"
        @input="$emit('update:polygonColor', ($event.target as HTMLInputElement).value)"
        class="color-picker"
      />
    </div>
    <div v-if="mode === 'skeleton'" class="toolbar-section">
      <div class="toolbar-title">Color</div>
      <input
        type="color"
        :value="skeletonColor"
        @input="$emit('update:skeletonColor', ($event.target as HTMLInputElement).value)"
        class="color-picker"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- Opacity -->
    <div class="toolbar-section">
      <div class="toolbar-title">Opacity</div>
      <div class="opacity-control">
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.05"
          :value="opacity"
          @input="$emit('update:opacity', Number(($event.target as HTMLInputElement).value))"
          class="vertical-slider"
        />
        <span class="opacity-value">{{ Math.round(opacity * 100) }}%</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
export type ToolMode = "brush" | "eraser" | "pan" | "bbox" | "polygon" | "skeleton" | "point";

defineProps<{
  mode: ToolMode;
  brushSize: number;
  bboxColor: string;
  polygonColor: string;
  skeletonColor: string;
  opacity: number;
  toolsDisabled: boolean;
}>();

defineEmits<{
  (e: "update:mode", mode: ToolMode): void;
  (e: "update:brushSize", size: number): void;
  (e: "update:bboxColor", color: string): void;
  (e: "update:polygonColor", color: string): void;
  (e: "update:skeletonColor", color: string): void;
  (e: "update:opacity", opacity: number): void;
}>();
</script>

<style scoped>
.vertical-toolbar {
  display: flex;
  flex-direction: column;
  background: #2d3748;
  border-radius: 12px;
  padding: 12px;
  gap: 8px;
  min-width: 100px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toolbar-title {
  font-size: 11px;
  font-weight: 600;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.toolbar-divider {
  height: 1px;
  background: #4a5568;
  margin: 8px 0;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  font-weight: 500;
}

.tool-btn:hover {
  background: #4a5568;
  color: white;
}

.tool-btn.active {
  background: #4299e1;
  color: white;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn svg {
  flex-shrink: 0;
}

/* Size and Opacity Controls */
.size-control,
.opacity-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px;
}

.vertical-slider {
  width: 80px;
  cursor: pointer;
}

.size-value,
.opacity-value {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

/* Color Picker in Toolbar */
.color-picker {
  width: 100%;
  height: 32px;
  border: 2px solid #4a5568;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
</style>
