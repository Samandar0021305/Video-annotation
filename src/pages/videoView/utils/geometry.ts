import type { Skeleton } from "../../../types/skeleton";
import type { ColocatedPoint } from "../types";
import { SKELETON_SNAP_THRESHOLD, COLOCATED_EPSILON } from "../enums";

export const findColocatedPoints = (
  pos: { x: number; y: number },
  primarySkeletonId: string,
  primaryPointIdx: number,
  skeletons: Skeleton[]
): ColocatedPoint[] => {
  const result: ColocatedPoint[] = [];

  for (const skeleton of skeletons) {
    for (let i = 0; i < skeleton.points.length; i++) {
      if (skeleton.id === primarySkeletonId && i === primaryPointIdx) {
        continue;
      }

      const point = skeleton.points[i];
      if (!point) continue;

      const distance = Math.sqrt(
        Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
      );

      if (distance < COLOCATED_EPSILON) {
        result.push({ skeletonId: skeleton.id, pointIdx: i });
      }
    }
  }

  return result;
};

export const findNearbySkeletonPoint = (
  pos: { x: number; y: number },
  excludeSkeletonId: string,
  excludePointIdx: number,
  skeletons: Skeleton[],
  colocatedPoints: ColocatedPoint[]
): { x: number; y: number } | null => {
  for (const skeleton of skeletons) {
    for (let i = 0; i < skeleton.points.length; i++) {
      if (skeleton.id === excludeSkeletonId && i === excludePointIdx) {
        continue;
      }

      const isColocated = colocatedPoints.some(
        (cp) => cp.skeletonId === skeleton.id && cp.pointIdx === i
      );
      if (isColocated) {
        continue;
      }

      const point = skeleton.points[i];
      if (!point) continue;

      const distance = Math.sqrt(
        Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)
      );

      if (distance < SKELETON_SNAP_THRESHOLD) {
        return { x: point.x, y: point.y };
      }
    }
  }

  return null;
};
