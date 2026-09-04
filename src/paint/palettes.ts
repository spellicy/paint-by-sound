import type { NoteColor } from "../audio/pitchColor";
import type { ThemeInfluence } from "../theme/themeAnalyzer";
import type { PaintStyleId } from "./types";

/**
 * Each painter worked with a limited, characteristic palette -- Rothko's
 * handful of deep, luminous field colors; Monet and Renoir's light,
 * atmospheric impressionist range; Pollock's earth tones punctuated by rare
 * accents. This is the opposite of one full-saturation rainbow hue wheel
 * applied uniformly to every style, which is what made every painting look
 * the same neon regardless of who was "painting."
 *
 * `signatureHues` are the anchor colors of that painter's world; `huePull`
 * (0..1) is how strongly a note's raw pitch-hue gets pulled toward the
 * nearest anchor -- high for painters who worked in a tight palette
 * (Rothko), lower for painters whose color came more directly from what
 * they were looking at (Pollock's material-driven earth tones).
 */
interface PalettePreset {
  signatureHues: number[];
  huePull: number;
  saturation: [number, number];
  lightness: [number, number];
}

const PALETTES: Record<PaintStyleId, PalettePreset> = {
  kandinsky: {
    // Bauhaus-era primaries and secondaries: red, gold, blue, yellow, green.
    signatureHues: [8, 45, 215, 55, 140],
    huePull: 0.35,
    saturation: [55, 88],
    lightness: [35, 60],
  },
  klee: {
    // Muted ochre, terracotta, teal, violet, olive -- whimsical but soft.
    signatureHues: [35, 15, 190, 260, 95],
    huePull: 0.4,
    saturation: [28, 55],
    lightness: [45, 68],
  },
  pollock: {
    // Earthy umber and sienna with a rare cadmium-red accent; mostly
    // desaturated and dark, the way enamel and house paint reads.
    signatureHues: [32, 8],
    huePull: 0.2,
    saturation: [12, 55],
    lightness: [14, 50],
  },
  picasso: {
    // Analytic cubism: ochre/tan, blue-grey, muted brown-red.
    signatureHues: [38, 205, 12],
    huePull: 0.45,
    saturation: [18, 45],
    lightness: [28, 55],
  },
  rothko: {
    // Deep maroon, burnt orange, plum, mustard, near-black red -- luminous
    // through layering, not through raw brightness.
    signatureHues: [8, 28, 300, 48, 355],
    huePull: 0.8,
    saturation: [40, 72],
    lightness: [18, 42],
  },
  renoir: {
    // Warm pink, peach, gold, soft green -- dappled garden-party light.
    signatureHues: [350, 28, 42, 108],
    huePull: 0.5,
    saturation: [32, 58],
    lightness: [58, 80],
  },
  monet: {
    // Soft blue, lavender, pale green, light pink, pale gold -- broken,
    // atmospheric color.
    signatureHues: [208, 275, 148, 328, 45],
    huePull: 0.45,
    saturation: [26, 52],
    lightness: [58, 82],
  },
  cezanne: {
    // Muted, structured naturalism: blues, greens, ochre, terracotta --
    // color built from observed planes, not expressive invention.
    signatureHues: [205, 140, 35, 15],
    huePull: 0.55,
    saturation: [22, 48],
    lightness: [32, 58],
  },
  dali: {
    // Warm desert sand and rust against a stark dream-sky blue -- a barren
    // palette with sharp, isolated color rather than continuous coverage.
    signatureHues: [38, 195, 15],
    huePull: 0.55,
    saturation: [30, 62],
    lightness: [30, 68],
  },
  vangogh: {
    // Bold complementary contrast -- gold/yellow against deep blue/indigo,
    // with a hot orange accent. High-key and vivid, like Starry Night.
    signatureHues: [50, 222, 25],
    huePull: 0.3,
    saturation: [55, 92],
    lightness: [35, 65],
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
 */
export function stylizeColor(
  raw: NoteColor,
  styleId: PaintStyleId,
  theme: ThemeInfluence,
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
  const saturation = clamp(
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
