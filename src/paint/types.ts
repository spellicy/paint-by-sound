import type { NoteColor } from "../audio/pitchColor";
import type { NoteEvent } from "../audio/analyzer";

export type PaintStyleId =
  | "kandinsky"
  | "klee"
  | "pollock"
  | "picasso"
  | "rothko"
  | "renoir"
  | "monet"
  | "cezanne"
  | "dali"
  | "vangogh";

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
  {
    id: "cezanne",
    label: "Cézanne",
    blurb: "Constructive hatched planes, geometric and faceted.",
  },
  {
    id: "dali",
    label: "Dalí",
    blurb: "Sparse, precise, melting surrealist forms.",
  },
  {
    id: "vangogh",
    label: "Van Gogh",
    blurb: "Thick impasto, swirling directional brushwork.",
  },
];

/** Style groups with fundamentally different composition strategies. */
export const ALL_OVER_STYLES: PaintStyleId[] = ["pollock"];
export const FIELD_STYLES: PaintStyleId[] = ["rothko"];
export const IMPRESSION_STYLES: PaintStyleId[] = ["monet", "renoir"];
export const FOCAL_STYLES: PaintStyleId[] = ["kandinsky", "klee", "picasso", "cezanne"];
export const SWIRL_STYLES: PaintStyleId[] = ["vangogh"];
export const SPARSE_STYLES: PaintStyleId[] = ["dali"];

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
  /** Current direction of travel (radians), for styles whose brushwork
   * follows the arm's movement (e.g. Van Gogh's swirl). Undefined for
   * styles that don't move directionally. */
  heading?: number;
}

export type StyleRenderer = (s: StrokeContext) => void;
