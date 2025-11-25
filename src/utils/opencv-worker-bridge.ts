import type { SegmentationContour, ToolClass } from '../types/contours';
import OpenCVWorker from '../workers/opencv.worker?worker';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

class OpenCVWorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new OpenCVWorker();

        this.worker.onmessage = (e: MessageEvent) => {
          this.handleMessage(e.data);
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          const pendingEntries = Array.from(this.pendingRequests.entries());
          for (const [id, request] of pendingEntries) {
            request.reject(new Error('Worker error'));
            this.pendingRequests.delete(id);
          }
        };

        const initId = this.generateRequestId();

        this.pendingRequests.set(initId, {
          resolve: () => {
            this.isInitialized = true;
            resolve();
          },
          reject
        });

        this.worker.postMessage({
          type: 'init',
          id: initId
        });

        setTimeout(() => {
          if (this.pendingRequests.has(initId)) {
            this.pendingRequests.delete(initId);
            reject(new Error('Worker initialization timeout'));
          }
        }, 35000);
      } catch (error) {
        reject(error);
      }
    });
  }

  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  private handleMessage(data: any): void {
    const { id, type } = data;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      return;
    }

    this.pendingRequests.delete(id);

    if (type === 'error') {
      pending.reject(new Error(data.error));
      return;
    }

    if (type === 'initResult') {
      if (data.success) {
        pending.resolve(undefined);
      } else {
        pending.reject(new Error('Worker init failed'));
      }
      return;
    }

    if (type === 'extractContoursResult') {
      pending.resolve(data.contours);
      return;
    }

    if (type === 'renderContoursResult') {
      pending.resolve(data.imageData);
      return;
    }
  }

  async extractContours(
    canvas: HTMLCanvasElement,
    storageScale: number,
    classes: ToolClass[]
  ): Promise<SegmentationContour[]> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      const id = this.generateRequestId();

      this.pendingRequests.set(id, { resolve, reject });

      const classesData = classes.map(c => ({
        value: c.value,
        name: c.name,
        color: c.color,
        markup_type: c.markup_type
      }));

      this.worker!.postMessage(
        {
          type: 'extractContours',
          id,
          imageData,
          storageScale,
          classes: classesData
        },
        { transfer: [imageData.data.buffer] }
      );

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Extract contours timeout'));
        }
      }, 30000);
    });
  }

  async renderContours(
    toolClasses: ToolClass[],
    contours: SegmentationContour[],
    displayScale: number,
    width: number,
    height: number
  ): Promise<HTMLCanvasElement> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const imageData = await new Promise<ImageData>((resolve, reject) => {
      const id = this.generateRequestId();

      this.pendingRequests.set(id, { resolve, reject });

      const classesData = toolClasses.map(c => ({
        value: c.value,
        name: c.name,
        color: c.color,
        markup_type: c.markup_type
      }));

      const contoursData = contours.map(cg => ({
        classColor: cg.classColor,
        className: cg.className,
        classID: cg.classID,
        contours: cg.contours.map(c => ({
          id: c.id,
          points: c.points,
          isHole: c.isHole
        })),
        markup_type: cg.markup_type
      }));

      this.worker!.postMessage({
        type: 'renderContours',
        id,
        toolClasses: classesData,
        contours: contoursData,
        displayScale,
        width,
        height
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Render contours timeout'));
        }
      }, 30000);
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
      this.pendingRequests.clear();
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

export const opencvWorkerBridge = new OpenCVWorkerBridge();

export const initializeOpenCVWorker = async (): Promise<void> => {
  return opencvWorkerBridge.initialize();
};

export const extractContoursViaWorker = async (
  canvas: HTMLCanvasElement,
  storageScale: number,
  classes: ToolClass[]
): Promise<SegmentationContour[]> => {
  return opencvWorkerBridge.extractContours(canvas, storageScale, classes);
};

export const renderContoursViaWorker = async (
  toolClasses: ToolClass[],
  contours: SegmentationContour[],
  displayScale: number,
  width: number,
  height: number
): Promise<HTMLCanvasElement> => {
  return opencvWorkerBridge.renderContours(toolClasses, contours, displayScale, width, height);
};

export const terminateOpenCVWorker = (): void => {
  opencvWorkerBridge.terminate();
};

export const isOpenCVWorkerReady = (): boolean => {
  return opencvWorkerBridge.isReady();
};
