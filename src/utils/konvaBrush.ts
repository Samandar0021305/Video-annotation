import Konva from "konva";

interface BrushOptions {
  brushSize: number;
  brushColor: string;
  brushImage?: HTMLImageElement;
  onStrokeComplete?: (canvas: HTMLCanvasElement) => void;
}

export class KonvaSegmentationBrush {
  private stage: Konva.Stage;
  private tempLayer: Konva.Layer;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private tempKonvaImage: Konva.Image | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private isDrawing = false;

  private brushSize: number;
  private brushColor: string;
  private brushImage: HTMLImageElement | null = null;
  private deleteMode = false;

  private onStrokeComplete?: (canvas: HTMLCanvasElement) => void;

  constructor(
    stage: Konva.Stage,
    width: number,
    height: number,
    options: BrushOptions
  ) {
    this.stage = stage;
    this.brushSize = options.brushSize;
    this.brushColor = options.brushColor;
    this.onStrokeComplete = options.onStrokeComplete;

    this.tempLayer = new Konva.Layer();
    this.stage.add(this.tempLayer);

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.tempCtx = this.tempCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    this.tempCtx.imageSmoothingEnabled = false;

    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.offscreenCtx = this.offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    this.offscreenCtx.imageSmoothingEnabled = false;

    if (options.brushImage) {
      this.brushImage = options.brushImage;
    } else {
      this.loadDefaultBrush();
    }
  }

  private async loadDefaultBrush() {
    const brushDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFkAAABZCAYAAABVC4ivAAAAAXNSR0IArs4c6QAAAoVJREFUeF7t3FFygyAQxvHkZn3rPXqw3qNvvVk7sWNjFGQXdleUfx4zCPHHN4BEvd86/nx9vP1If9775/ddWja6XDc/TAMqReoF/jBkD9Q9/CPBw5GjcVPw0eAhyD3AHontitwr7hrcO9luyGcBXoJ7YZsjnxHXO9mmyFcAnsEtU22CfCVcj1Q3I18Z2CrVTcgjAFtAVyOPBNwKXYU8InALtBp5ZOBaaBUywM+1h2aJJ0YGeLv7IYUWIQOc30SVQIMs/QcgU84EmRSXe6EEvZtkgMvAkhUHyHLH3ZJ7ac4ik2K9fg4aZL2lOtFJZFJcL59KM8j1ntkj19AbZFLcrg5yu2Gxhl1kUlz0ExdYQr8MFyCLDYsFQS4S2RSYof+TTIptYJe1gGxvuqkR5Ghkhgo/8UeapzEZZJD9BAJqJskgBwgENDElmfHYXxpkf+MbyCAHCAQ0QZJBDhAIaIIkgxwgENAESQY5QCCgCZIcgcxWp68yu3C+vlPtIIMcIBDQBEmORGby89HmlgAf15daQQY5QMC5CW44dAae18dzM9w66wSeTTKrDBtxHmewcdytBWRnZB4xcwZeT3jJiW/+kruK6nqDx37r3FRHqZFZaah8p33j3BG8ikFnmS1djUyaZT3Q9OYWJsIycgn4UQMveio7qi48UoVFyAwbaWdJisVJZtjYIkuB1cgk+g9bA1yFPDq0FrgaeVToGuAm5NGga4GbkUeBbgE2Qb46dCuwGfIVl3gWuLOL+GJEemF0hb1oS2DzJC874ozY1rhuSV4n/izYXsCuST4LtiduWJJ7xI6AXZ63+cQnnSCPWPpF4x6W5FwneIzdR6Guz/HQJJdSr4HvBTR1Tr/cNFJHatpA6gAAAABJRU5ErkJggg==";

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.brushImage = img;
        this.applyColorTint();
        resolve();
      };
      img.src = brushDataUrl;
    });
  }

  public setBrushSize(size: number) {
    this.brushSize = size;
  }

  public setBrushColor(color: string) {
    this.brushColor = color;
    this.applyColorTint();
  }

  public setDeleteMode(enabled: boolean) {
    this.deleteMode = enabled;
  }

  public setOpacity(opacity: number) {
    this.tempLayer.opacity(opacity);
  }

  private applyColorTint() {
    if (!this.brushImage) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.brushImage.width;
    tempCanvas.height = this.brushImage.height;
    const tempCtx = tempCanvas.getContext("2d")!;

    tempCtx.drawImage(this.brushImage, 0, 0);

    tempCtx.globalCompositeOperation = "source-in";
    tempCtx.fillStyle = this.brushColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const tintedImage = new Image();
    tintedImage.src = tempCanvas.toDataURL();
    tintedImage.onload = () => {
      this.brushImage = tintedImage;
    };
  }

  public onMouseDown(_e: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.brushImage) return;

    const pos = this.tempLayer.getRelativePointerPosition();
    if (!pos) return;

    this.isDrawing = true;

    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);

    this.tempCtx.save();
    this.tempCtx.globalCompositeOperation = "source-over";

    this.drawBrushStamp(pos.x, pos.y);

    this.tempCtx.restore();

    if (!this.tempKonvaImage) {
      this.tempKonvaImage = new Konva.Image({
        image: this.tempCanvas,
        x: 0,
        y: 0,
        listening: false,
      });
      this.tempLayer.add(this.tempKonvaImage);
    }

    this.tempLayer.batchDraw();
  }

  public onMouseMove(_e: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.isDrawing || !this.brushImage) return;

    const pos = this.tempLayer.getRelativePointerPosition();
    if (!pos) return;

    this.tempCtx.save();
    this.tempCtx.globalCompositeOperation = "source-over";

    this.drawBrushStamp(pos.x, pos.y);

    this.tempCtx.restore();

    if (this.tempKonvaImage) {
      this.tempKonvaImage.getLayer()?.batchDraw();
    }
  }

  public onMouseUp(_e: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    this.transferToOffscreenCanvas();

    if (this.onStrokeComplete) {
      this.onStrokeComplete(this.offscreenCanvas);
    }
  }

  public clearTempCanvas() {
    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    this.tempLayer.batchDraw();
  }

  private drawBrushStamp(x: number, y: number) {
    if (!this.brushImage) return;

    let destX = x - this.brushSize / 2;
    let destY = y - this.brushSize / 2;

    destX = Math.floor(destX);
    destY = Math.floor(destY);

    this.tempCtx.drawImage(
      this.brushImage,
      destX,
      destY,
      this.brushSize,
      this.brushSize
    );
  }
  private transferToOffscreenCanvas() {
    this.offscreenCtx.save();

    if (this.deleteMode) {
      this.offscreenCtx.globalCompositeOperation = "destination-out";
    } else {
      this.offscreenCtx.globalCompositeOperation = "source-over";
    }

    this.offscreenCtx.drawImage(this.tempCanvas, 0, 0);

    this.offscreenCtx.restore();
    this.offscreenCtx.globalCompositeOperation = "source-over";
  }

  public getOffscreenCanvas(): HTMLCanvasElement {
    return this.offscreenCanvas;
  }

  public clearOffscreenCanvas() {
    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );
  }

  public async loadFromCanvas(canvas: HTMLCanvasElement) {
    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );
    this.offscreenCtx.drawImage(canvas, 0, 0);
  }

  public async loadFromDataURL(dataURL: string) {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.offscreenCtx.clearRect(
          0,
          0,
          this.offscreenCanvas.width,
          this.offscreenCanvas.height
        );
        this.offscreenCtx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = dataURL;
    });
  }

  public destroy() {
    if (this.tempKonvaImage) {
      this.tempKonvaImage.destroy();
    }
    this.tempLayer.destroy();
  }
}

export const createKonvaSegmentationBrush = async (
  stage: Konva.Stage,
  width: number,
  height: number,
  options: BrushOptions
): Promise<KonvaSegmentationBrush> => {
  const brush = new KonvaSegmentationBrush(stage, width, height, options);
  await brush["loadDefaultBrush"]();
  return brush;
};
