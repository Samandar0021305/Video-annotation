<template>
  <v-group ref="groupRef">
    <v-group
      v-for="bbox in bboxes"
      :key="bbox.id"
      :config="{
        id: bbox.id,
        x: bbox.x,
        y: bbox.y,
        rotation: bbox.rotation,
        draggable: canDrag,
        name: 'boundingBox',
        opacity: opacity,
      }"
      @click="onBboxClick"
      @dragend="onBboxDragEnd"
      @transformend="onBboxTransformEnd"
    >
      <v-rect
        :config="{
          width: bbox.width,
          height: bbox.height,
          stroke: bbox.color,
          strokeWidth: 2,
          fill: bbox.color + '20',
        }"
      />
      <v-label
        :config="{
          x: 0,
          y: 0,
        }"
      >
        <v-tag
          :config="{
            fill: bbox.color,
            pointerDirection: 'none',
            cornerRadius: 2,
          }"
        />
        <v-text
          :config="{
            text: getLabel(bbox),
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#ffffff',
            padding: 4,
          }"
        />
      </v-label>
    </v-group>
  </v-group>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type Konva from "konva";
import type { BoundingBox } from "./types";

interface AnnotationClass {
  id: string;
  name: string;
  color: string;
  value: number;
}

const props = defineProps<{
  bboxes: BoundingBox[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
  classes: AnnotationClass[];
}>();

const emit = defineEmits<{
  (e: "click", trackId: string, event: any): void;
  (e: "drag-end", trackId: string, x: number, y: number, event: any): void;
  (e: "transform-end"): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

const canDrag = computed(() => props.mode === "pan");

const getLabel = (bbox: BoundingBox): string => {
  if (bbox.value === undefined) return "";
  const cls = props.classes.find((c) => c.value === bbox.value);
  return cls?.name ?? "";
};

const onBboxClick = (e: any) => {
  const group = e.target.findAncestor("Group");
  if (!group) return;
  const trackId = group.id();
  emit("click", trackId, e);
};

const onBboxDragEnd = (e: any) => {
  const group = e.target;
  const trackId = group.id();
  emit("drag-end", trackId, group.x(), group.y(), e);
};

const onBboxTransformEnd = () => {
  emit("transform-end");
};

defineExpose({
  groupRef,
});
</script>
