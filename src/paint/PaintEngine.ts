import type { NoteEvent } from "../audio/analyzer";
import type { KeyEstimate } from "../audio/keyDetector";
import { frequencyToNoteColor, type NoteColor } from "../audio/pitchColor";
import { PhraseTracker, type PaintPhase } from "../audio/phraseTracker";
import { stylizeColor } from "./palettes";
import { renderStroke } from "./styles";
import { generateMotifMarks } from "./motifs";
import {
  ALL_OVER_STYLES,
  FIELD_STYLES,
  FLOW_STYLES,
  FOCAL_STYLES,
  GRID_STYLES,
  SPARSE_STYLES,
  type ArmCursor,
  type PaintStyleId,
} from "./types";
import type { ThemeInfluence } from "../theme/themeAnalyzer";

/** A subject-motif mark carries its own explicit hue rather than one derived
 * from a detected pitch, so it needs a hand-built NoteColor rather than one
 * from `frequencyToNoteColor`. `pitchClass`/`noteName`/`octave` are unused by
 * the renderers and palette code that consume it -- only hue/saturation/
 * lightness/rgb/rgba matter -- so they're filled with harmless placeholders. */
function makeRawColor(hue: number, saturation: number, lightness: number): NoteColor {
  return {
    pitchClass: 0,
    noteName: "C",
    octave: 4,
    hue,
    saturation,
    lightness,
    rgb: `hsl(${hue.toFixed(1)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`,
    rgba: (alpha: number) =>
      `hsla(${hue.toFixed(1)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%, ${alpha})`,
  };
}

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

// The focal-family styles are interchangeable for a rhythmic accent stroke
// -- both are gestural enough that a stray stroke in the other's technique
// still reads as emphasis rather than a jarring style break. Pollock is
// deliberately excluded: his all-over action-painting technique never
// varied within a canvas, so a rhythmic passage should still look like
// Pollock, just bolder (handled below), never like a hard-edged Kelly
// block or a de Kooning slash breaking into the middle of a drip painting.
const ACCENT_STYLES: PaintStyleId[] = FOCAL_STYLES;

const NEUTRAL_THEME: ThemeInfluence = {
  warmth: 0,
  luminosity: 0,
  turbulence: 0.3,
  hueRotation: 0,
  matchedWords: [],
  suggestedStyle: null,
  motifs: [],
  motifStrength: 0,
  matchedSubjects: [],
};

const NEUTRAL_KEY: KeyEstimate = { mode: null, tonic: null, confidence: 0 };

const GRID_ROWS = 34;

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
  private flowHeading: number;
  private flowCurl = 0;
  private gridRow = 0;
  private gridX: number;
  private rothkoBands: RothkoBand[] = [];
  private rand: () => number;
  private phraseTracker = new PhraseTracker();
  private lastWashAt = -Infinity;
  private lastMelodic: { x: number; y: number; time: number } | null = null;
  private motifPainted = false;
  private motifAnchors: { x: number; y: number }[] = [];
  private theme: ThemeInfluence = NEUTRAL_THEME;
  private keyEstimate: KeyEstimate = NEUTRAL_KEY;
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
    this.flowHeading = this.rand() * Math.PI * 2;
    this.gridX = opts.canvas.width * 0.02;
    this.onNoteRendered = opts.onNoteRendered;
  }

  setStyle(styleId: PaintStyleId) {
    this.styleId = styleId;
    this.rothkoBands = [];
    // Pollock's all-over technique explicitly has no fixed subject area
    // (see ALL_OVER_STYLES) -- drop any subject bias picked up under a
    // previous style so switching to Pollock mid-piece stays true to that.
    if (ALL_OVER_STYLES.includes(styleId)) this.motifAnchors = [];
  }

  /** Set the track's thematic influence (from title/lyrics analysis). */
  setTheme(theme: ThemeInfluence) {
    this.theme = theme;
  }

  /** Set the live major/minor key estimate (from the audio itself, updated
   * continuously as the piece plays -- see `keyDetector.ts`). */
  setKeyEstimate(key: KeyEstimate) {
    this.keyEstimate = key;
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
    this.flowHeading = this.rand() * Math.PI * 2;
    this.flowCurl = 0;
    this.gridRow = 0;
    this.gridX = this.canvas.width * 0.02;
    this.rothkoBands = [];
    this.phraseTracker.reset();
    this.lastWashAt = -Infinity;
    this.lastMelodic = null;
    this.motifPainted = false;
    this.motifAnchors = [];
    this.keyEstimate = NEUTRAL_KEY;
  }

  private nearestMotifAnchor(x: number, y: number): { x: number; y: number } | null {
    if (!this.motifAnchors.length) return null;
    let best = this.motifAnchors[0];
    let bestDist = Infinity;
    for (const a of this.motifAnchors) {
      const d = (a.x - x) ** 2 + (a.y - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }

  /** Nudge a candidate position toward the nearest subject-motif anchor, so
   * the shape a subject implies keeps quietly reasserting itself over a
   * full piece instead of only showing at the very start, before it gets
   * painted over by everything that follows. `weight` 0 leaves the point
   * untouched; both callers scale it by the theme's motifStrength so an
   * unnamed or weakly-matched subject barely nudges anything. */
  private biasTowardMotif(x: number, y: number, weight: number): { x: number; y: number } {
    const best = this.nearestMotifAnchor(x, y);
    if (!best || weight <= 0) return { x, y };
    return { x: x + (best.x - x) * weight, y: y + (best.y - y) * weight };
  }

  // ---------------------------------------------------------------------
  // Composition: each painter family moves the simulated "arm" differently.
  // ---------------------------------------------------------------------

  /** de Kooning / Kelly: develop a handful of focal "subject" areas across
   * a wide grid, rather than scanning uniformly -- so a full track ends up
   * visiting most of the canvas while still building up compositions
   * around areas of interest. */
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

    const biased = this.biasTowardMotif(this.cursor.x, this.cursor.y, this.theme.motifStrength * 0.08);
    this.cursor.x = clamp(biased.x, width * 0.03, width * 0.97);
    this.cursor.y = clamp(biased.y, height * 0.03, height * 0.97);
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

    // A subject's shape keeps quietly reasserting itself over a full roam
    // (empty for Pollock -- see setStyle -- so this is a no-op there). A
    // pure post-hoc position nudge is too weak against this heading's own
    // random drift, so steer the heading itself toward the nearest anchor
    // -- a gentle "gravity" on direction that still leaves plenty of room
    // for the random walk, rather than snapping the resulting position.
    const target = this.nearestMotifAnchor(this.cursor.x, this.cursor.y);
    if (target) {
      const desired = Math.atan2(target.y - this.cursor.y, target.x - this.cursor.x);
      const diff = Math.atan2(
        Math.sin(desired - this.roamHeading),
        Math.cos(desired - this.roamHeading),
      );
      this.roamHeading += diff * this.theme.motifStrength * 0.22;
    }

    const step = (16 + amplitude * 100) * stepScale;
    let nx = this.cursor.x + Math.cos(this.roamHeading) * step;
    let ny = this.cursor.y + Math.sin(this.roamHeading) * step;

    const biased = this.biasTowardMotif(nx, ny, this.theme.motifStrength * 0.2);
    nx = biased.x;
    ny = biased.y;

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

  /** Martin: a fine, hand-ruled grid built up row by row at a slow,
   * unvarying pace -- the arm sweeps steadily left to right along one row,
   * wraps to the next when it reaches the edge, and barely deviates in
   * speed or spacing regardless of the music's energy. Meditative
   * repetition, not reaction. */
  private updateGridCursor(amplitude: number) {
    const { width, height } = this.canvas;
    const step = width * (0.012 + amplitude * 0.01);
    this.gridX += step;
    if (this.gridX > width * 0.98) {
      this.gridX = width * 0.02;
      this.gridRow = (this.gridRow + 1) % GRID_ROWS;
    }
    const rowY = height * (0.04 + (this.gridRow / (GRID_ROWS - 1)) * 0.92);

    // A very light touch -- her grids don't bend toward a subject, but a
    // faint pull keeps a named subject's silhouette barely present as a
    // shift in which rows read slightly warmer or cooler.
    const biased = this.biasTowardMotif(this.gridX, rowY, this.theme.motifStrength * 0.05);
    this.cursor.x = biased.x;
    this.cursor.y = rowY + (biased.y - rowY) * 0.25 + (this.rand() - 0.5) * 1.5;
  }

  /** Marden: a continuous, unhurried curling sweep -- like Pollock's roam
   * but with a slowly, gently drifting curl instead of sharp random turns,
   * and edges that ease the line back toward center instead of bouncing --
   * producing the long, sinuous single-line loops of his later work rather
   * than a jagged or energetic path. */
  private updateFlowCursor(frequency: number, amplitude: number) {
    const { width, height } = this.canvas;
    const turbulence = this.theme.turbulence;

    this.flowCurl = clamp(
      this.flowCurl + (this.rand() - 0.5) * 0.011 * (1 + turbulence),
      -0.2,
      0.2,
    );
    this.flowHeading += this.flowCurl;
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      this.flowHeading += (norm - 0.5) * 0.02;
    }

    const step = 5 + amplitude * 16;
    let nx = this.cursor.x + Math.cos(this.flowHeading) * step;
    let ny = this.cursor.y + Math.sin(this.flowHeading) * step;

    // A light touch here -- too strong a pull fights the curl and breaks
    // the loops up into jagged corrections instead of coherent curves.
    const biased = this.biasTowardMotif(nx, ny, this.theme.motifStrength * 0.04);
    nx = biased.x;
    ny = biased.y;

    const minX = width * 0.05;
    const maxX = width * 0.95;
    const minY = height * 0.05;
    const maxY = height * 0.95;
    if (nx < minX || nx > maxX || ny < minY || ny > maxY) {
      // Ease the heading back toward the canvas center rather than a hard
      // bounce, which would read as a jagged, violent reversal -- the
      // curve keeps flowing instead of snapping.
      const cx = width / 2;
      const cy = height / 2;
      const toCenter = Math.atan2(cy - ny, cx - nx);
      this.flowHeading = toCenter + (this.rand() - 0.5) * 0.3;
      this.flowCurl *= 0.4;
      nx = clamp(nx, minX, maxX);
      ny = clamp(ny, minY, maxY);
    }
    this.cursor.x = nx;
    this.cursor.y = ny;
  }

  /** Schiele: the arm jumps to a new, well-separated position across a
   * mostly empty canvas -- a handful of isolated figures against bare
   * ground rather than continuous coverage. Combined with paintNote's
   * onset-only gating, this keeps the composition sparse over a full
   * track. */
  private updateSparseCursor() {
    const { width, height } = this.canvas;
    // A named subject still reads as only a few, well-separated marks, not
    // continuous coverage -- so instead of a continuous positional bias
    // (which would fight the "jump to a new spot" character), occasionally
    // let one of those few bars land squarely on the subject's shape.
    if (this.motifAnchors.length && this.rand() < this.theme.motifStrength * 0.6) {
      const a = this.motifAnchors[Math.floor(this.rand() * this.motifAnchors.length)];
      this.cursor = {
        x: clamp(a.x + (this.rand() - 0.5) * width * 0.06, width * 0.02, width * 0.98),
        y: clamp(a.y + (this.rand() - 0.5) * height * 0.06, height * 0.02, height * 0.98),
      };
      return;
    }
    const groundLevel = this.rand() < 0.25;
    this.cursor = {
      x: width * (0.08 + this.rand() * 0.84),
      y: groundLevel
        ? height * (0.62 + this.rand() * 0.32)
        : height * (0.08 + this.rand() * 0.58),
    };
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
   * phase-aware focal family (de Kooning, Kelly) and Pollock. */
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

  /** A subject read from the title/lyrics (e.g. "seaside" -> horizon +
   * waves) gets blocked in once, early in the piece, in the current
   * painter's own hand -- the same points handed to Rothko become a color-
   * field band, to Marden a length of flowing line, to Schiele an isolated
   * angular contour.
   * This only ever lays a loose underlying composition; the music-driven
   * painting in paintNote continues over it exactly as before. Pollock's
   * all-over technique explicitly rejects a fixed subject (see
   * ALL_OVER_STYLES), so it's skipped there on purpose -- the subject
   * still leans the palette via the existing warmth/hueRotation channels,
   * just never an explicit shape. */
  private paintMotifUnderlay() {
    if (this.motifPainted) return;
    this.motifPainted = true;
    if (ALL_OVER_STYLES.includes(this.styleId)) return;

    const { motifs, motifStrength, warmth } = this.theme;
    if (!motifs.length || motifStrength <= 0) return;

    let marks = generateMotifMarks(motifs, this.canvas.width, this.canvas.height, this.rand, warmth);
    // The full point cloud (before any thinning below) is what later
    // cursor updates gently bias toward, so the shape keeps reasserting
    // itself over the whole piece instead of only at the very start.
    this.motifAnchors = marks.map((m) => ({ x: m.x, y: m.y }));
    if (SPARSE_STYLES.includes(this.styleId)) {
      // Schiele: a subject still reads as only a few, isolated marks
      // against bare ground, never continuous coverage -- thin the mark set to
      // match.
      marks = marks.filter((_, i) => i % 4 === 0);
    }

    const isField = FIELD_STYLES.includes(this.styleId);
    if (isField) this.ensureRothkoBands();
    const isFlow = FLOW_STYLES.includes(this.styleId);

    for (const mark of marks) {
      const rawColor = makeRawColor(
        (mark.hue + (this.rand() - 0.5) * 10 + 360) % 360,
        48 + this.rand() * 12,
        45 + this.rand() * 10,
      );
      const color = stylizeColor(rawColor, this.styleId, this.theme, this.keyEstimate);
      const amplitude = Math.min(1, mark.amplitude * (0.6 + motifStrength * 0.5));
      const note: NoteEvent = { time: 0, frequency: 0, amplitude, brightness: 0.5, isOnset: mark.onset };
      this.cursor.x = mark.x;
      this.cursor.y = mark.y;

      if (isField) {
        const band =
          this.rothkoBands.find((b) => mark.y >= b.yStart && mark.y <= b.yEnd) ??
          this.rothkoBands[1];
        this.renderRothkoField(note, band, color);
      } else {
        renderStroke(this.styleId, {
          ctx: this.ctx,
          width: this.canvas.width,
          height: this.canvas.height,
          cursor: this.cursor,
          note,
          color,
          rand: this.rand,
          heading: isFlow ? (mark.heading ?? this.flowHeading) : mark.heading,
        });
      }
    }
  }

  paintNote(note: NoteEvent) {
    const phrase = this.phraseTracker.update(note);
    const isAllOver = ALL_OVER_STYLES.includes(this.styleId);
    const isField = FIELD_STYLES.includes(this.styleId);
    const isGrid = GRID_STYLES.includes(this.styleId);
    const isFlow = FLOW_STYLES.includes(this.styleId);
    const isSparse = SPARSE_STYLES.includes(this.styleId);
    // Schiele: skip most notes entirely so marks stay few and well-separated
    // across the canvas, rather than accumulating into continuous coverage.
    const sparseSkip = isSparse && !(note.isOnset || this.rand() < 0.15);

    let rothkoBand: RothkoBand | null = null;
    if (!sparseSkip) {
      if (isAllOver) {
        this.updateRoamCursor(note.frequency, note.amplitude, 1, 1);
      } else if (isField) {
        rothkoBand = this.updateRothkoCursor(note.frequency);
      } else if (isGrid) {
        this.updateGridCursor(note.amplitude);
      } else if (isFlow) {
        this.updateFlowCursor(note.frequency, note.amplitude);
      } else if (isSparse) {
        this.updateSparseCursor();
      } else {
        this.updateFocalCursor(note.frequency, phrase.energyFast, phrase.elapsed);
      }
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
    const color = stylizeColor(rawColor, this.styleId, this.theme, this.keyEstimate);

    const dueForWash =
      phrase.phase === "wash" ||
      (phrase.sectionChange && phrase.elapsed - this.lastWashAt > 4);
    if (dueForWash && phrase.elapsed - this.lastWashAt > 1.8) {
      this.renderWash(phrase.elapsed, color);
    }
    if (phrase.phase === "wash") {
      this.paintMotifUnderlay();
    }

    if (!sparseSkip) {
      if (isField && rothkoBand) {
        this.renderRothkoField(note, rothkoBand, color);
      } else if (isGrid || isFlow || isSparse) {
        // These families always paint in their own technique, regardless of
        // musical phase -- that's how those painters actually worked.
        renderStroke(this.styleId, {
          ctx: this.ctx,
          width: this.canvas.width,
          height: this.canvas.height,
          cursor: this.cursor,
          note,
          color,
          rand: this.rand,
          heading: isFlow ? this.flowHeading : undefined,
        });
      } else if (phrase.phase === "melodic") {
        this.renderMelodicSegment(note, color);
      } else {
        this.lastMelodic = null;

        let renderStyle = this.styleId;
        if (
          FOCAL_STYLES.includes(this.styleId) &&
          phrase.phase === "rhythmic" &&
          note.isOnset &&
          this.rand() < 0.22
        ) {
          // An occasional accent in the other focal style's brush technique,
          // for emphasis. Pollock never participates -- see ACCENT_STYLES.
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
