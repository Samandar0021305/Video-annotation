import { ref } from "vue";
import type { BoundingBoxLayer } from "../../../components/layers/BoundingBox";
import type { PolygonLayer } from "../../../components/layers/Polygon";
import type { SkeletonLayer } from "../../../components/layers/Skeleton";

export const useLayerRefs = () => {
  const backgroundLayerRef = ref<any>(null);
  const annotationsLayerRef = ref<any>(null);
  const interactiveLayerRef = ref<any>(null);
  const brushAnnotationGroupRef = ref<any>(null);
  const bboxLayerRef = ref<InstanceType<typeof BoundingBoxLayer> | null>(null);
  const polygonLayerRef = ref<InstanceType<typeof PolygonLayer> | null>(null);
  const skeletonLayerRef = ref<InstanceType<typeof SkeletonLayer> | null>(null);
  const brushPreviewGroupRef = ref<any>(null);
  const cursorGroupRef = ref<any>(null);

  return {
    backgroundLayerRef,
    annotationsLayerRef,
    interactiveLayerRef,
    brushAnnotationGroupRef,
    bboxLayerRef,
    polygonLayerRef,
    skeletonLayerRef,
    brushPreviewGroupRef,
    cursorGroupRef,
  };
};
