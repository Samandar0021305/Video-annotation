<template>
  <div
    ref="selectorRef"
    class="class-selector"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <div class="selector-header" @mousedown="startDrag">
      <span class="header-title">Select Class</span>
      <button class="close-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="selector-content">
      <div class="search-section">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Search or create class..."
          class="search-input"
          @keyup.enter="handleEnter"
        />
      </div>

      <div class="class-list">
        <div
          v-for="cls in filteredClasses"
          :key="cls.id"
          class="class-item"
          @click="selectClass(cls)"
        >
          <div class="class-color" :style="{ backgroundColor: cls.color }"></div>
          <div class="class-info">
            <span class="class-name">{{ cls.name }}</span>
            <span class="class-type">{{ cls.markupType }}</span>
          </div>
        </div>

        <div v-if="filteredClasses.length === 0 && searchQuery.trim()" class="no-results">
          <span>No class found</span>
          <button class="create-btn" @click="openCreateMode">
            Create "{{ searchQuery.trim() }}"
          </button>
        </div>

        <div v-if="filteredClasses.length === 0 && !searchQuery.trim()" class="empty-state">
          No classes available
        </div>
      </div>

      <div v-if="isCreateMode" class="create-section">
        <div class="create-header">Create New Class</div>

        <div class="form-group">
          <label>Name</label>
          <input
            v-model="newClassName"
            type="text"
            class="text-input"
            placeholder="Class name"
          />
        </div>

        <div class="form-group">
          <label>Color</label>
          <div class="color-picker-wrapper">
            <input v-model="newClassColor" type="color" class="color-picker" />
            <div class="color-preview" :style="{ backgroundColor: newClassColor }"></div>
          </div>
        </div>

        <div class="form-group">
          <label>Markup Type</label>
          <select v-model="newClassMarkupType" class="select-input">
            <option value="bbox">Bounding Box</option>
            <option value="mask">Mask</option>
            <option value="polygon">Polygon</option>
            <option value="skeleton">Skeleton</option>
          </select>
        </div>

        <div class="create-actions">
          <button class="cancel-btn" @click="cancelCreate">Cancel</button>
          <button
            class="confirm-btn"
            :disabled="!newClassName.trim()"
            @click="createAndSelect"
          >
            Create & Select
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

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
}>();

const emit = defineEmits<{
  (e: "select", cls: AnnotationClass): void;
  (e: "create", cls: Omit<AnnotationClass, "id" | "value">): void;
  (e: "close"): void;
}>();

const selectorRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");
const isCreateMode = ref(false);
const newClassName = ref("");
const newClassColor = ref("#FF0000");
const newClassMarkupType = ref<MarkupType>(props.filterMarkupType || "bbox");

const position = ref({
  x: props.initialPosition?.x ?? 100,
  y: props.initialPosition?.y ?? 100,
});

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const filteredClasses = computed(() => {
  let result = props.classes;

  if (props.filterMarkupType) {
    result = result.filter((c) => c.markupType === props.filterMarkupType);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter((c) => c.name.toLowerCase().includes(query));
  }

  return result;
});

const selectClass = (cls: AnnotationClass) => {
  emit("select", cls);
  emit("close");
};

const openCreateMode = () => {
  isCreateMode.value = true;
  newClassName.value = searchQuery.value.trim();
};

const cancelCreate = () => {
  isCreateMode.value = false;
  newClassName.value = "";
  newClassColor.value = "#FF0000";
};

const createAndSelect = () => {
  if (!newClassName.value.trim()) return;

  emit("create", {
    name: newClassName.value.trim(),
    color: newClassColor.value,
    markupType: newClassMarkupType.value,
  });

  isCreateMode.value = false;
  newClassName.value = "";
  searchQuery.value = "";
};

const handleEnter = () => {
  if (filteredClasses.value.length === 1) {
    selectClass(filteredClasses.value[0]);
  } else if (filteredClasses.value.length === 0 && searchQuery.value.trim()) {
    openCreateMode();
  }
};

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
  background: #2d3748;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 300px;
  max-width: 360px;
  overflow: hidden;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a202c;
  cursor: move;
  user-select: none;
}

.header-title {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #718096;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #4a5568;
  color: #e2e8f0;
}

.selector-content {
  padding: 12px;
}

.search-section {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #4299e1;
}

.search-input::placeholder {
  color: #718096;
}

.class-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #1a202c;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.class-item:hover {
  background: #4a5568;
}

.class-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.class-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.class-name {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
}

.class-type {
  color: #718096;
  font-size: 11px;
  text-transform: uppercase;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  color: #718096;
  font-size: 13px;
}

.create-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4299e1;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #3182ce;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #718096;
  font-size: 13px;
}

.create-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #4a5568;
}

.create-header {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-group label {
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
}

.text-input {
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: #4299e1;
}

.select-input {
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
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
  border: 1px solid #4a5568;
  pointer-events: none;
}

.create-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.cancel-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: transparent;
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #4a5568;
  color: #e2e8f0;
}

.confirm-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #48bb78;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.confirm-btn:hover:not(:disabled) {
  background: #38a169;
}

.confirm-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}
</style>
