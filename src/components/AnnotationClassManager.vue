<template>
  <div class="annotation-class-manager">
    <div class="manager-header">Annotation Classes</div>

    <div class="manager-content">
      <div class="form-section">
        <div class="form-group">
          <label>Class Name</label>
          <input
            v-model="newClassName"
            type="text"
            placeholder="Enter class name"
            class="text-input"
            @keyup.enter="addClass"
          />
        </div>

        <div class="form-group">
          <label>Color</label>
          <div class="color-picker-wrapper">
            <input
              v-model="newClassColor"
              type="color"
              class="color-picker"
            />
            <div
              class="color-preview"
              :style="{ backgroundColor: newClassColor }"
            ></div>
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

        <button class="add-btn" @click="addClass" :disabled="!newClassName.trim()">
          Add Class
        </button>
      </div>

      <div class="divider"></div>

      <div class="class-list-section">
        <div class="list-header">Classes ({{ classes.length }})</div>
        <div v-if="classes.length === 0" class="empty-state">
          No classes added yet
        </div>
        <div v-else class="class-list">
          <div
            v-for="cls in classes"
            :key="cls.id"
            class="class-item"
            :class="{ selected: selectedClassId === cls.id }"
            @click="selectClass(cls.id)"
          >
            <div class="class-color" :style="{ backgroundColor: cls.color }"></div>
            <div class="class-info">
              <span class="class-name">{{ cls.name }}</span>
              <span class="class-type">{{ cls.markupType }}</span>
            </div>
            <button class="delete-btn" @click.stop="deleteClass(cls.id)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

export type MarkupType = "bbox" | "mask" | "polygon" | "skeleton";

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
  markupType: MarkupType;
  value: number;
}

const props = defineProps<{
  modelValue?: AnnotationClass[];
  selectedClassId?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", classes: AnnotationClass[]): void;
  (e: "update:selectedClassId", id: string | null): void;
  (e: "select", cls: AnnotationClass): void;
  (e: "add", cls: AnnotationClass): void;
  (e: "delete", id: string): void;
}>();

const classes = computed({
  get: () => props.modelValue || [],
  set: (value) => emit("update:modelValue", value),
});
const newClassName = ref("");
const newClassColor = ref("#FF0000");
const newClassMarkupType = ref<MarkupType>("bbox");
const selectedClassId = ref<string | null>(props.selectedClassId || null);

const generateId = () => {
  return `class_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const getNextValue = () => {
  if (classes.value.length === 0) return 0;
  const maxValue = Math.max(...classes.value.map((c) => c.value ?? 0));
  return maxValue + 1;
};

const addClass = () => {
  if (!newClassName.value.trim()) return;

  const newClass: AnnotationClass = {
    id: generateId(),
    name: newClassName.value.trim(),
    color: newClassColor.value,
    markupType: newClassMarkupType.value,
    value: getNextValue(),
  };

  classes.value = [...classes.value, newClass];
  emit("add", newClass);

  newClassName.value = "";
  newClassColor.value = "#FF0000";
};

const deleteClass = (id: string) => {
  classes.value = classes.value.filter((c) => c.id !== id);
  emit("delete", id);

  if (selectedClassId.value === id) {
    selectedClassId.value = null;
    emit("update:selectedClassId", null);
  }
};

const selectClass = (id: string) => {
  selectedClassId.value = id;
  emit("update:selectedClassId", id);

  const cls = classes.value.find((c) => c.id === id);
  if (cls) {
    emit("select", cls);
  }
};
</script>

<style scoped>
.annotation-class-manager {
  background: #2d3748;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  min-width: 280px;
  max-width: 320px;
}

.manager-header {
  padding: 12px 16px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #4a5568;
}

.manager-content {
  padding: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
}

.text-input {
  padding: 10px 12px;
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

.text-input::placeholder {
  color: #718096;
}

.select-input {
  padding: 10px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #1a202c;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-input:focus {
  border-color: #4299e1;
}

.color-picker-wrapper {
  position: relative;
  width: 100%;
  height: 40px;
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
  transition: border-color 0.2s;
}

.color-picker-wrapper:hover .color-preview {
  border-color: #718096;
}

.add-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #4299e1;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: #3182ce;
}

.add-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: #4a5568;
  margin: 16px 0;
}

.class-list-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-header {
  color: #a0aec0;
  font-size: 12px;
  font-weight: 500;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #718096;
  font-size: 13px;
}

.class-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #1a202c;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.class-item:hover {
  background: #2d3748;
  border-color: #4a5568;
}

.class-item.selected {
  border-color: #4299e1;
  background: #2a4365;
}

.class-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  flex-shrink: 0;
}

.class-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.class-name {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-type {
  color: #718096;
  font-size: 11px;
  text-transform: uppercase;
}

.delete-btn {
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #718096;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: #e53e3e;
  color: white;
}
</style>
