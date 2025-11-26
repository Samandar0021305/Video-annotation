<template>
  <div v-if="visible" class="segmentation-toolbar">
    <div class="toolbar-header">Edit Segmentation</div>

    <div class="toolbar-content">
      <button
        :class="['tool-btn', { active: editMode === 'brush' }]"
        @click="$emit('set-mode', 'brush')"
        title="Brush - Add to segmentation"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"/>
        </svg>
        <span>Brush</span>
      </button>

      <button
        :class="['tool-btn', { active: editMode === 'eraser' }]"
        @click="$emit('set-mode', 'eraser')"
        title="Eraser - Remove from segmentation"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 01-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z"/>
        </svg>
        <span>Eraser</span>
      </button>

      <div class="divider"></div>

      <div class="color-section">
        <span class="color-label">Color</span>
        <div class="color-picker-wrapper">
          <input
            type="color"
            :value="color"
            @input="$emit('change-color', ($event.target as HTMLInputElement).value)"
            class="color-picker"
            title="Change segmentation color"
          />
          <div class="color-preview" :style="{ backgroundColor: color }"></div>
        </div>
      </div>

      <div class="divider"></div>

      <button
        class="tool-btn done-btn"
        @click="$emit('deselect')"
        title="Done editing"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <span>Done</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  position: { x: number; y: number };
  editMode: "none" | "brush" | "eraser";
  color: string;
  stageOffset?: { x: number; y: number };
  stageScale?: number;
}>();

defineEmits<{
  (e: "set-mode", mode: "brush" | "eraser"): void;
  (e: "change-color", color: string): void;
  (e: "deselect"): void;
}>();
</script>

<style scoped>
.segmentation-toolbar {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: auto;
  background: #2d3748;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  min-width: 140px;
}

.toolbar-header {
  padding: 12px 16px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #4a5568;
}

.toolbar-content {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
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

.tool-btn.done-btn {
  background: #48bb78;
  color: white;
  margin-top: 4px;
}

.tool-btn.done-btn:hover {
  background: #38a169;
}

.tool-btn svg {
  flex-shrink: 0;
}

.tool-btn span {
  flex: 1;
  text-align: left;
}

.divider {
  height: 1px;
  background: #4a5568;
  margin: 4px 0;
}

.color-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
}

.color-label {
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
}

.color-picker-wrapper {
  position: relative;
  width: 36px;
  height: 36px;
}

.color-picker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-preview {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 2px solid #4a5568;
  pointer-events: none;
  transition: border-color 0.2s;
}

.color-picker-wrapper:hover .color-preview {
  border-color: #718096;
}
</style>
