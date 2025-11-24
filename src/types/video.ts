export interface ExtractedFrame {
  id: string;
  imageUrl: string;
  frameNumber: number;
  timestamp: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface ExtractionProgress {
  current: number;
  total: number;
  percentage: number;
}
