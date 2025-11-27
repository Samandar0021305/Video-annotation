// Throttling constants
export const HOVER_THROTTLE_MS = 50;

// Canvas size limits
export const MAX_WIDTH = 1200;
export const MAX_HEIGHT = 800;

// Skeleton interaction thresholds
export const SKELETON_SNAP_THRESHOLD = 10;
export const COLOCATED_EPSILON = 0.5;

// Markup types for annotation classes
export const MarkupType = {
  BBOX: "bbox",
  POLYGON: "polygon",
  SKELETON: "skeleton",
  MASK: "mask",
} as const;

export type MarkupTypeValue = (typeof MarkupType)[keyof typeof MarkupType];

// Track types for timeline
export const TrackType = {
  BBOX: "bbox",
  POLYGON: "polygon",
  SKELETON: "skeleton",
  BRUSH: "brush",
} as const;

export type TrackTypeValue = (typeof TrackType)[keyof typeof TrackType];

// Tool modes
export const ToolMode = {
  PAN: "pan",
  BBOX: "bbox",
  POLYGON: "polygon",
  SKELETON: "skeleton",
  BRUSH: "brush",
  ERASER: "eraser",
} as const;

export type ToolModeValue = (typeof ToolMode)[keyof typeof ToolMode];

// Segmentation edit modes
export const SegmentationEditMode = {
  NONE: "none",
  BRUSH: "brush",
  ERASER: "eraser",
} as const;

export type SegmentationEditModeValue =
  (typeof SegmentationEditMode)[keyof typeof SegmentationEditMode];

// Default colors
export const DefaultColors = {
  BBOX: "#FF0000",
  POLYGON: "#00FF00",
  SKELETON: "#0000FF",
  BRUSH: "#FF0000",
} as const;
