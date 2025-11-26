<template>
  <div class="brush-merge-popup" :style="popupStyle">
    <div class="popup-header">
      <span class="popup-icon">🖌️</span>
      <span class="popup-title">Brush Segmentation</span>
    </div>

    <div class="popup-content">
      <div class="color-row">
        <label>Color:</label>
        <input
          type="color"
          :value="color"
          @input="$emit('update:color', ($event.target as HTMLInputElement).value)"
          class="color-input"
        />
        <span class="color-hex">{{ color }}</span>
      </div>

      <div class="stroke-info">
        <span class="stroke-count">{{ strokeCount }} stroke{{ strokeCount !== 1 ? 's' : '' }} drawn</span>
      </div>
    </div>

    <div class="popup-actions">
      <button class="btn-clear" @click="$emit('clear')">
        Clear All
      </button>
      <button class="btn-merge" @click="$emit('merge')">
        ✓ Merge Object
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  strokeCount: number;
  color: string;
  position?: { x: number; y: number };
}>();

defineEmits<{
  (e: 'merge'): void;
  (e: 'clear'): void;
  (e: 'update:color', color: string): void;
}>();

const popupStyle = computed(() => {
  if (props.position) {
    return {
      position: 'absolute' as const,
      left: `${props.position.x}px`,
      top: `${props.position.y}px`,
      transform: 'translateX(-50%)'
    };
  }
  return {
    position: 'absolute' as const,
    left: '50%',
    top: '10px',
    transform: 'translateX(-50%)'
  };
});
</script>

<style scoped>
.brush-merge-popup {
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
}

.popup-icon {
  font-size: 20px;
}

.popup-title {
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
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
