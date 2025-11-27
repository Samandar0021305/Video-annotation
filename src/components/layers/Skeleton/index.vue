<template>
  <v-group ref="groupRef">
    <template v-for="skeleton in skeletons" :key="skeleton.id">
      <v-line
        :ref="(el: any) => setLineRef(skeleton.id, el)"
        :config="{
          id: skeleton.id,
          x: 0,
          y: 0,
          points: skeleton.points.flatMap((p) => [p.x, p.y]),
          stroke: skeleton.color,
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
          draggable: canDrag,
          name: 'skeleton',
          opacity: opacity,
        }"
        @click="onSkeletonClick"
        @dragmove="onSkeletonDragMove"
        @dragend="onSkeletonDragEnd"
      />
      <v-circle
        v-for="(point, pointIdx) in skeleton.points"
        :key="`${skeleton.id}-kp-${pointIdx}`"
        :ref="(el: any) => setCircleRef(skeleton.id, pointIdx, el)"
        :config="{
          x: point.x,
          y: point.y,
          radius: 6,
          fill: skeleton.color,
          stroke: selectedTrackId === skeleton.id ? '#fff' : skeleton.color,
          strokeWidth: selectedTrackId === skeleton.id ? 2 : 1,
          draggable: canDrag,
          name: 'skeletonKeypoint',
          opacity: opacity,
        }"
        @dragstart="(e: any) => onKeypointDragStart(e, skeleton.id, pointIdx)"
        @dragmove="(e: any) => onKeypointDragMove(e, skeleton.id, pointIdx)"
        @dragend="(e: any) => onKeypointDragEnd(e, skeleton.id, pointIdx)"
        @click="() => onKeypointClick(skeleton.id)"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type Konva from "konva";
import type { Skeleton } from "./types";

const props = defineProps<{
  skeletons: Skeleton[];
  selectedTrackId: string | null;
  mode: string;
  opacity: number;
}>();

const emit = defineEmits<{
  (e: "click", trackId: string, event: any): void;
  (e: "drag-end", trackId: string, deltaX: number, deltaY: number, event: any): void;
  (e: "keypoint-drag-start", trackId: string, pointIndex: number, x: number, y: number, event: any): void;
  (e: "keypoint-drag-move", trackId: string, pointIndex: number, x: number, y: number, event: any): void;
  (e: "keypoint-drag-end", trackId: string, pointIndex: number, x: number, y: number, event: any): void;
  (e: "keypoint-click", trackId: string): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

// Store references to line and circle elements for real-time updates during drag
const lineRefs = new Map<string, { getNode: () => Konva.Line }>();
const circleRefs = new Map<string, { getNode: () => Konva.Circle }>();

const setLineRef = (skeletonId: string, el: any) => {
  if (el) {
    lineRefs.set(skeletonId, el);
  } else {
    lineRefs.delete(skeletonId);
  }
};

const setCircleRef = (skeletonId: string, pointIdx: number, el: any) => {
  const key = `${skeletonId}-${pointIdx}`;
  if (el) {
    circleRefs.set(key, el);
  } else {
    circleRefs.delete(key);
  }
};

const canDrag = computed(() => props.mode === "pan");

const onSkeletonClick = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  emit("click", trackId, e);
};

// Handle real-time dragging - move keypoints along with the line
const onSkeletonDragMove = (e: any) => {
  const line = e.target as Konva.Line;
  const trackId = line.id();
  const deltaX = line.x();
  const deltaY = line.y();

  // Find the skeleton to get the number of points
  const skeleton = props.skeletons.find((s) => s.id === trackId);
  if (!skeleton) return;

  // Update all keypoint positions in real-time
  skeleton.points.forEach((point, pointIdx) => {
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

const onSkeletonDragEnd = (e: any) => {
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

const onKeypointDragStart = (e: any, trackId: string, pointIdx: number) => {
  const circle = e.target;
  emit("keypoint-drag-start", trackId, pointIdx, circle.x(), circle.y(), e);
};

const onKeypointDragMove = (e: any, trackId: string, pointIdx: number) => {
  const circle = e.target;
  emit("keypoint-drag-move", trackId, pointIdx, circle.x(), circle.y(), e);
};

const onKeypointDragEnd = (e: any, trackId: string, pointIdx: number) => {
  const circle = e.target;
  emit("keypoint-drag-end", trackId, pointIdx, circle.x(), circle.y(), e);
};

const onKeypointClick = (trackId: string) => {
  emit("keypoint-click", trackId);
};

defineExpose({
  groupRef,
});
</script>
