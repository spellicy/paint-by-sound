import type { NoteEvent } from "../audio/analyzer";
import { frequencyToNoteColor, type NoteColor } from "../audio/pitchColor";
import { renderStroke } from "./styles";
import type { ArmCursor, PaintStyleId } from "./types";

/** Seeded PRNG (mulberry32) so a given track+style repaints deterministically. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PaintEngineOptions {
  canvas: HTMLCanvasElement;
  styleId: PaintStyleId;
  onNoteRendered?: (color: NoteColor, note: NoteEvent) => void;
}

export class PaintEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private cursor: ArmCursor;
  private rand: () => number;
  styleId: PaintStyleId;
  private onNoteRendered?: (color: NoteColor, note: NoteEvent) => void;

  constructor(opts: PaintEngineOptions) {
    this.canvas = opts.canvas;
    const ctx = opts.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.styleId = opts.styleId;
    this.cursor = { x: opts.canvas.width / 2, y: opts.canvas.height / 2 };
    this.rand = mulberry32(Date.now());
    this.onNoteRendered = opts.onNoteRendered;
  }

  setStyle(styleId: PaintStyleId) {
    this.styleId = styleId;
  }

  clear() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#f7f3ec";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.cursor = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
  }

  /** Move the simulated arm based on pitch (vertical) and drift (horizontal). */
  private updateCursor(frequency: number) {
    const { width, height } = this.canvas;
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1); // roughly E2..E7
      const targetY = height * (1 - norm) * 0.85 + height * 0.075;
      this.cursor.y += (targetY - this.cursor.y) * 0.25;
    } else {
      this.cursor.y += (this.rand() - 0.5) * 10;
    }
    this.cursor.x += (this.rand() - 0.5) * width * 0.06 + width * 0.0015;
    if (this.cursor.x < width * 0.05) this.cursor.x = width * 0.05;
    if (this.cursor.x > width * 0.95) this.cursor.x = width * 0.95;
    this.cursor.y = clamp(this.cursor.y, height * 0.05, height * 0.95);

    // Wrap horizontally once the arm reaches the right edge, like a scanning
    // gantry, so long tracks keep filling the whole canvas.
    if (this.cursor.x >= width * 0.95) {
      this.cursor.x = width * 0.05;
    }
  }

  paintNote(note: NoteEvent) {
    if (note.frequency > 0) {
      this.updateCursor(note.frequency);
    } else {
      this.updateCursor(0);
    }

    const color = frequencyToNoteColor(
      note.frequency > 0 ? note.frequency : 220,
      note.amplitude,
      note.brightness,
    );

    renderStroke(this.styleId, {
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      cursor: this.cursor,
      note,
      color,
      rand: this.rand,
    });

    this.onNoteRendered?.(color, note);
  }

  toDataURL(): string {
    return this.canvas.toDataURL("image/png");
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
