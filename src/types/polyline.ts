export interface PolylinePoint {
  x: number;
  y: number;
}

export interface Polyline {
  id: string;
  points: PolylinePoint[];
  label?: string;
  color: string;
  classId: number;
}

export interface PolylineTrack {
  trackId: string;
  keyframes: Map<number, Polyline>;
  ranges: Array<[number, number]>;
  hiddenAreas: Array<[number, number]>;
  interpolationEnabled: boolean;
  label?: string;
  color: string;
  classId: number;
}

export interface PolylineClass {
  value: number;
  name: string;
  color: string;
}
