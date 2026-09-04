import type { MotifPrimitive } from "../theme/subjects";
import { SILHOUETTES, sampleSilhouette, type SubjectFigure } from "./silhouettes";

/**
 * A single point in a subject's abstract underlying shape -- a place on the
 * canvas plus a suggested hue, size, and (for directional painters) heading.
 * These are handed to the *current painter's own* stroke renderer, so the
 * same "horizon" motif comes out as a Rothko color-field band, a row of
 * Monet broken-color dabs, or a line of Van Gogh impasto, never as its own
 * separate representational drawing code.
 */
export interface MotifMark {
  x: number;
  y: number;
  heading?: number;
  hue: number;
  amplitude: number;
  onset: boolean;
}

type Generator = (
  width: number,
  height: number,
  rand: () => number,
  warmth: number,
) => MotifMark[];

const horizon: Generator = (width, height, rand) => {
  const y = height * (0.52 + (rand() - 0.5) * 0.04);
  const marks: MotifMark[] = [];
  const count = 11;
  for (let i = 0; i < count; i++) {
    const x = width * ((i + 0.5) / count) + (rand() - 0.5) * width * 0.02;
    marks.push({
      x,
      y: y + (rand() - 0.5) * height * 0.015,
      heading: 0,
      hue: 35,
      amplitude: 0.45,
      onset: i % 4 === 0,
    });
  }
  return marks;
};

const waves: Generator = (width, height, rand) => {
  const marks: MotifMark[] = [];
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const y = height * (0.62 + r * 0.09);
    const count = 9;
    for (let i = 0; i < count; i++) {
      const x = width * ((i + 0.5) / count) + (rand() - 0.5) * width * 0.02;
      marks.push({
        x,
        y: y + Math.sin(i * 1.3 + r) * height * 0.01,
        heading: Math.sin(i + r) * 0.3,
        hue: 200,
        amplitude: 0.35,
        onset: false,
      });
    }
  }
  return marks;
};

const peaks: Generator = (width, height, rand) => {
  const marks: MotifMark[] = [];
  const count = 9;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= count; i++) {
    const x = width * (i / count);
    const y = height * (0.42 + (i % 2 === 0 ? -1 : 1) * (0.06 + rand() * 0.08));
    points.push({ x, y });
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    marks.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      heading: Math.atan2(b.y - a.y, b.x - a.x),
      hue: 215,
      amplitude: 0.5,
      onset: i % 3 === 0,
    });
  }
  return marks;
};

const verticals: Generator = (width, height, rand) => {
  const marks: MotifMark[] = [];
  const baseline = height * 0.78;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const x = width * (0.08 + (i / (count - 1)) * 0.84) + (rand() - 0.5) * width * 0.03;
    const h = height * (0.15 + rand() * 0.25);
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      marks.push({
        x,
        y: baseline - (h * (s + 1)) / steps,
        heading: -Math.PI / 2,
        hue: 120,
        amplitude: 0.4,
        onset: s === steps - 1,
      });
    }
  }
  return marks;
};

const canopy: Generator = (width, height, rand) => {
  const marks: MotifMark[] = [];
  const clusters = 4;
  for (let c = 0; c < clusters; c++) {
    const cx = width * (0.12 + (c / (clusters - 1)) * 0.76);
    const cy = height * (0.22 + rand() * 0.12);
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const r = rand() * width * 0.05;
      marks.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.6,
        hue: 115,
        amplitude: 0.4,
        onset: i === 0,
      });
    }
  }
  return marks;
};

const grid: Generator = (width, height, rand) => {
  const marks: MotifMark[] = [];
  const cols = 6;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      marks.push({
        x: width * ((c + 0.5) / cols),
        y: height * (0.35 + (r / rows) * 0.45),
        heading: (r + c) % 2 === 0 ? 0 : Math.PI / 2,
        hue: 30,
        amplitude: 0.35,
        onset: rand() < 0.15,
      });
    }
  }
  return marks;
};

const disc: Generator = (width, height, _rand, warmth) => {
  const marks: MotifMark[] = [];
  const cx = width * 0.76;
  const cy = height * 0.24;
  const r = Math.min(width, height) * 0.07;
  const count = 14;
  const hue = warmth >= 0 ? 45 : 225; // warm sun vs. cool moon
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    marks.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      heading: a + Math.PI / 2,
      hue,
      amplitude: 0.55,
      onset: i % 3 === 0,
    });
  }
  marks.push({ x: cx, y: cy, hue, amplitude: 0.7, onset: true });
  return marks;
};

const spiral: Generator = (width, height, _rand) => {
  const marks: MotifMark[] = [];
  const cx = width * 0.5;
  const cy = height * 0.42;
  const turns = 2.5;
  const count = 26;
  const maxR = Math.min(width, height) * 0.4;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 * turns;
    const r = t * maxR;
    marks.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      heading: angle + Math.PI / 2,
      hue: 235,
      amplitude: 0.4 + t * 0.2,
      onset: i % 5 === 0,
    });
  }
  return marks;
};

// "field" is intentionally a no-op shape -- an open meadow/desert/snowfield
// has no strong silhouette, so it only ever registers via matchedSubjects
// and motifStrength, not an explicit mark set.
const field: Generator = () => [];

const GENERATORS: Partial<Record<MotifPrimitive, Generator>> = {
  horizon,
  waves,
  peaks,
  verticals,
  canopy,
  grid,
  disc,
  spiral,
  field,
};

/** A base hue per figure -- the same role `hue` plays for the landscape
 * primitives above, tuned to each subject's natural coloring before the
 * selected painter's own palette pulls it toward their signature range. */
const FIGURE_HUES: Record<SubjectFigure, number> = {
  person: 25,
  cat: 35,
  dog: 30,
  bird: 200,
  tree: 120,
  house: 15,
  flower: 330,
  boat: 205,
  car: 0,
  star: 50,
  heart: 350,
};

/** A literal subject silhouette (person, cat, tree, ...) sampled into
 * marks -- one per outline edge (so directional painters like Van Gogh
 * trace its contour), plus a scattering of interior fill points. Unlike
 * the landscape primitives above, this is geometry-driven rather than
 * hand-authored point-by-point, since a growing library of figures would
 * otherwise mean hand-placing dozens of points per new subject. */
function figureMarks(
  figure: SubjectFigure,
  width: number,
  height: number,
  rand: () => number,
): MotifMark[] {
  const silhouette = SILHOUETTES[figure];
  const cx = width * (0.3 + rand() * 0.4);
  const cy = height * (0.35 + rand() * 0.25);
  // A subject should read as a clear, contained shape -- not swallow the
  // whole canvas. The design space's parts (a cat's tail, a bird's wing)
  // can extend noticeably past the nominal -50..50 box, so `scale` here
  // is tuned down from a naive "half the canvas" guess to keep the actual
  // rendered extent to roughly a quarter to a third of the canvas.
  const scale = Math.min(width, height) * (0.2 + rand() * 0.1);
  const baseHue = FIGURE_HUES[figure];
  const points = sampleSilhouette(silhouette, cx, cy, scale, rand, 100);

  return points.map((p, i) => ({
    x: p.x,
    y: p.y,
    heading: p.heading,
    hue: baseHue + (p.partIndex % 3) * 8 - 8,
    // Deliberately small -- most painters' stroke size scales with
    // amplitude (Picasso's polygons alone can span 20-130px), so at a
    // "normal" amplitude a handful of strokes are as big as the whole
    // silhouette and swallow its shape entirely. Fine, low-amplitude
    // marks are what let hundreds of small strokes still read as a
    // recognizable outline rather than a few oversized blobs.
    amplitude: 0.04 + rand() * 0.11,
    onset: i % 9 === 0,
  }));
}

export function generateMotifMarks(
  primitives: MotifPrimitive[],
  width: number,
  height: number,
  rand: () => number,
  warmth: number,
): MotifMark[] {
  const marks: MotifMark[] = [];
  for (const p of primitives) {
    const generator = GENERATORS[p];
    if (generator) {
      marks.push(...generator(width, height, rand, warmth));
    } else {
      marks.push(...figureMarks(p as SubjectFigure, width, height, rand));
    }
  }
  return marks;
}
