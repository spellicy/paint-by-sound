import type { NoteColor } from "../audio/pitchColor";
import type { NoteEvent } from "../audio/analyzer";

export type PaintStyleId = "kandinsky" | "klee" | "pollock" | "picasso";

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
    blurb: "Flung drips and splatter, driven by loudness.",
  },
  {
    id: "picasso",
    label: "Picasso",
    blurb: "Angular, fragmented cubist planes.",
  },
];

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
