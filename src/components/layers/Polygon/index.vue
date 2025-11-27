<template>
  <v-group ref="groupRef">
    <template v-for="polygon in polygons" :key="polygon.id">
      <v-line
        :config="{
          id: polygon.id,
          x: 0,
          y: 0,
          points: polygon.points.flatMap((p) => [p.x, p.y]),
          fill: polygon.color + '30',
          stroke: polygon.color,
          strokeWidth: 2,
          closed: true,
          draggable: canDrag,
          name: 'polygon',
          opacity: opacity,
        }"
        @click="onPolygonClick"
        @dragend="onPolygonDragEnd"
      />
      <v-circle
        v-for="(point, pointIdx) in polygon.points"
        :key="`${polygon.id}-pt-${pointIdx}`"
        :config="{
          x: point.x,
          y: point.y,
          radius: 6,
          fill: polygon.color,
          stroke: selectedTrackId === polygon.id ? '#fff' : polygon.color,
          strokeWidth: selectedTrackId === polygon.id ? 2 : 1,
          draggable: canDrag,
          name: 'polygonVertex',
          opacity: opacity,
        }"
        @dragmove="(e: any) => onVertexDragMove(e, polygon.id, pointIdx)"
        @dragend="(e: any) => onVertexDragEnd(e, polygon.id, pointIdx)"
        @click="() => onVertexClick(polygon.id)"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type Konva from "konva";
import type { Polygon } from "./types";

const props = defineProps<{
  polygons: Polygon[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
}>();

const emit = defineEmits<{
  (e: "click", trackId: string, event: any): void;
  (e: "drag-end", trackId: string, deltaX: number, deltaY: number, event: any): void;
  (e: "vertex-drag-move", trackId: string, pointIndex: number, x: number, y: number, event: any): void;
  (e: "vertex-drag-end", trackId: string, pointIndex: number, x: number, y: number, event: any): void;
  (e: "vertex-click", trackId: string): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

const canDrag = computed(() => props.mode === "pan");

const onPolygonClick = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  emit("click", trackId, e);
};

const onPolygonDragEnd = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  line.x(0);
  line.y(0);
  emit("drag-end", trackId, e.evt.movementX, e.evt.movementY, e);
};

const onVertexDragMove = (e: any, trackId: string, pointIdx: number) => {
  const circle = e.target;
  emit("vertex-drag-move", trackId, pointIdx, circle.x(), circle.y(), e);
};

const onVertexDragEnd = (e: any, trackId: string, pointIdx: number) => {
  const circle = e.target;
  emit("vertex-drag-end", trackId, pointIdx, circle.x(), circle.y(), e);
};

const onVertexClick = (trackId: string) => {
  emit("vertex-click", trackId);
};

defineExpose({
  groupRef,
});
</script>
