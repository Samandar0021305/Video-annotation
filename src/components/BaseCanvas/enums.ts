export const CursorStyle = {
  Default: "default",
  Pointer: "pointer",
  Crosshair: "crosshair",
  Grab: "grab",
  Grabbing: "grabbing",
  None: "none",
  Move: "move",
} as const;

export type CursorStyle = (typeof CursorStyle)[keyof typeof CursorStyle];

export const ZoomDirection = {
  In: "in",
  Out: "out",
  Reset: "reset",
} as const;

export type ZoomDirection = (typeof ZoomDirection)[keyof typeof ZoomDirection];
