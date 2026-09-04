import type { NoteColor } from "../audio/pitchColor";
import type { NoteEvent } from "../audio/analyzer";

export type PaintStyleId =
  | "rothko"
  | "pollock"
  | "dekooning"
  | "kline"
  | "kelly"
  | "martin"
  | "marden";

export interface PaintStyleInfo {
  id: PaintStyleId;
  label: string;
  blurb: string;
}

export const PAINT_STYLES: PaintStyleInfo[] = [
  {
    id: "rothko",
    label: "Rothko",
    blurb: "Few luminous soft-edged color fields, stacked.",
  },
  {
    id: "pollock",
    label: "Pollock",
    blurb: "All-over flung drips and splatter, driven by loudness.",
  },
  {
    id: "dekooning",
    label: "de Kooning",
    blurb: "Violent, slashing figurative gesture -- emotion over form.",
  },
  {
    id: "kline",
    label: "Kline",
    blurb: "Bold black-and-white architectural gestural bars.",
  },
  {
    id: "kelly",
    label: "Kelly",
    blurb: "Clean, hard-edged flat color forms.",
  },
  {
    id: "martin",
    label: "Martin",
    blurb: "Quiet, meditative pencil-fine grids.",
  },
  {
    id: "marden",
    label: "Marden",
    blurb: "Sinuous monochrome line, color-field minimalism.",
  },
];

/** Style groups with fundamentally different composition strategies. */
export const ALL_OVER_STYLES: PaintStyleId[] = ["pollock"];
export const FIELD_STYLES: PaintStyleId[] = ["rothko"];
export const FOCAL_STYLES: PaintStyleId[] = ["dekooning", "kelly"];
export const SPARSE_STYLES: PaintStyleId[] = ["kline"];
export const GRID_STYLES: PaintStyleId[] = ["martin"];
export const FLOW_STYLES: PaintStyleId[] = ["marden"];

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
   * follows the arm's movement (e.g. Marden's flowing line). Undefined for
   * styles that don't move directionally. */
  heading?: number;
}

export type StyleRenderer = (s: StrokeContext) => void;
