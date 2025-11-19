export const Tool = {
  PAN: 'pan',
  BRUSH: 'brush',
  ERASER: 'eraser',
  BBOX: 'bbox',
  SELECT: 'select',
  POLYGON: 'polygon',
  SKELETON: 'skeleton'
} as const;

export type Tool = typeof Tool[keyof typeof Tool];

export const TrackType = {
  BRUSH: 'brush',
  BBOX: 'bbox',
  POLYGON: 'polygon',
  SKELETON: 'skeleton'
} as const;

export type TrackType = typeof TrackType[keyof typeof TrackType];

export const ResizeEdge = {
  LEFT: 'left',
  RIGHT: 'right'
} as const;

export type ResizeEdge = typeof ResizeEdge[keyof typeof ResizeEdge];

export const VideoTab = {
  HD: 'hd',
  FOUR_K: '4k',
  URL: 'url'
} as const;

export type VideoTab = typeof VideoTab[keyof typeof VideoTab];

export const MarkupType = {
  SEGMENT: 'segment',
  BBOX: 'bbox',
  POLYGON: 'polygon',
  SKELETON: 'skeleton'
} as const;

export type MarkupType = typeof MarkupType[keyof typeof MarkupType];
