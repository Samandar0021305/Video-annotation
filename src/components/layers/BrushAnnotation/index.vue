<template>
  <v-group ref="groupRef"></v-group>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Konva from "konva";

const props = defineProps<{
  nonSelectedCanvas: HTMLCanvasElement | null;
  selectedCanvas: HTMLCanvasElement | null;
  hoveredCanvas: HTMLCanvasElement | null;
  opacity: number;
  stageWidth: number;
  stageHeight: number;
  frameNumber: number;
  renderVersion?: number;
}>();

const emit = defineEmits<{
  (e: "render-complete"): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

let displayCanvas: HTMLCanvasElement | null = null;

const initDisplayCanvas = () => {
  if (!displayCanvas) {
    displayCanvas = document.createElement("canvas");
    displayCanvas.width = props.stageWidth;
    displayCanvas.height = props.stageHeight;
  }
};

const clearGroup = () => {
  const group = groupRef.value?.getNode();
  if (group) {
    group.destroyChildren();
  }
};

const renderDisplay = () => {
  const group = groupRef.value?.getNode();
  if (!group) return;

  clearGroup();

  if (!props.nonSelectedCanvas) {
    emit("render-complete");
    return;
  }

  initDisplayCanvas();

  // Render non-selected/non-hovered tracks at normal opacity
  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(props.nonSelectedCanvas, 0, 0);

  const nonSelectedImage = new Konva.Image({
    image: displayCanvas!,
    x: 0,
    y: 0,
    width: props.stageWidth,
    height: props.stageHeight,
    listening: false,
    opacity: props.opacity,
  });
  group.add(nonSelectedImage);

  // Render hovered track with brightness boost effect
  if (props.hoveredCanvas) {
    const hoveredDisplayCanvas = document.createElement("canvas");
    hoveredDisplayCanvas.width = props.stageWidth;
    hoveredDisplayCanvas.height = props.stageHeight;
    const hoveredCtx = hoveredDisplayCanvas.getContext("2d", { alpha: true })!;
    hoveredCtx.imageSmoothingEnabled = false;
    hoveredCtx.drawImage(props.hoveredCanvas, 0, 0);

    const hoveredImage = new Konva.Image({
      image: hoveredDisplayCanvas,
      x: 0,
      y: 0,
      width: props.stageWidth,
      height: props.stageHeight,
      listening: false,
      opacity: Math.min(1, props.opacity * 1.3), // Slightly brighter on hover
    });
    group.add(hoveredImage);

    // Add a subtle white outline/glow effect for hover
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = props.stageWidth;
    glowCanvas.height = props.stageHeight;
    const glowCtx = glowCanvas.getContext("2d", { alpha: true })!;
    glowCtx.imageSmoothingEnabled = false;

    // Create outline by drawing the mask slightly expanded with white
    glowCtx.filter = "blur(2px)";
    glowCtx.drawImage(props.hoveredCanvas, 0, 0);
    glowCtx.globalCompositeOperation = "source-in";
    glowCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    glowCtx.fillRect(0, 0, glowCanvas.width, glowCanvas.height);

    const glowImage = new Konva.Image({
      image: glowCanvas,
      x: 0,
      y: 0,
      width: props.stageWidth,
      height: props.stageHeight,
      listening: false,
      opacity: 0.4,
    });
    group.add(glowImage);
  }

  // Render selected track with reduced opacity (50% of normal)
  if (props.selectedCanvas) {
    const selectedDisplayCanvas = document.createElement("canvas");
    selectedDisplayCanvas.width = props.stageWidth;
    selectedDisplayCanvas.height = props.stageHeight;
    const selectedCtx = selectedDisplayCanvas.getContext("2d", {
      alpha: true,
    })!;
    selectedCtx.imageSmoothingEnabled = false;
    selectedCtx.drawImage(props.selectedCanvas, 0, 0);

    const selectedImage = new Konva.Image({
      image: selectedDisplayCanvas,
      x: 0,
      y: 0,
      width: props.stageWidth,
      height: props.stageHeight,
      listening: false,
      opacity: props.opacity * 0.5,
    });
    group.add(selectedImage);
  }

  emit("render-complete");
};

const updateOpacity = (newOpacity: number) => {
  const group = groupRef.value?.getNode();
  if (!group) return;

  const images = group.getChildren();
  images.forEach((img: any, index: number) => {
    if (index === 0) {
      // Non-selected image
      img.opacity(newOpacity);
    } else if (props.hoveredCanvas && index === 1) {
      // Hovered image
      img.opacity(Math.min(1, newOpacity * 1.3));
    } else if (props.hoveredCanvas && index === 2) {
      // Glow image
      img.opacity(0.4);
    } else {
      // Selected image
      img.opacity(newOpacity * 0.5);
    }
  });
};

const getNode = () => groupRef.value?.getNode();

// Watch for changes to trigger re-render
// renderVersion is used to force re-render when canvas content changes (same reference but new content)
watch(
  () => [props.frameNumber, props.renderVersion],
  () => {
    renderDisplay();
  },
  { immediate: true }
);

// Watch opacity changes separately for performance
watch(
  () => props.opacity,
  (newOpacity) => {
    updateOpacity(newOpacity);
  }
);

defineExpose({
  getNode,
  clearGroup,
  renderDisplay,
  updateOpacity,
});
</script>
