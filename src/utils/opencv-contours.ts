import type { SegmentationContour, ToolClass } from '../types/contours';
import { waitForOpenCV } from './loaders/opencv-utils';

const canvasToDataURL = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(canvas.toDataURL());
      }
    });
  });
};

const getImageElement = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
};

const extractUniqueColors = (src: any): Map<string, [number, number, number]> => {
  const colorMap = new Map<string, [number, number, number]>();
  const data = src.data;
  const channels = src.channels();
  const totalPixels = src.rows * src.cols;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = channels === 4 ? data[offset + 3] : 255;

    if (a > 0) {
      const colorKey = `${r},${g},${b}`;
      if (!colorMap.has(colorKey)) {
        colorMap.set(colorKey, [r, g, b]);
      }
    }
  }

  return colorMap;
};

const findClassByColor = (
  rgb: [number, number, number],
  classes: ToolClass[]
): ToolClass | undefined => {
  const [r, g, b] = rgb;
  return classes.find(cls => {
    const [cr, cg, cb] = hexToRgb(cls.color);
    return Math.abs(cr - r) <= 2 && Math.abs(cg - g) <= 2 && Math.abs(cb - b) <= 2;
  });
};

const extractContours = async (
  canvasOrUrl: HTMLCanvasElement | string,
  storageScale: number,
  classes: ToolClass[]
): Promise<SegmentationContour[]> => {
  await waitForOpenCV();
  const cv = window.cv;

  if (!cv || !cv.imread || !cv.Mat) {
    throw new Error('OpenCV initialization failed - WASM runtime not ready');
  }

  let imageUrl: string;
  if (typeof canvasOrUrl === 'string') {
    imageUrl = canvasOrUrl;
  } else {
    imageUrl = await canvasToDataURL(canvasOrUrl);
  }

  const imgElement = await getImageElement(imageUrl);
  const src = cv.imread(imgElement);

  if (typeof canvasOrUrl !== 'string') {
    URL.revokeObjectURL(imageUrl);
  }

  const uniqueColors = extractUniqueColors(src);
  const results: SegmentationContour[] = [];

  for (const [, rgb] of uniqueColors) {
    const toolClass = findClassByColor(rgb, classes);
    if (!toolClass) continue;

    const [r, g, b] = rgb;
    const lowerBound = new cv.Mat(src.rows, src.cols, src.type(), [r, g, b, 255]);
    const upperBound = new cv.Mat(src.rows, src.cols, src.type(), [r, g, b, 255]);
    const mask = new cv.Mat();

    cv.inRange(src, lowerBound, upperBound, mask);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.findContours(
      mask,
      contours,
      hierarchy,
      cv.RETR_CCOMP,
      cv.CHAIN_APPROX_SIMPLE
    );

    const contourPoints: any[] = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const points: number[][] = [];

      for (let j = 0; j < contour.data32S.length; j += 2) {
        const x = contour.data32S[j] * storageScale;
        const y = contour.data32S[j + 1] * storageScale;
        points.push([x, y]);
      }

      if (points.length > 0) {
        const hierarchyData = hierarchy.intPtr(0, i);
        const parentIndex = hierarchyData[3];
        const isHole = parentIndex >= 0;

        contourPoints.push({
          id: `${toolClass.value}_${i}_${Date.now()}`,
          points,
          isHole
        });
      }

      contour.delete();
    }

    if (contourPoints.length > 0) {
      results.push({
        classColor: toolClass.color,
        className: toolClass.name,
        classID: toolClass.value + 1,
        contours: contourPoints,
        markup_type: toolClass.markup_type || 'segment'
      });
    }

    mask.delete();
    contours.delete();
    hierarchy.delete();
    lowerBound.delete();
    upperBound.delete();
  }

  src.delete();
  return results;
};

const renderContours = async (
  toolClasses: ToolClass[],
  contours: SegmentationContour[],
  displayScale: number,
  width: number,
  height: number
): Promise<HTMLCanvasElement> => {
  await waitForOpenCV();
  const cv = window.cv;

  if (!cv || !cv.Mat) {
    throw new Error('OpenCV initialization failed - cv is not available');
  }

  const dstColored = cv.Mat.zeros(height, width, cv.CV_8UC4);

  for (const contourGroup of contours) {
    const toolClass = toolClasses.find(cls => cls.value === contourGroup.classID - 1);
    if (!toolClass || !toolClass.color) continue;

    const [r, g, b] = hexToRgb(toolClass.color);
    const rgbColor = new cv.Scalar(r, g, b, 255);

    for (const contour of contourGroup.contours) {
      const scaledPoints = contour.points.map(p => [
        Math.round((p[0] ?? 0) * displayScale),
        Math.round((p[1] ?? 0) * displayScale)
      ]);

      const flatPoints = scaledPoints.flatMap(p => p);
      const mat = cv.matFromArray(1, scaledPoints.length, cv.CV_32SC2, flatPoints);

      const contoursVec = new cv.MatVector();
      contoursVec.push_back(mat);

      const drawColor = contour.isHole
        ? new cv.Scalar(0, 0, 0, 0)
        : rgbColor;

      cv.drawContours(dstColored, contoursVec, 0, drawColor, -1);

      mat.delete();
      contoursVec.delete();
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  cv.imshow(canvas, dstColored);

  dstColored.delete();

  return canvas;
};

export const getSegmentationImageContoursForSaving = async (
  canvasOrUrl: HTMLCanvasElement | string,
  storageScale: number,
  classes: ToolClass[]
): Promise<SegmentationContour[]> => {
  try {
    return await extractContours(canvasOrUrl, storageScale, classes);
  } catch (error: any) {
    console.error('Error in getSegmentationImageContoursForSaving:', error);
    return [];
  }
};

export const getImageFromContours = async (
  toolClasses: ToolClass[],
  contours: SegmentationContour[],
  displayScale: number,
  width: number,
  height: number
): Promise<HTMLCanvasElement> => {
  try {
    return await renderContours(toolClasses, contours, displayScale, width, height);
  } catch (error: any) {
    console.error('Error in getImageFromContours:', error);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
};
