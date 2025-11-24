export const createTintedBrushImage = (
  brushImage: HTMLImageElement,
  color: string
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = brushImage.width;
  canvas.height = brushImage.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(brushImage, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";

  return canvas;
};

export const loadBrushImage = async (
  url: string
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const interpolatePoints = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  interval: number
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / interval);

  if (steps <= 1) {
    return [{ x: Math.round(p2.x), y: Math.round(p2.y) }];
  }

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: Math.round(p1.x + dx * t),
      y: Math.round(p1.y + dy * t),
    });
  }

  return points;
};

export const createEmptyCanvas = (
  width: number,
  height: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
};

export const createURLFromCanvas = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL("image/png");
};

export const getAsImageElement = async (
  url: string
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
  });
};
