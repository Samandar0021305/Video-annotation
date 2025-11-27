<template>
  <v-group ref="groupRef">
    <template v-for="skeleton in skeletons" :key="skeleton.id">
      <v-line
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
        @dragend="onSkeletonDragEnd"
      />
      <v-circle
        v-for="(point, pointIdx) in skeleton.points"
        :key="`${skeleton.id}-kp-${pointIdx}`"
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

const canDrag = computed(() => props.mode === "pan");

const onSkeletonClick = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  emit("click", trackId, e);
};

const onSkeletonDragEnd = (e: any) => {
  const line = e.target;
  const trackId = line.id();
  line.x(0);
  line.y(0);
  emit("drag-end", trackId, e.evt.movementX, e.evt.movementY, e);
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
