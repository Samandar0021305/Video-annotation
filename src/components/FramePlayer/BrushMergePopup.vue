<template>
  <div
    class="brush-merge-popup"
    :style="popupStyle"
    ref="popupRef"
    @mousedown.stop
    @click.stop
  >
    <div class="popup-header" @mousedown="startDrag">
      <span class="popup-icon">🖌️</span>
      <span class="popup-title">Brush Segmentation</span>
      <span class="drag-hint">⋮⋮</span>
    </div>

    <div class="popup-content">
      <div class="color-row">
        <label>Color:</label>
        <input
          type="color"
          :value="color"
          @input="
            $emit('update:color', ($event.target as HTMLInputElement).value)
          "
          class="color-input"
        />
        <span class="color-hex">{{ color }}</span>
      </div>

      <div class="stroke-info">
        <span class="stroke-count"
          >{{ strokeCount }} stroke{{
            strokeCount !== 1 ? "s" : ""
          }}
          drawn</span
        >
      </div>

      <div class="tool-buttons">
        <button
          :class="['tool-btn', { active: editMode === 'brush' }]"
          @click="$emit('set-edit-mode', 'brush')"
          title="Brush - Add to segmentation"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"
            />
          </svg>
          <span>Brush</span>
        </button>
        <button
          :class="['tool-btn', { active: editMode === 'eraser' }]"
          @click="$emit('set-edit-mode', 'eraser')"
          title="Eraser - Remove from segmentation"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 01-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z"
            />
          </svg>
          <span>Eraser</span>
        </button>
      </div>
    </div>

    <div class="popup-actions">
      <button class="btn-clear" @click="$emit('clear')">Clear All</button>
      <button class="btn-merge" @click="$emit('merge')">✓ Merge Object</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";

defineProps<{
  strokeCount: number;
  color: string;
  editMode: "brush" | "eraser";
}>();

defineEmits<{
  (e: "merge"): void;
  (e: "clear"): void;
  (e: "update:color", color: string): void;
  (e: "set-edit-mode", mode: "brush" | "eraser"): void;
}>();

const popupRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const position = ref<{ x: number; y: number } | null>(null);
const dragOffset = ref({ x: 0, y: 0 });

const popupStyle = computed(() => {
  if (position.value) {
    return {
      position: "fixed" as const,
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
      transform: "none",
    };
  }
  return {};
});

const startDrag = (e: MouseEvent) => {
  // Stop propagation to prevent parent elements (like canvas) from handling the event
  e.stopPropagation();
  e.preventDefault();

  if (!popupRef.value) return;

  isDragging.value = true;

  const rect = popupRef.value.getBoundingClientRect();
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  // Set initial position if not already set
  if (!position.value) {
    position.value = {
      x: rect.left,
      y: rect.top,
    };
  }

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  const newX = e.clientX - dragOffset.value.x;
  const newY = e.clientY - dragOffset.value.y;

  // Constrain to viewport
  const maxX = window.innerWidth - (popupRef.value?.offsetWidth || 300);
  const maxY = window.innerHeight - (popupRef.value?.offsetHeight || 200);

  position.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY)),
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
};

onUnmounted(() => {
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
});
</script>

<style scoped>
.brush-merge-popup {
  position: relative;
  background: #1a1a2e;
  border: 1px solid #4a4a6a;
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  color: #ffffff;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #4a4a6a;
  cursor: grab;
  user-select: none;
}

.popup-header:active {
  cursor: grabbing;
}

.popup-icon {
  font-size: 20px;
}

.popup-title {
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
  flex: 1;
}

.drag-hint {
  color: #6a6a8a;
  font-size: 14px;
  letter-spacing: 2px;
}

.popup-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-row label {
  font-size: 14px;
  color: #b0b0c0;
  min-width: 50px;
}

.color-input {
  width: 48px;
  height: 32px;
  border: 2px solid #4a4a6a;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: transparent;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.color-hex {
  font-size: 12px;
  color: #8080a0;
  font-family: monospace;
}

.stroke-info {
  display: flex;
  align-items: center;
}

.stroke-count {
  font-size: 14px;
  color: #a0a0b0;
  background: #2a2a4a;
  padding: 6px 12px;
  border-radius: 6px;
}

.tool-buttons {
  display: flex;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #4a4a6a;
  border-radius: 8px;
  background: transparent;
  color: #a0a0b0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  justify-content: center;
}

.tool-btn:hover {
  background: #2a2a4a;
  color: #ffffff;
  border-color: #6a6a8a;
}

.tool-btn.active {
  background: #4a90d9;
  color: #ffffff;
  border-color: #4a90d9;
}

.tool-btn svg {
  flex-shrink: 0;
}

.popup-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-clear {
  padding: 10px 16px;
  border: 1px solid #6a6a8a;
  background: transparent;
  color: #b0b0c0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #3a3a5a;
  color: #ffffff;
}

.btn-merge {
  padding: 10px 20px;
  border: none;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-merge:hover {
  background: linear-gradient(135deg, #5aa0e9, #4588cd);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
}

.btn-merge:active {
  transform: translateY(0);
}
</style>
