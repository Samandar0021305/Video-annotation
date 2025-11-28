const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
};

export const clearCanvas = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const applyColorToCanvas = (
  canvas: HTMLCanvasElement,
  newColor: string
): void => {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [r, g, b] = hexToRgb(newColor);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    if (alpha !== undefined && alpha > 0) {
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const binarizeAlpha = (canvas: HTMLCanvasElement, threshold: number = 127): void => {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 3; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i];
    if (alpha !== undefined && alpha > threshold) {
      imageData.data[i] = 255;
    } else if (alpha !== undefined) {
      // Clear pixels below threshold to eliminate noise from anti-aliasing
      imageData.data[i] = 0;
      imageData.data[i - 1] = 0; // B
      imageData.data[i - 2] = 0; // G
      imageData.data[i - 3] = 0; // R
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const createOffscreenCanvas = (
  img: HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement => {
  const dpr = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: false,
  })!;

  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
};

export const initializeCanvases = (
  width: number,
  height: number
): { workingCanvas: HTMLCanvasElement; displayCanvas: HTMLCanvasElement } => {
  const workingCanvas = document.createElement("canvas");
  workingCanvas.width = width;
  workingCanvas.height = height;

  const displayCanvas = document.createElement("canvas");
  displayCanvas.width = width;
  displayCanvas.height = height;

  return { workingCanvas, displayCanvas };
};

/**
 * Render a stroke path to canvas using filled circles to avoid anti-aliasing artifacts.
 * This produces cleaner results for segmentation masks than ctx.stroke().
 */
export const renderStrokeToCanvas = (
  canvas: HTMLCanvasElement,
  points: Array<{ x: number; y: number }>,
  color: string,
  brushSize: number
): void => {
  if (points.length === 0) return;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const [r, g, b] = hexToRgb(color);
  const radius = brushSize / 2;

  // Get canvas image data for direct pixel manipulation (no anti-aliasing)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Helper to set a pixel
  const setPixel = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  };

  // Draw filled circle at each point using Bresenham's algorithm (no anti-aliasing)
  const fillCircle = (cx: number, cy: number, r: number) => {
    const r2 = r * r;
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(height - 1, Math.ceil(cy + r));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          setPixel(x, y);
        }
      }
    }
  };

  // Draw line between two points using filled circles
  const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy, 1);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      fillCircle(x, y, radius);
    }
  };

  // Draw all points and connect them
  const firstPoint = points[0];
  if (firstPoint) {
    fillCircle(Math.round(firstPoint.x), Math.round(firstPoint.y), radius);

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      if (prevPoint && currPoint) {
        drawLine(
          Math.round(prevPoint.x),
          Math.round(prevPoint.y),
          Math.round(currPoint.x),
          Math.round(currPoint.y)
        );
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};
