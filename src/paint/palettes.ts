import type { NoteColor } from "../audio/pitchColor";
import type { KeyEstimate } from "../audio/keyDetector";
import type { ThemeInfluence } from "../theme/themeAnalyzer";
import type { PaintStyleId } from "./types";

const NEUTRAL_KEY: KeyEstimate = { mode: null, tonic: null, confidence: 0 };

/**
 * Each painter worked with a limited, characteristic palette -- Rothko's
 * handful of deep, luminous field colors; Kline's near-total black and
 * white; Kelly's pure saturated flats. This is the opposite of one full-
 * saturation rainbow hue wheel applied uniformly to every style, which is
 * what made every painting look the same neon regardless of who was
 * "painting."
 *
 * `signatureHues` are the anchor colors of that painter's world; `huePull`
 * (0..1) is how strongly a note's raw pitch-hue gets pulled toward the
 * nearest anchor -- high for painters who worked in a tight palette
 * (Rothko, Marden), lower for painters whose color ranged more widely
 * (Pollock's material-driven earth tones, de Kooning's heated mix).
 */
interface PalettePreset {
  signatureHues: number[];
  huePull: number;
  saturation: [number, number];
  lightness: [number, number];
}

const PALETTES: Record<PaintStyleId, PalettePreset> = {
  rothko: {
    // Deep maroon, burnt orange, plum, mustard, near-black red -- luminous
    // through layering, not through raw brightness.
    signatureHues: [8, 28, 300, 48, 355],
    huePull: 0.8,
    saturation: [40, 72],
    lightness: [18, 42],
  },
  pollock: {
    // Earthy umber and sienna with a rare cadmium-red accent; mostly
    // desaturated and dark, the way enamel and house paint reads.
    signatureHues: [32, 8],
    huePull: 0.2,
    saturation: [12, 55],
    lightness: [14, 50],
  },
  dekooning: {
    // Flesh pink, cadmium red and yellow against black and white -- the
    // hot, agitated palette of the Woman paintings.
    signatureHues: [350, 20, 50],
    huePull: 0.35,
    saturation: [35, 75],
    lightness: [30, 68],
  },
  kline: {
    // Almost pure black and white -- hue barely matters once saturation
    // is pinned this low, which is the point.
    signatureHues: [0],
    huePull: 0.1,
    saturation: [0, 4],
    lightness: [6, 94],
  },
  kelly: {
    // Pure saturated primaries and secondaries -- red, orange, yellow,
    // green, blue -- flat and confident, no muddying.
    signatureHues: [5, 30, 50, 140, 220],
    huePull: 0.65,
    saturation: [65, 95],
    lightness: [40, 65],
  },
  martin: {
    // Pale tan, pale blue, pale pink -- barely-there washes behind a fine
    // graphite grid.
    signatureHues: [45, 200, 340],
    huePull: 0.5,
    saturation: [5, 20],
    lightness: [75, 92],
  },
  marden: {
    // Muted ochre, sage, and slate -- restrained, near-monochrome per
    // piece, the color-field lineage carried into minimalism.
    signatureHues: [30, 150, 200],
    huePull: 0.85,
    saturation: [20, 45],
    lightness: [30, 60],
  },
};

function hueDistanceSigned(from: number, to: number): number {
  let d = ((to - from + 540) % 360) - 180;
  return d;
}

function nearestSignatureHue(hue: number, signatureHues: number[]): number {
  let best = signatureHues[0];
  let bestDist = Infinity;
  for (const h of signatureHues) {
    const d = Math.abs(hueDistanceSigned(hue, h));
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  return best;
}

const WARM_ANCHOR = 25; // red-gold
const COOL_ANCHOR = 218; // blue

/**
 * Apply a painter's characteristic palette (and the track's thematic
 * warmth/luminosity) to a raw, pitch-derived color. This is what keeps
 * each style visually distinct and keeps colors from reading as one
 * uniform neon rainbow regardless of who's "painting."
 *
 * `key` is the live major/minor estimate (`src/audio/keyDetector.ts`) --
 * major leans the whole palette brighter and a touch more saturated, minor
 * leans it darker and more muted, the same emotional shorthand major/minor
 * already carries for composers and listeners, confidence-scaled so an
 * ambiguous or just-started piece barely shifts. **de Kooning** gets one
 * further step: on minor-key material, his hot flesh/red/yellow palette
 * eases toward black-and-white as confidence climbs -- evoking the stark
 * black enamel paintings he turned to in the late 1940s -- while major-key
 * pieces keep his usual heated coloring.
 */
export function stylizeColor(
  raw: NoteColor,
  styleId: PaintStyleId,
  theme: ThemeInfluence,
  key: KeyEstimate = NEUTRAL_KEY,
): NoteColor {
  const preset = PALETTES[styleId];

  // Pull the raw hue toward the painter's nearest signature anchor.
  const anchor = nearestSignatureHue(raw.hue, preset.signatureHues);
  let hue = raw.hue + hueDistanceSigned(raw.hue, anchor) * preset.huePull;

  // Nudge warm/cold based on the track's theme (title/lyrics), independent
  // of the palette pull above so a "cold" title still cools a warm palette.
  if (theme.warmth !== 0) {
    const target = theme.warmth > 0 ? WARM_ANCHOR : COOL_ANCHOR;
    hue += hueDistanceSigned(hue, target) * Math.min(0.5, Math.abs(theme.warmth) * 0.5);
  }
  hue = (hue + 360) % 360;

  const [satMin, satMax] = preset.saturation;
  let saturation = clamp(
    satMin + (raw.saturation / 100) * (satMax - satMin),
    satMin,
    satMax,
  );

  const [litMin, litMax] = preset.lightness;
  let lightness = clamp(
    litMin + (raw.lightness / 100) * (litMax - litMin),
    litMin,
    litMax,
  );
  lightness = clamp(lightness + theme.luminosity * 10, 8, 92);

  if (styleId === "kline") {
    // Push lightness toward the near-black/near-white extremes rather than
    // the continuous mid-gray a straight linear map would give -- Kline's
    // canvases read as stark black-on-white, not soft gray.
    const [klMin, klMax] = preset.lightness;
    const t = clamp((lightness - klMin) / (klMax - klMin), 0, 1);
    const contrasted = t < 0.5 ? 0.5 * (2 * t) ** 1.8 : 1 - 0.5 * (2 * (1 - t)) ** 1.8;
    lightness = klMin + contrasted * (klMax - klMin);
  }

  if (key.mode === "major") {
    lightness = clamp(lightness + key.confidence * 9, 6, 94);
    saturation = clamp(saturation + key.confidence * 7, 0, 100);
  } else if (key.mode === "minor") {
    lightness = clamp(lightness - key.confidence * 9, 6, 94);
    saturation = clamp(saturation - key.confidence * 6, 0, 100);

    if (styleId === "dekooning") {
      // Ease toward grayscale as confidence in a minor key firms up,
      // rather than snapping the moment it crosses a threshold.
      const bw = clamp((key.confidence - 0.3) / 0.5, 0, 1);
      saturation = saturation * (1 - bw) + 3 * bw;
    }
  }

  return {
    ...raw,
    hue,
    saturation,
    lightness,
    rgb: `hsl(${hue.toFixed(1)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`,
    rgba: (alpha: number) =>
      `hsla(${hue.toFixed(1)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%, ${alpha})`,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
