import type { NoteEvent } from "../audio/analyzer";
import { frequencyToNoteColor, type NoteColor } from "../audio/pitchColor";
import { PhraseTracker, type PaintPhase } from "../audio/phraseTracker";
import { stylizeColor } from "./palettes";
import { renderStroke } from "./styles";
import {
  ALL_OVER_STYLES,
  FIELD_STYLES,
  IMPRESSION_STYLES,
  type ArmCursor,
  type PaintStyleId,
} from "./types";
import type { ThemeInfluence } from "../theme/themeAnalyzer";

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

const NEUTRAL_THEME: ThemeInfluence = {
  warmth: 0,
  luminosity: 0,
  turbulence: 0.3,
  hueRotation: 0,
  matchedWords: [],
  suggestedStyle: null,
};

interface RothkoBand {
  yStart: number;
  yEnd: number;
  hue: number | null;
}

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
  private nextFocalShiftAt = 5;
  private roamHeading: number;
  private rothkoBands: RothkoBand[] = [];
  private rand: () => number;
  private phraseTracker = new PhraseTracker();
  private lastWashAt = -Infinity;
  private lastMelodic: { x: number; y: number; time: number } | null = null;
  private theme: ThemeInfluence = NEUTRAL_THEME;
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
    this.roamHeading = this.rand() * Math.PI * 2;
    this.onNoteRendered = opts.onNoteRendered;
  }

  setStyle(styleId: PaintStyleId) {
    this.styleId = styleId;
    this.rothkoBands = [];
  }

  /** Set the track's thematic influence (from title/lyrics analysis). */
  setTheme(theme: ThemeInfluence) {
    this.theme = theme;
  }

  clear() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.filter = "none";
    this.ctx.fillStyle = "#f7f3ec";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.cursor = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    this.focal = { ...this.cursor };
    this.nextFocalShiftAt = 5;
    this.roamHeading = this.rand() * Math.PI * 2;
    this.rothkoBands = [];
    this.phraseTracker.reset();
    this.lastWashAt = -Infinity;
    this.lastMelodic = null;
  }

  // ---------------------------------------------------------------------
  // Composition: each painter family moves the simulated "arm" differently.
  // ---------------------------------------------------------------------

  /** Kandinsky / Klee / Picasso: develop a handful of focal "subject" areas
   * across a wide grid, rather than scanning uniformly -- so a full track
   * ends up visiting most of the canvas while still building up
   * compositions around areas of interest. */
  private retargetFocal() {
    const { width, height } = this.canvas;
    const xFifths = [0.12, 0.3, 0.5, 0.7, 0.88];
    const yThirds = [0.18, 0.5, 0.82];
    this.focal = {
      x: width * xFifths[Math.floor(this.rand() * xFifths.length)],
      y: height * yThirds[Math.floor(this.rand() * yThirds.length)],
    };
  }

  private updateFocalCursor(frequency: number, energyFast: number, elapsed: number) {
    const { width, height } = this.canvas;

    if (elapsed >= this.nextFocalShiftAt) {
      this.retargetFocal();
      this.nextFocalShiftAt = elapsed + 4 + this.rand() * 3;
    }

    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      const pitchY = height * (1 - norm) * 0.85 + height * 0.075;
      // Weighted toward the focal area (not just raw pitch) so a track with
      // a narrow vocal/lead range still ends up using the full canvas
      // height as the focal point relocates, rather than pinning to one band.
      const targetY = pitchY * 0.45 + this.focal.y * 0.55;
      this.cursor.y += (targetY - this.cursor.y) * 0.22;
    } else {
      this.cursor.y += (this.focal.y - this.cursor.y) * 0.08 + (this.rand() - 0.5) * 10;
    }

    const spread = (0.07 + energyFast * 0.3) * (0.7 + this.theme.turbulence * 0.6);
    this.cursor.x += (this.focal.x - this.cursor.x) * 0.07 + (this.rand() - 0.5) * width * spread;

    this.cursor.x = clamp(this.cursor.x, width * 0.03, width * 0.97);
    this.cursor.y = clamp(this.cursor.y, height * 0.03, height * 0.97);
  }

  /** Pollock: a continuous gestural sweep that roams and bounces across the
   * *entire* canvas -- true all-over composition, no fixed subject area. */
  private updateRoamCursor(
    frequency: number,
    amplitude: number,
    stepScale: number,
    turnScale: number,
  ) {
    const { width, height } = this.canvas;
    const turbulence = this.theme.turbulence;

    this.roamHeading += (this.rand() - 0.5) * (0.4 + turbulence * 1.1) * turnScale;
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      this.roamHeading += (norm - 0.5) * 0.08;
    }

    const step = (16 + amplitude * 100) * stepScale;
    let nx = this.cursor.x + Math.cos(this.roamHeading) * step;
    let ny = this.cursor.y + Math.sin(this.roamHeading) * step;

    const minX = width * 0.03;
    const maxX = width * 0.97;
    const minY = height * 0.03;
    const maxY = height * 0.97;
    if (nx < minX || nx > maxX) {
      this.roamHeading = Math.PI - this.roamHeading;
      nx = clamp(nx, minX, maxX);
    }
    if (ny < minY || ny > maxY) {
      this.roamHeading = -this.roamHeading;
      ny = clamp(ny, minY, maxY);
    }
    this.cursor.x = nx;
    this.cursor.y = ny;
  }

  /** Rothko: canvas divided into a few large horizontal fields; pitch
   * register selects which field a note belongs to, and the cursor lands
   * anywhere across that field's full width -- building a few full-bleed
   * color bands rather than one wandering brush. */
  private ensureRothkoBands() {
    if (this.rothkoBands.length) return;
    const { height } = this.canvas;
    const bounds: Array<[number, number]> = [
      [0.04, 0.32],
      [0.36, 0.64],
      [0.68, 0.96],
    ];
    this.rothkoBands = bounds.map(([a, b]) => ({
      yStart: height * a,
      yEnd: height * b,
      hue: null,
    }));
  }

  private updateRothkoCursor(frequency: number): RothkoBand {
    this.ensureRothkoBands();
    const { width } = this.canvas;
    let index = 1;
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      index = norm > 0.62 ? 0 : norm < 0.38 ? 2 : 1;
    }
    const band = this.rothkoBands[index];
    this.cursor.x = width * (0.06 + this.rand() * 0.88);
    this.cursor.y = band.yStart + this.rand() * (band.yEnd - band.yStart);
    return band;
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
   * reacting to the melody instead of to each isolated note. Used by the
   * gestural/geometric family (Kandinsky, Klee, Picasso, Pollock). */
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

  /** Rothko's soft-edged, near-monochrome field: a large blurred rectangle
   * within the note's assigned band, in that band's persistent color
   * (only lightly jittered) rather than a fresh hue per note. */
  private renderRothkoField(note: NoteEvent, band: RothkoBand, rawColor: NoteColor) {
    if (band.hue === null) {
      band.hue = rawColor.hue;
    } else if (this.rand() < 0.02) {
      // Rarely, the field shifts to a new dominant color -- a mood change.
      band.hue = rawColor.hue;
    }
    const hue = (band.hue + (this.rand() - 0.5) * 8 + 360) % 360;
    const sat = rawColor.saturation;
    const light = clamp(rawColor.lightness + (this.rand() - 0.5) * 6, 10, 90);

    const bandHeight = band.yEnd - band.yStart;
    const w = this.canvas.width * (0.28 + this.rand() * 0.4 + note.amplitude * 0.15);
    const h = bandHeight * (0.35 + this.rand() * 0.35 + note.amplitude * 0.15);

    this.ctx.save();
    this.ctx.filter = "blur(20px)";
    this.ctx.fillStyle = `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, ${(0.05 + note.amplitude * 0.05).toFixed(3)})`;
    this.ctx.fillRect(this.cursor.x - w / 2, this.cursor.y - h / 2, w, h);
    this.ctx.restore();
  }

  paintNote(note: NoteEvent) {
    const phrase = this.phraseTracker.update(note);
    const isAllOver = ALL_OVER_STYLES.includes(this.styleId);
    const isField = FIELD_STYLES.includes(this.styleId);
    const isImpression = IMPRESSION_STYLES.includes(this.styleId);

    let rothkoBand: RothkoBand | null = null;
    if (isAllOver) {
      this.updateRoamCursor(note.frequency, note.amplitude, 1, 1);
    } else if (isField) {
      rothkoBand = this.updateRothkoCursor(note.frequency);
    } else if (isImpression) {
      const stepScale = this.styleId === "monet" ? 0.32 : 0.4;
      this.updateRoamCursor(note.frequency, note.amplitude, stepScale, 1.9);
    } else {
      this.updateFocalCursor(note.frequency, phrase.energyFast, phrase.elapsed);
    }

    // Slow palette drift over the piece, plus per-stroke jitter and the
    // track's thematic hue rotation, so hues vary continuously instead of
    // the same note always painting identically.
    const drift = Math.sin(phrase.elapsed * 0.015) * 18;
    const jitter = (this.rand() - 0.5) * 10;
    const rawColor = frequencyToNoteColor(
      note.frequency > 0 ? note.frequency : 220,
      note.amplitude,
      note.brightness,
      drift + jitter + this.theme.hueRotation * 0.4,
    );
    const color = stylizeColor(rawColor, this.styleId, this.theme);

    const dueForWash =
      phrase.phase === "wash" ||
      (phrase.sectionChange && phrase.elapsed - this.lastWashAt > 4);
    if (dueForWash && phrase.elapsed - this.lastWashAt > 1.8) {
      this.renderWash(phrase.elapsed, color);
    }

    if (isField && rothkoBand) {
      this.renderRothkoField(note, rothkoBand, color);
    } else if (isImpression) {
      renderStroke(this.styleId, {
        ctx: this.ctx,
        width: this.canvas.width,
        height: this.canvas.height,
        cursor: this.cursor,
        note,
        color,
        rand: this.rand,
      });
    } else if (phrase.phase === "melodic") {
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
