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

export const binarizeAlpha = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 3; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i];
    if (alpha !== undefined && alpha > 0) {
      imageData.data[i] = 255;
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
