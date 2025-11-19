import videoFileHD from '../assets/video.mp4';
import videoFile4K from '../assets/video_4K.MOV';
import { VideoTab } from '../types/enums';

export const MAX_WORKING_DIMENSION = 1920;

export const DEFAULT_STAGE_CONFIG = {
  width: 900,
  height: 700,
  draggable: true,
  scaleX: 1,
  scaleY: 1,
} as const;

export const CONTAINER_DIMENSIONS = {
  width: 1200,
  height: 900,
} as const;

export const MAX_STAGE_DIMENSIONS = {
  width: 900,
  height: 700,
} as const;

export const DEFAULT_COLORS = {
  brush: '#ff0000',
  bbox: '#00ff00',
  polygon: '#0000ff',
  skeleton: '#00ff00',
} as const;

export const DEFAULT_BRUSH_SIZE = 30;

export const DEFAULT_SEGMENTATION_OPACITY = 0.7;

export const MIN_BBOX_SIZE = 10;

export const MIN_FRAME = 0;

export const KONVA_PIXEL_RATIO = 1;

export const VIDEO_SOURCES = {
  [VideoTab.HD]: {
    source: videoFileHD,
    filename: 'video.mp4',
    label: 'HD Video',
  },
  [VideoTab.FOUR_K]: {
    source: videoFile4K,
    filename: 'video_4K.MOV',
    label: '4K Video',
  },
  [VideoTab.URL]: {
    source: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    filename: 'BigBuckBunny.mp4',
    label: 'URL Video',
  },
} as const;

export const DEFAULT_TOOL_CLASS = {
  value: 0,
  name: 'Red',
  color: '#ff0000',
  markup_type: 'segment',
} as const;
