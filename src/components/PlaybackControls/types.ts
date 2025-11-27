export interface PlaybackControlsProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  zoomLevel: number;
  autoSuggest: boolean;
  isClearingCache: boolean;
}

export interface PlaybackControlsEmits {
  (e: "previous-frame"): void;
  (e: "next-frame"): void;
  (e: "toggle-play"): void;
  (e: "zoom-in"): void;
  (e: "zoom-out"): void;
  (e: "reset-zoom"): void;
  (e: "clear-cache"): void;
  (e: "update:autoSuggest", value: boolean): void;
  (e: "scrub", frame: number): void;
}
