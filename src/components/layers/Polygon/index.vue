<template>
  <v-group ref="groupRef">
    <template v-for="polygon in polygons" :key="polygon.id">
      <v-line
        :ref="(el: any) => setLineRef(polygon.id, el)"
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
        @dragmove="onPolygonDragMove"
        @dragend="onPolygonDragEnd"
      />
      <v-circle
        v-for="(point, pointIdx) in polygon.points"
        :key="`${polygon.id}-pt-${pointIdx}`"
        :ref="(el: any) => setCircleRef(polygon.id, pointIdx, el)"
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

// Store references to line and circle elements for real-time updates during drag
const lineRefs = new Map<string, { getNode: () => Konva.Line }>();
const circleRefs = new Map<string, { getNode: () => Konva.Circle }>();

const setLineRef = (polygonId: string, el: any) => {
  if (el) {
    lineRefs.set(polygonId, el);
  } else {
    lineRefs.delete(polygonId);
  }
};

const setCircleRef = (polygonId: string, pointIdx: number, el: any) => {
  const key = `${polygonId}-${pointIdx}`;
  if (el) {
    circleRefs.set(key, el);
  } else {
    circleRefs.delete(key);
  }
};

const canDrag = computed(() => props.mode === "pan");

const onPolygonClick = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  emit("click", trackId, e);
};

// Handle real-time dragging - move circles along with the line
const onPolygonDragMove = (e: any) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();
  const deltaX = line.x();
  const deltaY = line.y();

  // Find the polygon to get the number of points
  const polygon = props.polygons.find((p) => p.id === trackId);
  if (!polygon) return;

  // Update all circle positions in real-time
  polygon.points.forEach((point, pointIdx) => {
    const circleRef = circleRefs.get(`${trackId}-${pointIdx}`);
    if (circleRef) {
      const circle = circleRef.getNode();
      if (circle) {
        circle.x(point.x + deltaX);
        circle.y(point.y + deltaY);
      }
    }
  });
};

const onPolygonDragEnd = (e: any) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();

  // Get the total drag distance BEFORE resetting
  const deltaX = line.x();
  const deltaY = line.y();

  // Reset line position
  line.x(0);
  line.y(0);

  // Emit the correct delta values
  emit("drag-end", trackId, deltaX, deltaY, e);
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
