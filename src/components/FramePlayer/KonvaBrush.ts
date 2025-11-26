import Konva from "konva";
import { interpolatePoints, loadBrushImage } from "./brushUtils";

const BRUSH_IMAGE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFkAAABZCAYAAABVC4ivAAAAAXNSR0IArs4c6QAAAoVJREFUeF7t3FFygyAQxvHkZn3rPXqw3qNvvVk7sWNjFGQXdleUfx4zCPHHN4BEvd86/nx9vP1If9775/ddWja6XDc/TAMqReoF/jBkD9Q9/CPBw5GjcVPw0eAhyD3AHontitwr7hrcO9luyGcBXoJ7YZsjnxHXO9mmyFcAnsEtU22CfCVcj1Q3I18Z2CrVTcgjAFtAVyOPBNwKXYU8InALtBp5ZOBaaBUywM+1h2aJJ0YGeLv7IYUWIQOc30SVQIMs/QcgU84EmRSXe6EEvZtkgMvAkhUHyHLH3ZJ7ac4ik2K9fg4aZL2lOtFJZFJcL59KM8j1ntkj19AbZFLcrg5yu2Gxhl1kUlz0ExdYQr8MFyCLDYsFQS4S2RSYof+TTIptYJe1gGxvuqkR5Ghkhgo/8UeapzEZZJD9BAJqJskgBwgENDElmfHYXxpkf+MbyCAHCAQ0QZJBDhAIaIIkgxwgENAESQY5QCCgCZIcgcxWp68yu3C+vlPtIIMcIBDQBEmORGby89HmlgAf15daQQY5QMC5CW44dAae18dzM9w66wSeTTKrDBtxHmewcdytBWRnZB4xcwZeT3jJiW/+kruK6nqDx37r3FRHqZFZaah8p33j3BG8ikFnmS1djUyaZT3Q9OYWJsIycgn4UQMveio7qi48UoVFyAwbaWdJisVJZtjYIkuB1cgk+g9bA1yFPDq0FrgaeVToGuAm5NGga4GbkUeBbgE2Qb46dCuwGfIVl3gWuLOL+GJEemF0hb1oS2DzJC874ozY1rhuSV4n/izYXsCuST4LtiduWJJ7xI6AXZ63+cQnnSCPWPpF4x6W5FwneIzdR6Guz/HQJJdSr4HvBTR1Tr/cNFJHatpA6gAAAABJRU5ErkJggg==";

interface Point {
  x: number;
  y: number;
}

export class KonvaBrush {
  private brushImage: HTMLImageElement | null = null;
  private tintedBrush: HTMLCanvasElement | null = null;
  private brushColor: string = "#000000";
  private brushSize: number = 20;
  private opacity: number = 0.2;
  private brushLoaded: boolean = false;
  private lastPoint: Point | null = null;
  private drawingPoints: Point[] = [];
  private interval: number = 5;
  private dpr: number = window.devicePixelRatio || 1;

  async initialize(): Promise<void> {
    try {
      this.brushImage = await loadBrushImage(BRUSH_IMAGE_BASE64);
      this.brushLoaded = true;
      this.updateTintedBrush();
    } catch (error) {
      console.error("Failed to load brush:", error);
      this.brushLoaded = false;
    }
  }

  private updateTintedBrush(): void {
    if (!this.brushImage || !this.brushLoaded) return;

    const canvas = document.createElement("canvas");
    const srcWidth = this.brushImage.width;
    const srcHeight = this.brushImage.height;

    canvas.width = srcWidth * this.dpr;
    canvas.height = srcHeight * this.dpr;
    canvas.style.width = `${srcWidth}px`;
    canvas.style.height = `${srcHeight}px`;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.scale(this.dpr, this.dpr);

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(this.brushImage, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = this.brushColor;
    ctx.fillRect(0, 0, srcWidth, srcHeight);
    ctx.globalCompositeOperation = "source-over";

    this.tintedBrush = canvas;
  }

  changeColor(color: string): void {
    this.brushColor = color;
    this.updateTintedBrush();
  }

  changeOpacity(value: number): void {
    this.opacity = value;
  }

  changeSize(size: number): void {
    this.brushSize = size;
  }

  setDeleteMode(mode: boolean): void {
    if (mode) {
      this.brushColor = "#000000";
      this.updateTintedBrush();
    }
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  isLoaded(): boolean {
    return this.brushLoaded;
  }

  startStroke(point: Point): void {
    this.lastPoint = point;
    this.drawingPoints = [point];
  }

  continueStroke(point: Point): void {
    if (!this.lastPoint) return;

    const interpolated = interpolatePoints(
      this.lastPoint,
      point,
      this.interval
    );
    this.drawingPoints.push(...interpolated);
    this.lastPoint = point;
  }

  endStroke(): Point[] {
    const points = [...this.drawingPoints];
    this.drawingPoints = [];
    this.lastPoint = null;
    return points;
  }

  getCurrentPoints(): Point[] {
    return [...this.drawingPoints];
  }

  renderToCanvas(
    canvas: HTMLCanvasElement,
    points: Point[],
    scale: number = 1,
    opacityOverride?: number
  ): void {
    if (!this.tintedBrush || !this.brushLoaded) return;

    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.globalAlpha = opacityOverride !== undefined ? opacityOverride : this.opacity;

    ctx.imageSmoothingEnabled = false;

    points.forEach((point) => {
      const size = Math.round(this.brushSize / scale);
      const x = Math.round(point.x - size / 2);
      const y = Math.round(point.y - size / 2);
      ctx.drawImage(this.tintedBrush!, x, y, size, size);
    });

    ctx.restore();
  }

  renderStrokeShape(points: Point[], scale: number = 1): Konva.Shape {
    const tintedBrush = this.tintedBrush;
    const brushLoaded = this.brushLoaded;
    const opacity = this.opacity;
    const brushSize = this.brushSize;

    return new Konva.Shape({
      sceneFunc: (context) => {
        if (!tintedBrush || !brushLoaded) return;

        context.save();
        context.globalAlpha = opacity;
        context.imageSmoothingEnabled = false;

        points.forEach((point) => {
          const size = Math.round(brushSize / scale);
          const x = Math.round(point.x - size / 2);
          const y = Math.round(point.y - size / 2);
          context.drawImage(tintedBrush!, x, y, size, size);
        });

        context.restore();
      },
      listening: false,
    });
  }

  createCursorShape(x: number, y: number, scale: number = 1): Konva.Circle {
    return new Konva.Circle({
      x,
      y,
      radius: this.brushSize / scale / 2,
      fill: "rgba(255, 255, 255, 0.6)",
      listening: false,
      name: "brushCursor",
    });
  }
}
