/**
 * RLE (Run-Length Encoding) utilities for mask storage
 *
 * Based on CVAT's approach: encodes alpha channel as runs of
 * transparent (0) and opaque (1) pixels for efficient storage.
 */

import type { MaskData } from '../types/mask';

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

/**
 * Encode image data alpha channel to RLE format (CVAT-style zipChannels)
 *
 * @param imageData - Raw image data from canvas (RGBA format)
 * @returns Array of run lengths, starting with transparent pixel count
 */
export function encodeRLE(imageData: Uint8ClampedArray): number[] {
  const rle: number[] = [];
  let prev = 0; // Start counting transparent pixels
  let count = 0;

  for (let i = 3; i < imageData.length; i += 4) {
    const alphaValue = imageData[i];
    const alpha = (alphaValue !== undefined && alphaValue > 0) ? 1 : 0;

    if (prev !== alpha) {
      rle.push(count);
      prev = alpha;
      count = 1;
    } else {
      count++;
    }
  }

  // Push the final run
  rle.push(count);

  return rle;
}

export function clipMaskRLE(
  mask: MaskData,
  originalLeft: number,
  originalTop: number,
  clippedLeft: number,
  clippedTop: number,
  clippedRight: number,
  clippedBottom: number
): MaskData | null {
  const originalWidth = mask.right - mask.left + 1;
  const originalHeight = mask.bottom - mask.top + 1;

  const [r, g, b] = hexToRgb(mask.color);
  const decoded = decodeRLE(mask.rle, r, g, b, originalWidth, originalHeight);

  const newWidth = clippedRight - clippedLeft + 1;
  const newHeight = clippedBottom - clippedTop + 1;

  const offsetX = clippedLeft - originalLeft;
  const offsetY = clippedTop - originalTop;

  const clippedData = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x + offsetX;
      const srcY = y + offsetY;

      if (srcX >= 0 && srcX < originalWidth && srcY >= 0 && srcY < originalHeight) {
        const srcIdx = (srcY * originalWidth + srcX) * 4;
        const dstIdx = (y * newWidth + x) * 4;

        clippedData[dstIdx] = decoded[srcIdx] ?? 0;
        clippedData[dstIdx + 1] = decoded[srcIdx + 1] ?? 0;
        clippedData[dstIdx + 2] = decoded[srcIdx + 2] ?? 0;
        clippedData[dstIdx + 3] = decoded[srcIdx + 3] ?? 0;
      }
    }
  }

  const newRle = encodeRLE(clippedData);

  const hasOpaquePixels = newRle.some((count, idx) => idx % 2 === 1 && count > 0);
  if (!hasOpaquePixels) {
    return null;
  }

  return {
    ...mask,
    rle: newRle,
    left: clippedLeft,
    top: clippedTop,
    right: clippedRight,
    bottom: clippedBottom,
  };
}

export function decodeRLE(
  rle: number[],
  r: number,
  g: number,
  b: number,
  width: number,
  height: number
): Uint8ClampedArray {
  const decoded = new Uint8ClampedArray(width * height * 4);
  let idx = 0;
  let value = 0; // Start with transparent

  for (let i = 0; i < rle.length; i++) {
    let count = rle[i] ?? 0;
    while (count-- > 0) {
      decoded[idx++] = r;
      decoded[idx++] = g;
      decoded[idx++] = b;
      decoded[idx++] = value * 255;
    }
    value = 1 - value; // Toggle between transparent and opaque
  }

  return decoded;
}

/**
 * Find the bounding box of non-transparent pixels in image data
 *
 * @param imageData - Raw image data from canvas
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Bounding box coordinates or null if no pixels found
 */
export function findBoundingBox(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): { left: number; top: number; right: number; bottom: number } | null {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = imageData[idx + 3] ?? 0;

      if (alpha > 0) {
        hasPixels = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (!hasPixels) {
    return null;
  }

  return { left, top, right, bottom };
}

/**
 * Extract a region from image data
 *
 * @param imageData - Full canvas image data
 * @param canvasWidth - Full canvas width
 * @param left - Left edge of region
 * @param top - Top edge of region
 * @param right - Right edge of region
 * @param bottom - Bottom edge of region
 * @returns Extracted region image data
 */
export function extractRegion(
  imageData: Uint8ClampedArray,
  canvasWidth: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): Uint8ClampedArray {
  const regionWidth = right - left + 1;
  const regionHeight = bottom - top + 1;
  const region = new Uint8ClampedArray(regionWidth * regionHeight * 4);

  for (let y = 0; y < regionHeight; y++) {
    for (let x = 0; x < regionWidth; x++) {
      const srcIdx = ((top + y) * canvasWidth + (left + x)) * 4;
      const dstIdx = (y * regionWidth + x) * 4;

      region[dstIdx] = imageData[srcIdx] ?? 0;
      region[dstIdx + 1] = imageData[srcIdx + 1] ?? 0;
      region[dstIdx + 2] = imageData[srcIdx + 2] ?? 0;
      region[dstIdx + 3] = imageData[srcIdx + 3] ?? 0;
    }
  }

  return region;
}

/**
 * Convert a canvas region to MaskData
 *
 * @param canvas - Source canvas
 * @param color - Hex color string
 * @param className - Class name
 * @param classID - Class ID
 * @param regionBounds - Optional specific region to encode (for single stroke)
 * @returns MaskData object or null if no pixels
 */
export function canvasToMaskData(
  canvas: HTMLCanvasElement,
  color: string,
  className: string,
  classID: number,
  regionBounds?: { left: number; top: number; right: number; bottom: number }
): MaskData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Ensure no smoothing for pixel-perfect data extraction
  ctx.imageSmoothingEnabled = false;

  const width = canvas.width;
  const height = canvas.height;

  let imageData: ImageData;
  let bounds: { left: number; top: number; right: number; bottom: number };

  if (regionBounds) {
    // Extract specific region
    const regionWidth = regionBounds.right - regionBounds.left + 1;
    const regionHeight = regionBounds.bottom - regionBounds.top + 1;
    imageData = ctx.getImageData(
      regionBounds.left,
      regionBounds.top,
      regionWidth,
      regionHeight
    );
    bounds = regionBounds;
  } else {
    // Get full canvas and find bounds
    const fullImageData = ctx.getImageData(0, 0, width, height);
    const foundBounds = findBoundingBox(fullImageData.data, width, height);

    if (!foundBounds) return null;

    bounds = foundBounds;
    const regionWidth = bounds.right - bounds.left + 1;
    const regionHeight = bounds.bottom - bounds.top + 1;

    // Extract just the bounding box region
    const regionData = extractRegion(
      fullImageData.data,
      width,
      bounds.left,
      bounds.top,
      bounds.right,
      bounds.bottom
    );

    // Create ImageData from extracted region
    const regionArray = new Uint8ClampedArray(regionWidth * regionHeight * 4);
    regionArray.set(regionData);
    imageData = new ImageData(regionArray, regionWidth, regionHeight);
  }

  // Encode the region to RLE
  const rle = encodeRLE(imageData.data);

  return {
    rle,
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom,
    color,
    className,
    classID
  };
}

/**
 * Render MaskData to a canvas
 *
 * @param mask - The mask data to render
 * @param targetCanvas - Canvas to render to
 * @param clearFirst - Whether to clear the canvas first
 * @param scale - Scale factor for rendering (default 1)
 */
export function renderMaskToCanvas(
  mask: MaskData,
  targetCanvas: HTMLCanvasElement,
  clearFirst: boolean = false,
  scale: number = 1
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  if (clearFirst) {
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  }

  const [r, g, b] = hexToRgb(mask.color);
  const width = mask.right - mask.left + 1;
  const height = mask.bottom - mask.top + 1;

  const decoded = decodeRLE(mask.rle, r, g, b, width, height);

  const imageArray = new Uint8ClampedArray(width * height * 4);
  imageArray.set(decoded);
  const imageData = new ImageData(imageArray, width, height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.putImageData(imageData, 0, 0);

  if (scale === 1) {
    ctx.drawImage(tempCanvas, mask.left, mask.top);
  } else {
    ctx.drawImage(
      tempCanvas,
      0, 0, width, height,
      mask.left * scale, mask.top * scale,
      width * scale, height * scale
    );
  }
}

/**
 * Render multiple masks to a canvas
 *
 * @param masks - Array of mask data to render
 * @param targetCanvas - Canvas to render to
 * @param clearFirst - Whether to clear the canvas first
 * @param scale - Scale factor for rendering
 */
export function renderMasksToCanvas(
  masks: MaskData[],
  targetCanvas: HTMLCanvasElement,
  clearFirst: boolean = true,
  scale: number = 1
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  if (clearFirst) {
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  }

  for (const mask of masks) {
    renderMaskToCanvas(mask, targetCanvas, false, scale);
  }
}

/**
 * Convert canvas with multiple colors to array of MaskData
 * Groups pixels by color and creates separate masks
 *
 * @param canvas - Source canvas with colored regions
 * @param classes - Array of tool classes with color info
 * @returns Array of MaskData objects
 */
export function canvasToMaskDataArray(
  canvas: HTMLCanvasElement,
  classes: Array<{ color: string; name: string; value: number }>
): MaskData[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Group pixels by color
  const colorGroups = new Map<string, {
    color: string;
    className: string;
    classID: number;
    pixels: Array<{ x: number; y: number }>
  }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a !== undefined && a > 0) {
        // Find matching class
        const matchedClass = classes.find(cls => {
          const [cr, cg, cb] = hexToRgb(cls.color);
          return Math.abs(cr - (r ?? 0)) <= 2 && Math.abs(cg - (g ?? 0)) <= 2 && Math.abs(cb - (b ?? 0)) <= 2;
        });

        if (matchedClass) {
          const key = matchedClass.color;
          if (!colorGroups.has(key)) {
            colorGroups.set(key, {
              color: matchedClass.color,
              className: matchedClass.name,
              classID: matchedClass.value,
              pixels: []
            });
          }
          colorGroups.get(key)!.pixels.push({ x, y });
        }
      }
    }
  }

  // Convert each color group to MaskData
  const results: MaskData[] = [];

  for (const [, group] of colorGroups) {
    if (group.pixels.length === 0) continue;

    // Find bounding box
    let left = width, top = height, right = 0, bottom = 0;
    for (const p of group.pixels) {
      if (p.x < left) left = p.x;
      if (p.x > right) right = p.x;
      if (p.y < top) top = p.y;
      if (p.y > bottom) bottom = p.y;
    }

    // Create mask image data for this color
    const maskWidth = right - left + 1;
    const maskHeight = bottom - top + 1;
    const maskData = new Uint8ClampedArray(maskWidth * maskHeight * 4);

    // Set all pixels to transparent initially
    for (let i = 0; i < maskData.length; i += 4) {
      maskData[i] = 0;
      maskData[i + 1] = 0;
      maskData[i + 2] = 0;
      maskData[i + 3] = 0;
    }

    // Fill in the pixels
    const [r, g, b] = hexToRgb(group.color);
    for (const p of group.pixels) {
      const localX = p.x - left;
      const localY = p.y - top;
      const idx = (localY * maskWidth + localX) * 4;
      maskData[idx] = r;
      maskData[idx + 1] = g;
      maskData[idx + 2] = b;
      maskData[idx + 3] = 255;
    }

    // Encode to RLE
    const rle = encodeRLE(maskData);

    results.push({
      rle,
      left,
      top,
      right,
      bottom,
      color: group.color,
      className: group.className,
      classID: group.classID
    });
  }

  return results;
}

/**
 * Scale MaskData coordinates
 *
 * @param mask - Original mask data
 * @param scale - Scale factor
 * @returns New MaskData with scaled coordinates (RLE unchanged)
 */
export function scaleMaskData(mask: MaskData, scale: number): MaskData {
  return {
    ...mask,
    left: Math.round(mask.left * scale),
    top: Math.round(mask.top * scale),
    right: Math.round(mask.right * scale),
    bottom: Math.round(mask.bottom * scale)
  };
}

/**
 * Check if a point is inside a mask (pixel-perfect using RLE)
 *
 * @param mask - The mask to test
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if point is on an opaque pixel of the mask
 */
export function isPointInMask(mask: MaskData, x: number, y: number): boolean {
  // Quick bounding box check (early exit)
  const px = Math.floor(x);
  const py = Math.floor(y);

  if (px < mask.left || px > mask.right || py < mask.top || py > mask.bottom) {
    return false;
  }

  // Convert to local coordinates within the mask
  const localX = px - mask.left;
  const localY = py - mask.top;
  const width = mask.right - mask.left + 1;

  // Calculate the pixel index in the flattened array
  const pixelIndex = localY * width + localX;

  // Walk through RLE to determine if this pixel is opaque
  // RLE format: [transparent_count, opaque_count, transparent_count, ...]
  // Starts with transparent pixels
  let currentIndex = 0;
  let isOpaque = false; // RLE starts with transparent run

  for (const runLength of mask.rle) {
    if (currentIndex + runLength > pixelIndex) {
      // The pixel falls within this run
      return isOpaque;
    }
    currentIndex += runLength;
    isOpaque = !isOpaque; // Toggle between transparent and opaque
  }

  return false;
}

/**
 * Find which mask contains the given point
 * Checks in reverse order (last = top-most, checked first)
 *
 * @param masks - Array of masks to check
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns The mask containing the point, or null if none
 */
export function findMaskAtPoint(
  masks: MaskData[],
  x: number,
  y: number
): MaskData | null {
  // Check in reverse order (top-most mask first)
  for (let i = masks.length - 1; i >= 0; i--) {
    const mask = masks[i];
    if (mask && isPointInMask(mask, x, y)) {
      return mask;
    }
  }
  return null;
}

/**
 * Find which mask (with index) contains the given point
 *
 * @param masks - Array of masks to check
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Object with mask and index, or null if none found
 */
export function findMaskWithIndexAtPoint(
  masks: MaskData[],
  x: number,
  y: number
): { mask: MaskData; index: number } | null {
  // Check in reverse order (top-most mask first)
  for (let i = masks.length - 1; i >= 0; i--) {
    const mask = masks[i];
    if (mask && isPointInMask(mask, x, y)) {
      return { mask, index: i };
    }
  }
  return null;
}

/**
 * Apply a color change to a mask by updating its color property
 * and re-rendering it to a canvas
 *
 * @param mask - The mask to modify
 * @param newColor - New hex color string
 * @param canvas - Canvas to render the updated mask to
 */
export function changeMaskColor(
  mask: MaskData,
  newColor: string,
  canvas: HTMLCanvasElement
): MaskData {
  // Create a new mask with updated color
  const updatedMask: MaskData = {
    ...mask,
    color: newColor
  };

  // Clear and re-render the mask with new color
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderMaskToCanvas(updatedMask, canvas, false, 1);
  }

  return updatedMask;
}

/**
 * Re-encode a canvas to RLE MaskData
 * Used after editing (brush/eraser) to update the stored data
 *
 * @param canvas - Canvas containing the edited mask
 * @param originalMask - Original mask for metadata (color, className, classID)
 * @returns New MaskData with updated RLE, or null if canvas is empty
 */
export function canvasToMaskDataFromEdit(
  canvas: HTMLCanvasElement,
  originalMask: MaskData
): MaskData | null {
  return canvasToMaskData(
    canvas,
    originalMask.color,
    originalMask.className,
    originalMask.classID
  );
}
