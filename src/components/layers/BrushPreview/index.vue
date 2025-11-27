<template>
  <v-group ref="groupRef" :config="{ imageSmoothingEnabled: false }"></v-group>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type Konva from "konva";

defineProps<{
  stageWidth: number;
  stageHeight: number;
}>();

const emit = defineEmits<{
  (e: "preview-updated"): void;
  (e: "preview-cleared"): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

const clearPreview = () => {
  const group = groupRef.value?.getNode();
  if (group) {
    group.destroyChildren();
    emit("preview-cleared");
  }
};

const renderStrokePreview = (shape: Konva.Shape) => {
  const group = groupRef.value?.getNode();
  if (!group) return;

  group.destroyChildren();
  group.add(shape);
  emit("preview-updated");
};

const getNode = () => groupRef.value?.getNode();

defineExpose({
  getNode,
  clearPreview,
  renderStrokePreview,
});
</script>
