import type { NoteColor } from "../audio/pitchColor";
import type { NoteEvent } from "../audio/analyzer";

export type PaintStyleId =
  | "kandinsky"
  | "klee"
  | "pollock"
  | "picasso"
  | "rothko"
  | "renoir"
  | "monet";

export interface PaintStyleInfo {
  id: PaintStyleId;
  label: string;
  blurb: string;
}

export const PAINT_STYLES: PaintStyleInfo[] = [
  {
    id: "kandinsky",
    label: "Kandinsky",
    blurb: "Geometric arcs, circles and lines -- the visual concerto.",
  },
  {
    id: "klee",
    label: "Klee",
    blurb: "Small organic dabs drifting across a quiet grid.",
  },
  {
    id: "pollock",
    label: "Pollock",
    blurb: "All-over flung drips and splatter, driven by loudness.",
  },
  {
    id: "picasso",
    label: "Picasso",
    blurb: "Angular, fragmented cubist planes.",
  },
  {
    id: "rothko",
    label: "Rothko",
    blurb: "Few luminous soft-edged color fields, stacked.",
  },
  {
    id: "renoir",
    label: "Renoir",
    blurb: "Warm dappled light, full and rounded brushwork.",
  },
  {
    id: "monet",
    label: "Monet",
    blurb: "Broken color, shimmering impressionist dabs.",
  },
];

/** Style groups with fundamentally different composition strategies. */
export const ALL_OVER_STYLES: PaintStyleId[] = ["pollock"];
export const FIELD_STYLES: PaintStyleId[] = ["rothko"];
export const IMPRESSION_STYLES: PaintStyleId[] = ["monet", "renoir"];
export const FOCAL_STYLES: PaintStyleId[] = ["kandinsky", "klee", "picasso"];

/** Simulated position of the robotic arm's brush head on the canvas. */
export interface ArmCursor {
  x: number;
  y: number;
}

export interface StrokeContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  cursor: ArmCursor;
  note: NoteEvent;
  color: NoteColor;
  rand: () => number;
}

export type StyleRenderer = (s: StrokeContext) => void;
