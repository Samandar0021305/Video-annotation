<template>
  <v-group ref="groupRef">
    <template v-for="(point, pointId) in visiblePoints" :key="pointId">
      <v-rect
        :config="{
          id: pointId,
          name: 'point',
          x: point.x + imageOffset.x,
          y: point.y + imageOffset.y,
          width: 9,
          height: 9,
          offsetX: 4.5,
          offsetY: 4.5,
          fill: point.color,
          stroke: selectedPointId === pointId ? '#fff' : '#000',
          strokeWidth: selectedPointId === pointId ? 2 : 1,
          draggable: draggable,
          opacity: opacity,
        }"
        @click="handlePointClick(pointId)"
        @dragend="handleDragEnd"
        @mouseenter="handleMouseEnter(pointId)"
        @mouseleave="handleMouseLeave"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Point } from "./types";
import Konva from "konva";

const props = defineProps<{
  points: Map<string, Point>;
  currentFrame: number;
  selectedPointId: string | null;
  hoveredPointId: string | null;
  draggable: boolean;
  opacity: number;
  imageOffset: { x: number; y: number };
}>();

const emit = defineEmits<{
  (e: "point-click", pointId: string): void;
  (e: "point-dragend", event: Konva.KonvaEventObject<DragEvent>, pointId: string): void;
  (e: "point-mouseenter", pointId: string): void;
  (e: "point-mouseleave"): void;
}>();

const groupRef = ref<any>(null);

const visiblePoints = computed(() => {
  const result: Record<string, Point> = {};
  props.points.forEach((point, id) => {
    result[id] = point;
  });
  return result;
});

const handlePointClick = (pointId: string) => {
  emit("point-click", pointId);
};

const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
  const pointId = (event.target as Konva.Rect).id();
  emit("point-dragend", event, pointId);
};

const handleMouseEnter = (pointId: string) => {
  emit("point-mouseenter", pointId);
};

const handleMouseLeave = () => {
  emit("point-mouseleave");
};

const getNode = () => {
  return groupRef.value?.getNode();
};

defineExpose({
  getNode,
});
</script>
