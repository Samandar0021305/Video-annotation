<template>
  <v-group ref="groupRef"></v-group>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Konva from "konva";

const props = withDefaults(defineProps<{
  nonSelectedCanvas: HTMLCanvasElement | null;
  selectedCanvas: HTMLCanvasElement | null;
  hoveredCanvas: HTMLCanvasElement | null;
  opacity: number;
  stageWidth: number;
  stageHeight: number;
  offsetX?: number;
  offsetY?: number;
  frameNumber: number;
  renderVersion?: number;
}>(), {
  offsetX: 0,
  offsetY: 0,
});

const emit = defineEmits<{
  (e: "render-complete"): void;
}>();

const groupRef = ref<{ getNode: () => Konva.Group } | null>(null);

let displayCanvas: HTMLCanvasElement | null = null;

const extractBorder = (
  sourceCanvas: HTMLCanvasElement,
  borderWidth: number = 3
): HTMLCanvasElement => {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) return sourceCanvas;

  const srcData = srcCtx.getImageData(0, 0, w, h);

  const borderCanvas = document.createElement("canvas");
  borderCanvas.width = w;
  borderCanvas.height = h;
  const borderCtx = borderCanvas.getContext("2d")!;
  const borderData = borderCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = srcData.data[idx + 3];

      if (alpha !== undefined && alpha > 0) {
        let isEdge = false;

        for (let dy = -borderWidth; dy <= borderWidth && !isEdge; dy++) {
          for (let dx = -borderWidth; dx <= borderWidth && !isEdge; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              isEdge = true;
            } else {
              const nIdx = (ny * w + nx) * 4;
              const neighborAlpha = srcData.data[nIdx + 3];
              if (neighborAlpha === 0) {
                isEdge = true;
              }
            }
          }
        }

        if (isEdge) {
          const r = srcData.data[idx] ?? 0;
          const g = srcData.data[idx + 1] ?? 0;
          const b = srcData.data[idx + 2] ?? 0;

          borderData.data[idx] = Math.round(r * 0.6);
          borderData.data[idx + 1] = Math.round(g * 0.6);
          borderData.data[idx + 2] = Math.round(b * 0.6);
          borderData.data[idx + 3] = 255;
        }
      }
    }
  }

  borderCtx.putImageData(borderData, 0, 0);
  return borderCanvas;
};

const initDisplayCanvas = () => {
  if (!displayCanvas || displayCanvas.width !== props.stageWidth || displayCanvas.height !== props.stageHeight) {
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

  const ctx = displayCanvas!.getContext("2d", { alpha: true })!;
  ctx.clearRect(0, 0, displayCanvas!.width, displayCanvas!.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(props.nonSelectedCanvas, 0, 0);

  const nonSelectedImage = new Konva.Image({
    image: displayCanvas!,
    x: props.offsetX,
    y: props.offsetY,
    width: props.stageWidth,
    height: props.stageHeight,
    listening: false,
    opacity: props.opacity,
  });
  group.add(nonSelectedImage);

  if (props.hoveredCanvas) {
    const hoveredFillCanvas = document.createElement("canvas");
    hoveredFillCanvas.width = props.stageWidth;
    hoveredFillCanvas.height = props.stageHeight;
    const hoveredFillCtx = hoveredFillCanvas.getContext("2d", { alpha: true })!;
    hoveredFillCtx.imageSmoothingEnabled = false;
    hoveredFillCtx.drawImage(props.hoveredCanvas, 0, 0);

    const hoveredFillImage = new Konva.Image({
      image: hoveredFillCanvas,
      x: props.offsetX,
      y: props.offsetY,
      width: props.stageWidth,
      height: props.stageHeight,
      listening: false,
      opacity: props.opacity,
    });
    group.add(hoveredFillImage);

    const borderCanvas = extractBorder(props.hoveredCanvas, 3);

    const borderImage = new Konva.Image({
      image: borderCanvas,
      x: props.offsetX,
      y: props.offsetY,
      width: props.stageWidth,
      height: props.stageHeight,
      listening: false,
      opacity: 1,
    });
    group.add(borderImage);
  }

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
      x: props.offsetX,
      y: props.offsetY,
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
  const hasHovered = !!props.hoveredCanvas;
  const hasSelected = !!props.selectedCanvas;

  images.forEach((img: any, index: number) => {
    if (index === 0) {
      img.opacity(newOpacity);
    } else if (hasHovered && index === 1) {
      img.opacity(newOpacity);
    } else if (hasHovered && index === 2) {
      img.opacity(1);
    } else if (hasHovered && hasSelected && index === 3) {
      img.opacity(newOpacity * 0.5);
    } else if (!hasHovered && hasSelected && index === 1) {
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
