export interface Point {
  id: string;
  x: number;
  y: number;
  color: string;
  classId: number;
  label?: string;
}

export interface PointTrack {
  id: string;
  keyframes: Map<number, Point>;
  interpolationEnabled: boolean;
  ranges?: [number, number][];
}
