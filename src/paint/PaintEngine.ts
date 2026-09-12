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
  STRIPE_STYLES,
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

// Focal-family styles are interchangeable for a rhythmic accent stroke --
// each is gestural enough that a stray stroke in another's technique still
// reads as emphasis rather than a jarring style break (currently just de
// Kooning, so this is a no-op until a second focal-family painter exists --
// see the `others.length` guard where this is used). Pollock is deliberately
// excluded: his all-over action-painting technique never varied within a
// canvas, so a rhythmic passage should still look like Pollock, just bolder
// (handled below), never like a de Kooning slash breaking into the middle
// of a drip painting.
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

/** The canvas element's on-screen (CSS) size stays whatever App.tsx passes
 * in -- every composition calculation below is expressed in that "logical"
 * size, via `this.logicalWidth`/`this.logicalHeight`, so none of it needs to
 * change here. The actual backing pixel buffer is set several times larger
 * (see the constructor), which is what makes both live rendering and a
 * gallery-saved PNG (`toDataURL` reads that same backing store) sharp
 * rather than capped at a fairly low fixed raster. */
const RESOLUTION_SCALE = 3;

interface RothkoBand {
  yStart: number;
  yEnd: number;
  hue: number | null;
}

interface LouisStripe {
  xStart: number;
  xEnd: number;
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
  private logicalWidth: number;
  private logicalHeight: number;
  private cursor: ArmCursor;
  private focal: ArmCursor;
  private nextFocalShiftAt = 5;
  private roamHeading: number;
  private flowHeading: number;
  private flowCurl = 0;
  private gridRow = 0;
  private gridX: number;
  private rothkoBands: RothkoBand[] = [];
  private louisStripes: LouisStripe[] = [];
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

    // Capture the element's current (CSS/logical) size before resizing its
    // backing store, then scale the drawing context to match -- everything
    // from here on draws in logical coordinates as before, but lands on a
    // RESOLUTION_SCALE-times-denser pixel buffer.
    this.logicalWidth = opts.canvas.width;
    this.logicalHeight = opts.canvas.height;
    opts.canvas.width = this.logicalWidth * RESOLUTION_SCALE;
    opts.canvas.height = this.logicalHeight * RESOLUTION_SCALE;
    this.ctx.scale(RESOLUTION_SCALE, RESOLUTION_SCALE);

    this.cursor = { x: this.logicalWidth / 2, y: this.logicalHeight / 2 };
    this.focal = { ...this.cursor };
    this.rand = mulberry32(Date.now());
    this.roamHeading = this.rand() * Math.PI * 2;
    this.flowHeading = this.rand() * Math.PI * 2;
    this.gridX = this.logicalWidth * 0.02;
    this.onNoteRendered = opts.onNoteRendered;
  }

  setStyle(styleId: PaintStyleId) {
    this.styleId = styleId;
    this.rothkoBands = [];
    this.louisStripes = [];
    // The all-over family's technique explicitly has no fixed subject area
    // (see ALL_OVER_STYLES) -- drop any subject bias picked up under a
    // previous style so switching to an all-over style mid-piece stays
    // true to that.
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
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    this.ctx.restore();
    this.cursor = { x: this.logicalWidth / 2, y: this.logicalHeight / 2 };
    this.focal = { ...this.cursor };
    this.nextFocalShiftAt = 5;
    this.roamHeading = this.rand() * Math.PI * 2;
    this.flowHeading = this.rand() * Math.PI * 2;
    this.flowCurl = 0;
    this.gridRow = 0;
    this.gridX = this.logicalWidth * 0.02;
    this.rothkoBands = [];
    this.louisStripes = [];
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

  /** The focal family (currently just de Kooning): develop a handful of
   * focal "subject" areas across a wide grid, rather than scanning
   * uniformly -- so a full track ends up visiting most of the canvas while
   * still building up compositions around areas of interest. */
  private retargetFocal() {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const xFifths = [0.12, 0.3, 0.5, 0.7, 0.88];
    const yThirds = [0.18, 0.5, 0.82];
    this.focal = {
      x: width * xFifths[Math.floor(this.rand() * xFifths.length)],
      y: height * yThirds[Math.floor(this.rand() * yThirds.length)],
    };
  }

  private updateFocalCursor(frequency: number, energyFast: number, elapsed: number) {
    const width = this.logicalWidth;
    const height = this.logicalHeight;

    if (elapsed >= this.nextFocalShiftAt) {
      this.retargetFocal();
      this.nextFocalShiftAt = elapsed + 4 + this.rand() * 3;
    }

    // de Kooning attacks a focal area unpredictably rather than tracing the
    // melody smoothly and holding one column steady -- without this, a
    // rising or falling melodic line combined with a nearly-fixed x reads
    // as a straight (near-vertical or diagonal) line of marks, not the
    // scattered violence of the Woman paintings. (This is currently
    // equivalent to FOCAL_STYLES.includes(this.styleId) since de Kooning is
    // the only focal-family style, but kept as an explicit flag in case a
    // calmer, more deliberate focal painter is added later.)
    const isGestural = this.styleId === "dekooning";

    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      const pitchY = height * (1 - norm) * 0.85 + height * 0.075;
      // Weighted toward the focal area (not just raw pitch) so a track with
      // a narrow vocal/lead range still ends up using the full canvas
      // height as the focal point relocates, rather than pinning to one band.
      const targetY = pitchY * 0.45 + this.focal.y * 0.55;
      this.cursor.y += (targetY - this.cursor.y) * (isGestural ? 0.14 : 0.22);
    } else {
      this.cursor.y += (this.focal.y - this.cursor.y) * 0.08 + (this.rand() - 0.5) * 10;
    }

    const spread = (0.07 + energyFast * 0.3) * (0.7 + this.theme.turbulence * 0.6);
    this.cursor.x += (this.focal.x - this.cursor.x) * 0.07 + (this.rand() - 0.5) * width * spread;

    if (isGestural) {
      // A guaranteed baseline scatter on both axes, on top of the above --
      // not just scaling the existing jitter (which can shrink to near
      // nothing in a quiet passage), so placement stays unpredictable
      // regardless of the music's energy.
      this.cursor.x += (this.rand() - 0.5) * width * 0.22;
      this.cursor.y += (this.rand() - 0.5) * height * 0.16;
    }

    const biased = this.biasTowardMotif(this.cursor.x, this.cursor.y, this.theme.motifStrength * 0.08);
    this.cursor.x = clamp(biased.x, width * 0.03, width * 0.97);
    this.cursor.y = clamp(biased.y, height * 0.03, height * 0.97);
  }

  /** The all-over family (Pollock, Kandinsky): a continuous gestural sweep
   * that roams and bounces across the *entire* canvas -- true all-over
   * composition, no fixed subject area. Shared by both since it's a
   * placement mechanic, not a look -- what each style actually draws at
   * the cursor differs completely (see renderStroke). */
  private updateRoamCursor(
    frequency: number,
    amplitude: number,
    stepScale: number,
    turnScale: number,
  ) {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const turbulence = this.theme.turbulence;

    // The arm never traces one smoothly bending path -- each mark lands via
    // its own fresh directional impulse, not gradual heading drift alone,
    // which would trace long, straight-ish bounces off the canvas edges
    // once many marks are laid end to end. An occasional sharp, large turn
    // -- on top of the gradual drift, not instead of it -- is what breaks
    // that up into real chaos.
    if (this.rand() < 0.16) {
      this.roamHeading += (this.rand() - 0.5) * Math.PI * 1.7;
    } else {
      this.roamHeading += (this.rand() - 0.5) * (0.4 + turbulence * 1.1) * turnScale;
    }
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      this.roamHeading += (norm - 0.5) * 0.08;
    }

    // A subject's shape keeps quietly reasserting itself over a full roam
    // (empty for all-over styles -- see setStyle -- so this is a no-op
    // there). A pure post-hoc position nudge is too weak against this
    // heading's own random drift, so steer the heading itself toward the
    // nearest anchor
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

    // Step length varies far more than amplitude alone would give -- a
    // short shuffle or a long fling, rand()*rand() skewing toward the
    // shorter end with an occasional much longer reach, rather than a
    // fairly narrow band around one typical size every time.
    const stepVariance = 0.35 + this.rand() * this.rand() * 2.4;
    const step = (14 + amplitude * 90) * stepScale * stepVariance;
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
    const width = this.logicalWidth;
    const height = this.logicalHeight;
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
    const width = this.logicalWidth;
    const height = this.logicalHeight;
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
    const width = this.logicalWidth;
    const height = this.logicalHeight;
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
    const height = this.logicalHeight;
    // Adjacent bands overlap by a few percent of height, rather than
    // leaving a hard-edged gap between them -- each band's own paint
    // already tapers to near-nothing at its true top/bottom (see
    // renderRothkoField), so where two bands' soft edges share this
    // overlap zone their colors layer into a genuine gradient blend
    // instead of meeting at a visible seam.
    const bounds: Array<[number, number]> = [
      [0.04, 0.37],
      [0.31, 0.69],
      [0.63, 0.96],
    ];
    this.rothkoBands = bounds.map(([a, b]) => ({
      yStart: height * a,
      yEnd: height * b,
      hue: null,
    }));
  }

  private updateRothkoCursor(frequency: number): RothkoBand {
    this.ensureRothkoBands();
    const width = this.logicalWidth;
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
    const width = this.logicalWidth;
    const height = this.logicalHeight;
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
   * phase-aware focal family (de Kooning) and the all-over family
   * (Pollock, Kandinsky). */
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
      band.hue = this.pickDistinctBandHue(band, rawColor.hue);
    } else if (this.rand() < 0.035) {
      // Rarely, the field shifts to a new dominant color -- a mood change.
      band.hue = this.pickDistinctBandHue(band, rawColor.hue);
    }
    const hue = (band.hue + (this.rand() - 0.5) * 10 + 360) % 360;
    const sat = clamp(rawColor.saturation + (this.rand() - 0.5) * 10, 0, 100);
    const light = clamp(rawColor.lightness + (this.rand() - 0.5) * 6, 10, 90);

    const bandHeight = band.yEnd - band.yStart;
    const w = this.logicalWidth * (0.28 + this.rand() * 0.4 + note.amplitude * 0.15);
    const h = bandHeight * (0.35 + this.rand() * 0.35 + note.amplitude * 0.15);
    const alpha = 0.05 + note.amplitude * 0.05;

    // Real Rothko fields don't hold flat color right up to a hard edge --
    // they glow softest near their own top and bottom and dissolve into
    // whatever's next door as a genuine gradient, not a hard cutoff or a
    // visible seam. A wide vertical alpha taper across the band's own true
    // bounds gives every fill that soft edge; since neighboring bands'
    // ranges deliberately overlap a little (see ensureRothkoBands), each
    // side's faint tail paints into that shared zone and the two colors
    // physically layer into a blend there, rather than meeting at a line.
    const core = `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, ${alpha.toFixed(3)})`;
    const edge = `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, 0)`;
    const grad = this.ctx.createLinearGradient(0, band.yStart, 0, band.yEnd);
    grad.addColorStop(0, edge);
    grad.addColorStop(0.35, core);
    grad.addColorStop(0.65, core);
    grad.addColorStop(1, edge);

    this.ctx.save();
    this.ctx.filter = "blur(20px)";
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(this.cursor.x - w / 2, this.cursor.y - h / 2, w, h);
    this.ctx.restore();
  }

  /** Nudge a freshly-picked band hue away from whatever the other Rothko
   * bands already show, so a piece doesn't end up with two or three fields
   * reading as nearly the same color just because the audio's pitch content
   * happened to cluster together -- real multi-band Rothkos read as
   * distinct colors stacked, not shades of the same one. */
  private pickDistinctBandHue(band: RothkoBand, candidate: number): number {
    let hue = candidate;
    for (const other of this.rothkoBands) {
      if (other === band || other.hue === null) continue;
      const dist = Math.abs(hueDistanceSigned(hue, other.hue));
      if (dist < 45) {
        hue = (other.hue + 130 + this.rand() * 40) % 360;
      }
    }
    return hue;
  }

  /** Louis: canvas divided into several narrow, closely-spaced vertical
   * stripes, each its own persistent poured color; pitch register selects
   * which stripe a note feeds, and the cursor lands anywhere along that
   * stripe's full height. The real "Stripe" paintings run many thin bands
   * of flat, confident color close together with only a thin sliver of bare
   * canvas between them -- narrower than the stripes themselves, not the
   * wide gaps Rothko's fields get. */
  private ensureLouisStripes() {
    if (this.louisStripes.length) return;
    const width = this.logicalWidth;
    const count = 9;
    const margin = 0.08;
    const gap = 0.012;
    const usable = 1 - margin * 2 - gap * (count - 1);
    const span = usable / count;
    const bounds: Array<[number, number]> = [];
    for (let i = 0; i < count; i++) {
      const a = margin + i * (span + gap);
      bounds.push([a, a + span]);
    }
    this.louisStripes = bounds.map(([a, b]) => ({
      xStart: width * a,
      xEnd: width * b,
      hue: null,
    }));
  }

  private updateLouisCursor(frequency: number): LouisStripe {
    this.ensureLouisStripes();
    const height = this.logicalHeight;
    const count = this.louisStripes.length;
    let index = Math.floor(count / 2);
    if (frequency > 0) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const norm = clamp((midi - 40) / 60, 0, 1);
      index = clamp(Math.floor(norm * count), 0, count - 1);
    }
    const stripe = this.louisStripes[index];
    this.cursor.x = stripe.xStart + this.rand() * (stripe.xEnd - stripe.xStart);
    this.cursor.y = height * (0.04 + this.rand() * 0.92);
    return stripe;
  }

  /** Louis's poured "Veils" read as soft, translucent washes rather than
   * flat confident pigment -- thinned acrylic soaking into raw, unprimed
   * canvas and spreading wet-into-wet, so a stripe's color never stops in
   * a clean line at its own boundary. Each mark is wider than the
   * stripe's own lane and faded at both edges via a gradient, so it pools
   * across the gap and visibly bleeds into whichever stripe sits next
   * door -- overlapping washes from neighboring stripes optically blend
   * into a genuinely new in-between color, the way real watercolor does. */
  private renderLouisStripe(note: NoteEvent, stripe: LouisStripe, rawColor: NoteColor) {
    if (stripe.hue === null) {
      stripe.hue = this.pickDistinctStripeHue(stripe, rawColor.hue);
    } else if (this.rand() < 0.03) {
      // Rarely, the stripe shifts to a new dominant color -- a mood change.
      stripe.hue = this.pickDistinctStripeHue(stripe, rawColor.hue);
    }
    const hue = (stripe.hue + (this.rand() - 0.5) * 6 + 360) % 360;
    // Watercolor washes read as translucent, not as flat opaque pigment --
    // pull saturation in a little and keep alpha modest (below) rather
    // than the confident, near-opaque fill the old "Stripes" look used.
    const sat = clamp(rawColor.saturation - 8, 35, 75);
    const light = clamp(rawColor.lightness + (this.rand() - 0.5) * 6, 34, 58);

    const stripeWidth = stripe.xEnd - stripe.xStart;
    const cx = stripe.xStart + stripeWidth / 2 + (this.rand() - 0.5) * stripeWidth * 0.2;
    const w = stripeWidth * (1.4 + this.rand() * 1.1);
    const h = this.logicalHeight * (0.14 + this.rand() * 0.18 + note.amplitude * 0.06);
    const peakAlpha = 0.18 + note.amplitude * 0.2;

    const left = cx - w / 2;
    const right = cx + w / 2;
    const core = `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, ${peakAlpha.toFixed(3)})`;
    const edge = `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, 0)`;
    const grad = this.ctx.createLinearGradient(left, 0, right, 0);
    grad.addColorStop(0, edge);
    grad.addColorStop(0.28, core);
    grad.addColorStop(0.72, core);
    grad.addColorStop(1, edge);

    this.ctx.save();
    this.ctx.filter = "blur(8px)";
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(left, this.cursor.y - h / 2, w, h);
    this.ctx.restore();
  }

  /** Nudge a freshly-picked stripe hue away from whatever the other Louis
   * stripes already show, so the piece reads as several distinct colors run
   * side by side rather than the same hue repeating down the canvas. With
   * up to nine stripes sharing a handful of palette anchors, a single
   * one-shot nudge can still land back near a third, unrelated stripe --
   * so this retries against the *whole* set each time until a genuinely
   * open hue turns up (or attempts run out). */
  private pickDistinctStripeHue(stripe: LouisStripe, candidate: number): number {
    let hue = candidate;
    for (let attempt = 0; attempt < 8; attempt++) {
      const collides = this.louisStripes.some(
        (other) => other !== stripe && other.hue !== null && Math.abs(hueDistanceSigned(hue, other.hue)) < 30,
      );
      if (!collides) break;
      hue = (hue + 40 + this.rand() * 280) % 360;
    }
    return hue;
  }

  /** A subject read from the title/lyrics (e.g. "seaside" -> horizon +
   * waves) gets blocked in once, early in the piece, in the current
   * painter's own hand -- the same points handed to Rothko become a color-
   * field band, to Marden a length of flowing line, to Schiele an isolated
   * angular contour.
   * This only ever lays a loose underlying composition; the music-driven
   * painting in paintNote continues over it exactly as before. The
   * all-over family's technique explicitly rejects a fixed subject (see
   * ALL_OVER_STYLES), so it's skipped there on purpose -- the subject
   * still leans the palette via the existing warmth/hueRotation channels,
   * just never an explicit shape. */
  private paintMotifUnderlay() {
    if (this.motifPainted) return;
    this.motifPainted = true;
    if (ALL_OVER_STYLES.includes(this.styleId)) return;

    const { motifs, motifStrength, warmth } = this.theme;
    if (!motifs.length || motifStrength <= 0) return;

    let marks = generateMotifMarks(motifs, this.logicalWidth, this.logicalHeight, this.rand, warmth);
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
    const isStripe = STRIPE_STYLES.includes(this.styleId);
    if (isStripe) this.ensureLouisStripes();
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
      } else if (isStripe) {
        const stripe =
          this.louisStripes.find((s) => mark.x >= s.xStart && mark.x <= s.xEnd) ??
          this.louisStripes[Math.floor(this.louisStripes.length / 2)];
        this.renderLouisStripe(note, stripe, color);
      } else {
        renderStroke(this.styleId, {
          ctx: this.ctx,
          width: this.logicalWidth,
          height: this.logicalHeight,
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
    const isStripe = STRIPE_STYLES.includes(this.styleId);
    const isGrid = GRID_STYLES.includes(this.styleId);
    const isFlow = FLOW_STYLES.includes(this.styleId);
    const isSparse = SPARSE_STYLES.includes(this.styleId);
    // Schiele: skip most notes entirely so marks stay few and well-separated
    // across the canvas, rather than accumulating into continuous coverage.
    const sparseSkip = isSparse && !(note.isOnset || this.rand() < 0.15);

    let rothkoBand: RothkoBand | null = null;
    let louisStripe: LouisStripe | null = null;
    if (!sparseSkip) {
      if (isAllOver) {
        this.updateRoamCursor(note.frequency, note.amplitude, 1, 1);
      } else if (isField) {
        rothkoBand = this.updateRothkoCursor(note.frequency);
      } else if (isStripe) {
        louisStripe = this.updateLouisCursor(note.frequency);
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
      } else if (isStripe && louisStripe) {
        this.renderLouisStripe(note, louisStripe, color);
      } else if (isGrid || isFlow || isSparse) {
        // These families always paint in their own technique, regardless of
        // musical phase -- that's how those painters actually worked.
        renderStroke(this.styleId, {
          ctx: this.ctx,
          width: this.logicalWidth,
          height: this.logicalHeight,
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
          // An occasional accent in another focal style's brush technique,
          // for emphasis. The all-over family never participates -- see
          // ACCENT_STYLES.
          // (No-op while FOCAL_STYLES has only one member -- kept general in
          // case a second focal-family painter is added later.)
          const others = ACCENT_STYLES.filter((s) => s !== this.styleId);
          if (others.length > 0) {
            renderStyle = others[Math.floor(this.rand() * others.length)];
          }
        }

        const boosted =
          phrase.phase === "rhythmic"
            ? { ...note, amplitude: Math.min(1, note.amplitude * 1.35) }
            : note;

        renderStroke(renderStyle, {
          ctx: this.ctx,
          width: this.logicalWidth,
          height: this.logicalHeight,
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

function hueDistanceSigned(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
