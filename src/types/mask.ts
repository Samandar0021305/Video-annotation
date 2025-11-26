/**
 * RLE-based mask data structure (CVAT-style approach)
 *
 * This provides pixel-perfect fidelity by storing the actual pixel data
 * using Run-Length Encoding instead of extracting contour boundaries.
 */
export interface MaskData {
  /** Run-length encoded alpha channel data */
  rle: number[];
  /** Bounding box coordinates (left edge) */
  left: number;
  /** Bounding box coordinates (top edge) */
  top: number;
  /** Bounding box coordinates (right edge) */
  right: number;
  /** Bounding box coordinates (bottom edge) */
  bottom: number;
  /** Color in hex format (e.g., "#FF0000") */
  color: string;
  /** Human-readable class name */
  className: string;
  /** Numeric class identifier */
  classID: number;
}

/**
 * Collection of masks for a single frame
 */
export interface FrameMasks {
  masks: MaskData[];
  frameIndex: number;
}
