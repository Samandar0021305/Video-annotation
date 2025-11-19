export interface ContourPoint {
  id: string;
  points: number[][];
  isHole?: boolean;
}

export interface SegmentationContour {
  classColor: string;
  className: string;
  classID: number;
  contours: ContourPoint[];
  markup_type: string;
}

export interface ToolClass {
  value: number;
  name: string;
  color: string;
  markup_type?: string;
  isDefault?: boolean;
}
