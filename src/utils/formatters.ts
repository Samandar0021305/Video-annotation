export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatCoordinatesForConsole(points: number[]): void {
  console.log("=".repeat(60));
  console.log("COORDINATES");
  console.log("Total Points:", points.length / 2);
  console.log("Coordinates (flat array):", points);
  console.log("Coordinates (x,y pairs):");
  for (let i = 0; i < points.length; i += 2) {
    console.log(`  Point ${i/2 + 1}: (${points[i]}, ${points[i + 1]})`);
  }
  console.log("=".repeat(60));
}

export function logBrushStroke(
  frame: number,
  tool: "brush" | "eraser",
  color: string,
  width: number,
  points: number[],
  totalStrokesOnFrame: number
): void {
  console.log("=".repeat(60));
  console.log("BRUSH STROKE COMPLETED");
  console.log("Frame:", frame);
  console.log("Tool:", tool);
  console.log("Color:", color);
  console.log("Width:", width);
  console.log("Total Points:", points.length / 2);
  console.log("Coordinates (flat array):", points);
  console.log("Coordinates (x,y pairs):");
  for (let i = 0; i < points.length; i += 2) {
    console.log(`  Point ${i/2 + 1}: (${points[i]}, ${points[i + 1]})`);
  }
  console.log("Total strokes on this frame:", totalStrokesOnFrame);
  console.log("=".repeat(60));
}
