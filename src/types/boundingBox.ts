export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  color: string;
  classId?: number;
  value?: number;
}

export interface BoundingBoxTrack {
  trackId: string;
  keyframes: Map<number, BoundingBox>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface BoundingBoxClass {
  value: number;
  name: string;
  color: string;
}
