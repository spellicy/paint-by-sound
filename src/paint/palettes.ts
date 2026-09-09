import type { NoteColor } from "../audio/pitchColor";
import type { KeyEstimate } from "../audio/keyDetector";
import type { ThemeInfluence } from "../theme/themeAnalyzer";
import type { PaintStyleId } from "./types";

const NEUTRAL_KEY: KeyEstimate = { mode: null, tonic: null, confidence: 0 };

/**
 * Each painter worked with a limited, characteristic palette -- Rothko's
 * handful of deep, luminous field colors; Schiele's muted earth and flesh
 * tones; Louis's full spectrum of pure, vivid stain colors. This is the
 * opposite of one full-saturation rainbow hue wheel applied uniformly to
 * every style, which is what made every painting look the same neon
 * regardless of who was "painting."
 *
 * `signatureHues` are the anchor colors of that painter's world; `huePull`
 * (0..1) is how strongly a note's raw pitch-hue gets pulled toward the
 * nearest anchor -- high for painters who worked in a tight palette
 * (Rothko), lower for painters whose color ranges freely with the note's
 * own pitch and mood (Pollock, Marden) or across a wide fixed spread
 * (Martin's twelve-hue wheel).
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
    // A wide-open range rather than the historical enamel-and-earth
    // palette -- hue tracks the note's own pitch almost freely (low
    // huePull, anchors spread clear around the wheel) and saturation/
    // lightness stretch from near-black shadow to fully vivid, so louder
    // and brighter notes read as a dramatic swing rather than a variation
    // on the same muted umber.
    signatureHues: [0, 45, 90, 150, 200, 260, 300],
    huePull: 0.18,
    saturation: [12, 96],
    lightness: [6, 88],
  },
  dekooning: {
    // Flesh pink, cadmium red and yellow -- tightly clustered warm
    // anchors, dominant but not absolute: a moderate pull leaves whatever
    // a note's raw pitch-hue doesn't share with that warm cluster
    // showing through as leftover cool clash (blue, green), rather than
    // handing an entire zone of the wheel over to one dedicated accent
    // anchor, which read as far too much cyan/blue in practice.
    signatureHues: [350, 20, 50],
    huePull: 0.45,
    saturation: [40, 80],
    lightness: [28, 68],
  },
  schiele: {
    // Burnt red-orange, ochre, and a sickly olive green -- muted and
    // restrained rather than vivid, punctuated by rich reds and earthy
    // browns against a mostly bare, pale ground.
    signatureHues: [15, 35, 90],
    huePull: 0.55,
    saturation: [20, 50],
    lightness: [26, 64],
  },
  louis: {
    // The stain paintings drew on the full spectrum of pure, transparent
    // acrylic hues -- cadmium red, orange, cadmium yellow, viridian,
    // ultramarine, violet -- run vivid and side by side, never muted or
    // earthy the way Pollock's or Schiele's palettes are.
    signatureHues: [5, 30, 55, 140, 210, 265, 320],
    huePull: 0.6,
    saturation: [58, 85],
    lightness: [40, 58],
  },
  martin: {
    // Barely-there pale washes behind a fine graphite grid, but drawn from
    // a full twelve-anchor wheel (one per pitch class) rather than just
    // three -- her lines stay quiet and pale, but which quiet pale hue a
    // given row lands on ranges much further than tan/blue/pink alone.
    signatureHues: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    huePull: 0.5,
    saturation: [5, 20],
    lightness: [75, 92],
  },
  marden: {
    // A gentle hue pull rather than the near-monochrome lock of before --
    // low huePull lets each stroke wander much further from the three
    // anchors, so the color drifts loosely across a piece instead of
    // settling on essentially one fixed hue.
    signatureHues: [30, 90, 150, 200, 260, 320],
    huePull: 0.28,
    saturation: [18, 62],
    lightness: [22, 68],
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
