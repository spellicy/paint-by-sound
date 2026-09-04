import type { NoteEvent } from "../audio/analyzer";
import { frequencyToNoteColor, type NoteColor } from "../audio/pitchColor";
import { PhraseTracker, type PaintPhase } from "../audio/phraseTracker";
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

const ACCENT_STYLES: PaintStyleId[] = ["kandinsky", "klee", "pollock", "picasso"];

export interface PaintEngineOptions {
  canvas: HTMLCanvasElement;
  styleId: PaintStyleId;
  onNoteRendered?: (color: NoteColor, note: NoteEvent, phase: PaintPhase) => void;
}

export class PaintEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private cursor: ArmCursor;
  private focal: ArmCursor;
  private nextFocalShiftAt = 6;
  private rand: () => number;
  private phraseTracker = new PhraseTracker();
  private lastWashAt = -Infinity;
  private lastMelodic: { x: number; y: number; time: number } | null = null;
  styleId: PaintStyleId;
  private onNoteRendered?: (color: NoteColor, note: NoteEvent, phase: PaintPhase) => void;

  constructor(opts: PaintEngineOptions) {
    this.canvas = opts.canvas;
    const ctx = opts.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.styleId = opts.styleId;
    this.cursor = { x: opts.canvas.width / 2, y: opts.canvas.height / 2 };
    this.focal = { ...this.cursor };
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
    this.focal = { ...this.cursor };
    this.nextFocalShiftAt = 6;
    this.phraseTracker.reset();
    this.lastWashAt = -Infinity;
    this.lastMelodic = null;
  }

  /** Pick a new focal "subject" area to develop, loosely rule-of-thirds. */
  private retargetFocal() {
    const { width, height } = this.canvas;
    const xThirds = [0.22, 0.5, 0.78];
    const yThirds = [0.3, 0.5, 0.7];
    this.focal = {
      x: width * xThirds[Math.floor(this.rand() * xThirds.length)],
      y: height * yThirds[Math.floor(this.rand() * yThirds.length)],
    };
  }

  /**
   * Move the simulated arm. Pitch still drives vertical placement, but the
   * cursor is otherwise drawn back toward a slowly-relocating focal "subject"
   * area instead of scanning the canvas uniformly -- strokes build up a
   * composition around evolving areas of interest rather than scattering
   * evenly. Louder passages range further from that center; quiet ones stay
   * tight, so the composition visibly breathes with the music's dynamics.
   */
  private updateCursor(frequency: number, energyFast: number, elapsed: number) {
    const { width, height } = this.canvas;

    if (elapsed >= this.nextFocalShiftAt) {
      this.retargetFocal();
      this.nextFocalShiftAt = elapsed + 7 + this.rand() * 6;
    }

    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1); // roughly E2..E7
      const pitchY = height * (1 - norm) * 0.85 + height * 0.075;
      const targetY = pitchY * 0.6 + this.focal.y * 0.4;
      this.cursor.y += (targetY - this.cursor.y) * 0.22;
    } else {
      this.cursor.y += (this.focal.y - this.cursor.y) * 0.05 + (this.rand() - 0.5) * 8;
    }

    const spread = 0.05 + energyFast * 0.22;
    this.cursor.x += (this.focal.x - this.cursor.x) * 0.06 + (this.rand() - 0.5) * width * spread;

    this.cursor.x = clamp(this.cursor.x, width * 0.04, width * 0.96);
    this.cursor.y = clamp(this.cursor.y, height * 0.04, height * 0.96);
  }

  /** A soft, translucent gradient sweep -- an underpainting wash laid down
   * before detail, and revisited on major dynamic shifts. */
  private renderWash(elapsed: number, color: NoteColor) {
    const { width, height } = this.canvas;
    const angle = this.rand() * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const grad = this.ctx.createLinearGradient(
      width / 2 - dx * width,
      height / 2 - dy * height,
      width / 2 + dx * width,
      height / 2 + dy * height,
    );
    grad.addColorStop(0, color.rgba(0.1));
    grad.addColorStop(0.55, color.rgba(0.04));
    grad.addColorStop(
      1,
      `hsla(${(color.hue + 50) % 360}, ${color.saturation.toFixed(0)}%, ${color.lightness.toFixed(0)}%, 0.08)`,
    );

    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
    this.lastWashAt = elapsed;
  }

  /** Sustained, tonal passages are drawn as one continuous flowing line
   * tracing the melodic contour, rather than a stamp per note -- painting
   * reacting to the melody instead of to each isolated note. */
  private renderMelodicSegment(note: NoteEvent, color: NoteColor) {
    const width = 1 + note.amplitude * 5;
    if (this.lastMelodic && note.time - this.lastMelodic.time < 0.7) {
      const midX = (this.lastMelodic.x + this.cursor.x) / 2;
      const midY = (this.lastMelodic.y + this.cursor.y) / 2;
      this.ctx.save();
      this.ctx.strokeStyle = color.rgba(0.55);
      this.ctx.lineWidth = width;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastMelodic.x, this.lastMelodic.y);
      this.ctx.quadraticCurveTo(this.lastMelodic.x, this.lastMelodic.y, midX, midY);
      this.ctx.lineTo(this.cursor.x, this.cursor.y);
      this.ctx.stroke();
      this.ctx.restore();
    }
    this.lastMelodic = { x: this.cursor.x, y: this.cursor.y, time: note.time };
  }

  paintNote(note: NoteEvent) {
    const phrase = this.phraseTracker.update(note);
    this.updateCursor(note.frequency, phrase.energyFast, phrase.elapsed);

    // Slow palette drift over the piece, plus per-stroke jitter, so hues
    // vary continuously instead of the same note always painting identically.
    const drift = Math.sin(phrase.elapsed * 0.015) * 18;
    const jitter = (this.rand() - 0.5) * 10;
    const color = frequencyToNoteColor(
      note.frequency > 0 ? note.frequency : 220,
      note.amplitude,
      note.brightness,
      drift + jitter,
    );

    const dueForWash =
      phrase.phase === "wash" ||
      (phrase.sectionChange && phrase.elapsed - this.lastWashAt > 4);
    if (dueForWash && phrase.elapsed - this.lastWashAt > 1.8) {
      this.renderWash(phrase.elapsed, color);
    }

    if (phrase.phase === "melodic") {
      this.renderMelodicSegment(note, color);
    } else {
      this.lastMelodic = null;

      let renderStyle = this.styleId;
      if (phrase.phase === "rhythmic" && note.isOnset && this.rand() < 0.22) {
        // An occasional accent in a different brush technique, for emphasis.
        const others = ACCENT_STYLES.filter((s) => s !== this.styleId);
        renderStyle = others[Math.floor(this.rand() * others.length)];
      }

      const boosted =
        phrase.phase === "rhythmic"
          ? { ...note, amplitude: Math.min(1, note.amplitude * 1.35) }
          : note;

      renderStroke(renderStyle, {
        ctx: this.ctx,
        width: this.canvas.width,
        height: this.canvas.height,
        cursor: this.cursor,
        note: boosted,
        color,
        rand: this.rand,
      });
    }

    this.onNoteRendered?.(color, note, phrase.phase);
  }

  toDataURL(): string {
    return this.canvas.toDataURL("image/png");
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
