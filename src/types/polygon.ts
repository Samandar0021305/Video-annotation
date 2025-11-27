export interface PolygonPoint {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: PolygonPoint[];
  label?: string;
  color: string;
  classId?: number;
  value?: number;
}

export interface PolygonTrack {
  trackId: string;
  keyframes: Map<number, Polygon>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface PolygonClass {
  value: number;
  name: string;
  color: string;
}
