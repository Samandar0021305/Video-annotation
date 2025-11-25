declare const self: DedicatedWorkerGlobalScope;

interface WorkerCV {
  Mat: any;
  MatVector: any;
  Scalar: any;
  imread: (canvas: any) => any;
  imshow: (canvas: any, mat: any) => void;
  inRange: (src: any, lower: any, upper: any, dst: any) => void;
  findContours: (src: any, contours: any, hierarchy: any, mode: any, method: any) => void;
  drawContours: (dst: any, contours: any, idx: number, color: any, thickness: number) => void;
  matFromArray: (rows: number, cols: number, type: number, data: number[]) => any;
  RETR_CCOMP: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_8UC4: number;
  CV_32SC2: number;
}

let cv: WorkerCV | null = null;
let cvReady = false;
let cvLoadPromise: Promise<void> | null = null;

interface ContourPointData {
  id: string;
  points: number[][];
  isHole?: boolean;
}

interface SegmentationContourData {
  classColor: string;
  className: string;
  classID: number;
  contours: ContourPointData[];
  markup_type: string;
}

interface ToolClassData {
  value: number;
  name: string;
  color: string;
  markup_type?: string;
}

interface ExtractContoursMessage {
  type: 'extractContours';
  id: string;
  imageData: ImageData;
  storageScale: number;
  classes: ToolClassData[];
}

interface RenderContoursMessage {
  type: 'renderContours';
  id: string;
  contours: SegmentationContourData[];
  toolClasses: ToolClassData[];
  displayScale: number;
  width: number;
  height: number;
}

interface InitMessage {
  type: 'init';
  id: string;
}

type WorkerMessage = ExtractContoursMessage | RenderContoursMessage | InitMessage;

const loadOpenCVInWorker = (): Promise<void> => {
  if (cvLoadPromise) {
    return cvLoadPromise;
  }

  if (cvReady && cv) {
    return Promise.resolve();
  }

  cvLoadPromise = new Promise<void>((resolve, reject) => {
    const scriptUrl = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.1/dist/opencv.min.js';

    fetch(scriptUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenCV: ${response.status}`);
        }
        return response.text();
      })
      .then(scriptText => {
        (self as any).Module = {
          onRuntimeInitialized: () => {
            cv = (self as any).cv;
            cvReady = true;
            resolve();
          }
        };

        const fn = new Function(scriptText);
        fn.call(self);

        const checkReady = setInterval(() => {
          const globalCV = (self as any).cv;
          if (globalCV && globalCV.Mat && typeof globalCV.imread === 'function') {
            clearInterval(checkReady);
            cv = globalCV;
            cvReady = true;
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkReady);
          if (!cvReady) {
            reject(new Error('OpenCV load timeout in worker'));
          }
        }, 30000);
      })
      .catch(reject);
  });

  return cvLoadPromise;
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

const extractUniqueColorsFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): Map<string, [number, number, number]> => {
  const colorMap = new Map<string, [number, number, number]>();
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    const a = data[offset + 3]!;

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
  classes: ToolClassData[]
): ToolClassData | undefined => {
  const [r, g, b] = rgb;
  return classes.find(cls => {
    const [cr, cg, cb] = hexToRgb(cls.color);
    return Math.abs(cr - r) <= 2 && Math.abs(cg - g) <= 2 && Math.abs(cb - b) <= 2;
  });
};

const extractContours = async (
  imageData: ImageData,
  storageScale: number,
  classes: ToolClassData[]
): Promise<SegmentationContourData[]> => {
  if (!cv) {
    throw new Error('OpenCV not initialized');
  }

  const { width, height, data } = imageData;
  const uniqueColors = extractUniqueColorsFromImageData(data, width, height);
  const results: SegmentationContourData[] = [];

  const src = new cv.Mat(height, width, cv.CV_8UC4);
  src.data.set(data);

  for (const [, rgb] of uniqueColors) {
    const toolClass = findClassByColor(rgb, classes);
    if (!toolClass) continue;

    const [r, g, b] = rgb;
    const lowerBound = new cv.Mat(height, width, cv.CV_8UC4, [r, g, b, 255]);
    const upperBound = new cv.Mat(height, width, cv.CV_8UC4, [r, g, b, 255]);
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

    const contourPoints: ContourPointData[] = [];

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
  toolClasses: ToolClassData[],
  contours: SegmentationContourData[],
  displayScale: number,
  width: number,
  height: number
): Promise<ImageData> => {
  if (!cv) {
    throw new Error('OpenCV not initialized');
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

  const resultData = new Uint8ClampedArray(dstColored.data);
  const imageData = new ImageData(resultData, width, height);

  dstColored.delete();

  return imageData;
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const message = e.data;

  try {
    if (message.type === 'init') {
      await loadOpenCVInWorker();
      self.postMessage({
        type: 'initResult',
        id: message.id,
        success: true
      });
      return;
    }

    if (!cvReady) {
      await loadOpenCVInWorker();
    }

    if (message.type === 'extractContours') {
      const contours = await extractContours(
        message.imageData,
        message.storageScale,
        message.classes
      );
      self.postMessage({
        type: 'extractContoursResult',
        id: message.id,
        contours
      });
    } else if (message.type === 'renderContours') {
      const imageData = await renderContours(
        message.toolClasses,
        message.contours,
        message.displayScale,
        message.width,
        message.height
      );
      self.postMessage(
        {
          type: 'renderContoursResult',
          id: message.id,
          imageData
        },
        { transfer: [imageData.data.buffer] }
      );
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      id: message.id,
      error: error.message || 'Unknown error in worker'
    });
  }
};

export {};
