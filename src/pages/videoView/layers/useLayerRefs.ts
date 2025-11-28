import { ref } from "vue";
import type { BoundingBoxLayer } from "../../../components/layers/BoundingBox";
import type { PolygonLayer } from "../../../components/layers/Polygon";
import type { SkeletonLayer } from "../../../components/layers/Skeleton";
import type { PointLayer } from "../../../components/layers/Point";
import type { BrushAnnotationLayer } from "../../../components/layers/BrushAnnotation";
import type { BrushPreviewLayer } from "../../../components/layers/BrushPreview";

export const useLayerRefs = () => {
  const backgroundLayerRef = ref<any>(null);
  const annotationsLayerRef = ref<any>(null);
  const interactiveLayerRef = ref<any>(null);
  const annotationOffsetGroupRef = ref<any>(null);
  const bboxLayerRef = ref<InstanceType<typeof BoundingBoxLayer> | null>(null);
  const polygonLayerRef = ref<InstanceType<typeof PolygonLayer> | null>(null);
  const skeletonLayerRef = ref<InstanceType<typeof SkeletonLayer> | null>(null);
  const pointLayerRef = ref<InstanceType<typeof PointLayer> | null>(null);
  const brushAnnotationLayerRef = ref<InstanceType<typeof BrushAnnotationLayer> | null>(null);
  const brushPreviewLayerRef = ref<InstanceType<typeof BrushPreviewLayer> | null>(null);
  const cursorGroupRef = ref<any>(null);

  return {
    backgroundLayerRef,
    annotationsLayerRef,
    interactiveLayerRef,
    annotationOffsetGroupRef,
    bboxLayerRef,
    polygonLayerRef,
    skeletonLayerRef,
    pointLayerRef,
    brushAnnotationLayerRef,
    brushPreviewLayerRef,
    cursorGroupRef,
  };
};
