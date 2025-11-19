export interface SkeletonPoint {
  x: number;
  y: number;
}

export interface Skeleton {
  id: string;
  points: SkeletonPoint[];
  label?: string;
  color: string;
  classId: number;
}

export interface SkeletonTrack {
  trackId: string;
  keyframes: Map<number, Skeleton>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface SkeletonClass {
  value: number;
  name: string;
  color: string;
}
