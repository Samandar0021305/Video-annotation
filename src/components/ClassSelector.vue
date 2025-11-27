<template>
  <div
    ref="selectorRef"
    class="class-selector"
    :style="{ left: position.x + 150 + 'px', top: position.y + 'px' }"
  >
    <div class="selector-header" @mousedown="startDrag">
      <span class="header-title">Annotate selector</span>
      <button class="close-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <div class="selector-content">
      <div class="input-row">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Enter class name..."
          class="search-input"
          @keyup.enter="handleEnter"
        />
      </div>

      <div class="action-row">
        <button
          class="action-btn delete-btn"
          title="Delete"
          :disabled="!searchQuery.trim()"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
        <button
          class="action-btn"
          title="Move up"
          :disabled="!searchQuery.trim()"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7 14l5-5 5 5z" />
          </svg>
        </button>
        <button
          class="action-btn"
          title="Move down"
          :disabled="!searchQuery.trim()"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        <button
          class="save-btn"
          :disabled="!searchQuery.trim()"
          @click="handleSave"
        >
          Save
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
          </svg>
        </button>
      </div>

      <div class="class-list">
        <div
          v-for="(cls, index) in filteredClasses"
          :key="cls.id"
          class="class-item"
          :class="{ selected: selectedClass?.id === cls.id }"
          @click="selectClass(cls)"
        >
          <div
            class="class-color"
            :style="{ backgroundColor: cls.color }"
          ></div>
          <span class="class-index">{{ index + 1 }}.</span>
          <span class="class-name">{{ cls.name }}</span>
        </div>

        <div
          v-if="filteredClasses.length === 0 && !searchQuery.trim()"
          class="empty-state"
        >
          No classes available. Type a name to create one.
        </div>
      </div>

      <div v-if="showColorPicker" class="color-section">
        <label>Color</label>
        <div class="color-picker-wrapper">
          <input v-model="newClassColor" type="color" class="color-picker" />
          <div
            class="color-preview"
            :style="{ backgroundColor: newClassColor }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";

export type MarkupType = "bbox" | "mask" | "polygon" | "skeleton";

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
  markupType: MarkupType;
  value: number;
}

const props = defineProps<{
  classes: AnnotationClass[];
  initialPosition?: { x: number; y: number };
  filterMarkupType?: MarkupType;
  initialClass?: AnnotationClass | null;
}>();

const emit = defineEmits<{
  (e: "select", cls: AnnotationClass): void;
  (e: "create", cls: Omit<AnnotationClass, "id" | "value">): void;
  (e: "close"): void;
}>();

const selectorRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref(props.initialClass?.name ?? "");
const newClassColor = ref(props.initialClass?.color ?? "#9ACD32");
const selectedClass = ref<AnnotationClass | null>(props.initialClass ?? null);

const position = ref({
  x: props.initialPosition?.x ?? 100,
  y: props.initialPosition?.y ?? 100,
});

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// Watch for initialClass changes to update internal state (for v-show usage)
watch(
  () => props.initialClass,
  (newClass) => {
    searchQuery.value = newClass?.name ?? "";
    newClassColor.value = newClass?.color ?? "#9ACD32";
    selectedClass.value = newClass ?? null;
    // Focus input when class changes
    nextTick(() => {
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    });
  }
);

// Update position when initialPosition changes
watch(
  () => props.initialPosition,
  (newPos) => {
    if (newPos) {
      position.value = { x: newPos.x, y: newPos.y };
    }
  },
  { immediate: true }
);

const filteredClasses = computed(() => {
  let result = props.classes;

  if (props.filterMarkupType) {
    result = result.filter((c) => c.markupType === props.filterMarkupType);
  }

  return result;
});

const showColorPicker = computed(() => {
  if (!searchQuery.value.trim()) return false;
  const exactMatch = filteredClasses.value.find(
    (c) => c.name.toLowerCase() === searchQuery.value.toLowerCase().trim()
  );
  return !exactMatch;
});

const selectClass = (cls: AnnotationClass) => {
  selectedClass.value = cls;
  searchQuery.value = cls.name;
  emit("select", cls);
  emit("close");
};

const handleSave = () => {
  if (!searchQuery.value.trim()) return;

  const exactMatch = filteredClasses.value.find(
    (c) => c.name.toLowerCase() === searchQuery.value.toLowerCase().trim()
  );

  if (exactMatch) {
    selectClass(exactMatch);
  } else {
    emit("create", {
      name: searchQuery.value.trim(),
      color: newClassColor.value,
      markupType: props.filterMarkupType || "bbox",
    });
  }
};

const handleEnter = () => {
  handleSave();
};

watch(searchQuery, (newValue) => {
  if (newValue.trim()) {
    const exactMatch = filteredClasses.value.find(
      (c) => c.name.toLowerCase() === newValue.toLowerCase().trim()
    );
    selectedClass.value = exactMatch || null;
  } else {
    selectedClass.value = null;
  }
});

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  position.value = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y,
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
};

onMounted(() => {
  searchInputRef.value?.focus();
});

onUnmounted(() => {
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
});
</script>

<style scoped>
.class-selector {
  position: fixed;
  z-index: 2000;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 340px;
  overflow: hidden;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  cursor: move;
  user-select: none;
}

.header-title {
  color: #212529;
  font-size: 14px;
  font-weight: 500;
}

.close-btn {
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e9ecef;
  color: #212529;
}

.selector-content {
  padding: 12px;
}

.input-row {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #ffc107;
  border-radius: 6px;
  background: #fffef5;
  color: #212529;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #ffb300;
}

.search-input::placeholder {
  color: #adb5bd;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.action-btn {
  padding: 6px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #ffffff;
  color: #6c757d;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #f8f9fa;
  color: #212529;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.delete-btn {
  color: #dc3545;
  border-color: #dc3545;
  background: #fff5f5;
}

.action-btn.delete-btn:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

.save-btn {
  margin-left: auto;
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background: #28a745;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

.class-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.class-item:hover {
  background: #f8f9fa;
}

.class-item.selected {
  background: #e7f5ff;
}

.class-color {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.class-index {
  color: #6c757d;
  font-size: 13px;
  min-width: 20px;
}

.class-name {
  color: #212529;
  font-size: 13px;
  flex: 1;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #6c757d;
  font-size: 13px;
}

.color-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.color-section label {
  display: block;
  color: #6c757d;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.color-picker-wrapper {
  position: relative;
  width: 100%;
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
  border: 1px solid #dee2e6;
  pointer-events: none;
}
</style>
