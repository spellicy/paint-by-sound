import type { NoteColor } from "../audio/pitchColor";
import type { NoteEvent } from "../audio/analyzer";

export type PaintStyleId =
  | "rothko"
  | "pollock"
  | "dekooning"
  | "schiele"
  | "louis"
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
    id: "schiele",
    label: "Schiele",
    blurb: "Nervous angular contours, raw color hugging the line.",
  },
  {
    id: "louis",
    label: "Morris Louis",
    blurb: "Vibrant poured color, in parallel vertical stripes.",
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
export const FOCAL_STYLES: PaintStyleId[] = ["dekooning"];
export const SPARSE_STYLES: PaintStyleId[] = ["schiele"];
export const GRID_STYLES: PaintStyleId[] = ["martin"];
export const FLOW_STYLES: PaintStyleId[] = ["marden"];
/** Louis: parallel vertical color stripes, persistent across the piece --
 * structurally similar to Rothko's horizontal fields (see FIELD_STYLES) but
 * a distinct family since the geometry, palette, and edge technique differ. */
export const STRIPE_STYLES: PaintStyleId[] = ["louis"];

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
