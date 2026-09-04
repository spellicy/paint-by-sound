/**
 * A small, curated mood lexicon used to read inspiration out of a track's
 * title or key lyrics -- the same way a painter might read a poem or a
 * place-name before ever picking up a brush. Everything here runs locally;
 * there's no server, no API call, just word association.
 *
 * Each entry nudges:
 *  - warmth:    -1 (cold, blue/violet) .. 1 (warm, red/gold)
 *  - luminosity: -1 (dark, shadowed) .. 1 (bright, luminous)
 *  - turbulence: 0 (calm, still) .. 1 (agitated, stormy)
 *  - style:     an optional gentle hint toward a painter whose sensibility
 *               the word evokes (never forces a switch -- see themeAnalyzer)
 */
import type { PaintStyleId } from "../paint/types";

export interface LexiconEntry {
  warmth: number;
  luminosity: number;
  turbulence: number;
  style?: PaintStyleId;
}

export const MOOD_LEXICON: Record<string, LexiconEntry> = {
  // Storm / turbulence / conflict
  storm: { warmth: -0.3, luminosity: -0.5, turbulence: 0.9, style: "pollock" },
  thunder: { warmth: -0.2, luminosity: -0.6, turbulence: 1, style: "pollock" },
  rain: { warmth: -0.4, luminosity: -0.2, turbulence: 0.5, style: "monet" },
  fire: { warmth: 1, luminosity: 0.3, turbulence: 0.8, style: "pollock" },
  burn: { warmth: 0.9, luminosity: 0.1, turbulence: 0.7 },
  war: { warmth: -0.2, luminosity: -0.6, turbulence: 1, style: "picasso" },
  chaos: { warmth: 0, luminosity: -0.3, turbulence: 1, style: "pollock" },
  wild: { warmth: 0.3, luminosity: 0.1, turbulence: 0.9, style: "pollock" },
  rage: { warmth: 0.6, luminosity: -0.4, turbulence: 1, style: "pollock" },
  scream: { warmth: -0.1, luminosity: -0.5, turbulence: 0.9, style: "picasso" },
  broken: { warmth: -0.2, luminosity: -0.4, turbulence: 0.8, style: "picasso" },
  shatter: { warmth: -0.1, luminosity: -0.2, turbulence: 0.9, style: "picasso" },
  machine: { warmth: -0.3, luminosity: -0.2, turbulence: 0.6, style: "picasso" },
  riot: { warmth: 0.3, luminosity: -0.3, turbulence: 1, style: "pollock" },

  // Calm / stillness / melancholy
  quiet: { warmth: -0.1, luminosity: -0.1, turbulence: 0.05, style: "rothko" },
  silence: { warmth: -0.2, luminosity: -0.3, turbulence: 0, style: "rothko" },
  still: { warmth: 0, luminosity: 0, turbulence: 0.05, style: "rothko" },
  slow: { warmth: 0, luminosity: -0.1, turbulence: 0.1, style: "rothko" },
  sad: { warmth: -0.3, luminosity: -0.5, turbulence: 0.15, style: "rothko" },
  sorrow: { warmth: -0.3, luminosity: -0.5, turbulence: 0.1, style: "rothko" },
  grief: { warmth: -0.2, luminosity: -0.6, turbulence: 0.1, style: "rothko" },
  lonely: { warmth: -0.4, luminosity: -0.4, turbulence: 0.1, style: "rothko" },
  alone: { warmth: -0.3, luminosity: -0.3, turbulence: 0.1, style: "rothko" },
  empty: { warmth: -0.2, luminosity: -0.3, turbulence: 0.05, style: "rothko" },
  void: { warmth: -0.3, luminosity: -0.6, turbulence: 0.05, style: "rothko" },
  meditation: { warmth: 0, luminosity: 0.1, turbulence: 0.05, style: "rothko" },
  prayer: { warmth: 0.1, luminosity: 0.2, turbulence: 0.05, style: "rothko" },
  soul: { warmth: 0.1, luminosity: 0, turbulence: 0.1, style: "rothko" },
  requiem: { warmth: -0.3, luminosity: -0.5, turbulence: 0.1, style: "rothko" },
  elegy: { warmth: -0.2, luminosity: -0.4, turbulence: 0.1, style: "rothko" },
  dusk: { warmth: 0.2, luminosity: -0.3, turbulence: 0.1, style: "rothko" },
  midnight: { warmth: -0.3, luminosity: -0.6, turbulence: 0.15, style: "rothko" },
  shadow: { warmth: -0.2, luminosity: -0.6, turbulence: 0.2, style: "rothko" },

  // Joy / warmth / celebration
  joy: { warmth: 0.8, luminosity: 0.6, turbulence: 0.3, style: "renoir" },
  happy: { warmth: 0.7, luminosity: 0.6, turbulence: 0.3, style: "renoir" },
  love: { warmth: 0.7, luminosity: 0.4, turbulence: 0.2, style: "renoir" },
  dance: { warmth: 0.5, luminosity: 0.4, turbulence: 0.5, style: "renoir" },
  party: { warmth: 0.6, luminosity: 0.5, turbulence: 0.5, style: "renoir" },
  summer: { warmth: 0.8, luminosity: 0.6, turbulence: 0.3, style: "renoir" },
  sunshine: { warmth: 0.9, luminosity: 0.8, turbulence: 0.2, style: "renoir" },
  garden: { warmth: 0.5, luminosity: 0.5, turbulence: 0.2, style: "renoir" },
  friend: { warmth: 0.5, luminosity: 0.4, turbulence: 0.2, style: "renoir" },
  laugh: { warmth: 0.6, luminosity: 0.6, turbulence: 0.4, style: "renoir" },
  festival: { warmth: 0.6, luminosity: 0.5, turbulence: 0.5, style: "renoir" },
  golden: { warmth: 0.7, luminosity: 0.7, turbulence: 0.2, style: "renoir" },
  wine: { warmth: 0.6, luminosity: 0.2, turbulence: 0.2, style: "renoir" },

  // Water / nature / light
  ocean: { warmth: -0.3, luminosity: 0.3, turbulence: 0.4, style: "monet" },
  sea: { warmth: -0.2, luminosity: 0.3, turbulence: 0.4, style: "monet" },
  water: { warmth: -0.2, luminosity: 0.3, turbulence: 0.3, style: "monet" },
  river: { warmth: -0.1, luminosity: 0.3, turbulence: 0.3, style: "monet" },
  lake: { warmth: -0.1, luminosity: 0.3, turbulence: 0.15, style: "monet" },
  light: { warmth: 0.2, luminosity: 0.8, turbulence: 0.2, style: "monet" },
  morning: { warmth: 0.3, luminosity: 0.6, turbulence: 0.15, style: "monet" },
  dawn: { warmth: 0.3, luminosity: 0.5, turbulence: 0.1, style: "monet" },
  sky: { warmth: -0.1, luminosity: 0.6, turbulence: 0.2, style: "monet" },
  cloud: { warmth: -0.1, luminosity: 0.5, turbulence: 0.15, style: "monet" },
  rainbow: { warmth: 0.2, luminosity: 0.7, turbulence: 0.3 },
  flower: { warmth: 0.3, luminosity: 0.6, turbulence: 0.1, style: "monet" },
  spring: { warmth: 0.3, luminosity: 0.6, turbulence: 0.2, style: "monet" },
  breeze: { warmth: 0.1, luminosity: 0.5, turbulence: 0.2, style: "monet" },
  mist: { warmth: -0.1, luminosity: 0.2, turbulence: 0.1, style: "monet" },
  reflection: { warmth: 0, luminosity: 0.4, turbulence: 0.1, style: "monet" },
  lily: { warmth: 0, luminosity: 0.5, turbulence: 0.1, style: "monet" },
  pond: { warmth: -0.1, luminosity: 0.3, turbulence: 0.1, style: "monet" },

  // Night / cold / mystery
  night: { warmth: -0.3, luminosity: -0.5, turbulence: 0.2, style: "rothko" },
  blue: { warmth: -0.5, luminosity: 0, turbulence: 0.15 },
  cold: { warmth: -0.7, luminosity: -0.1, turbulence: 0.2 },
  ice: { warmth: -0.7, luminosity: 0.3, turbulence: 0.1 },
  winter: { warmth: -0.5, luminosity: 0, turbulence: 0.15 },
  dream: { warmth: 0.1, luminosity: 0.2, turbulence: 0.15, style: "klee" },
  star: { warmth: -0.1, luminosity: 0.6, turbulence: 0.1 },
  moon: { warmth: -0.2, luminosity: 0.3, turbulence: 0.1 },
  ghost: { warmth: -0.2, luminosity: -0.3, turbulence: 0.2 },
  mystery: { warmth: -0.1, luminosity: -0.2, turbulence: 0.25 },

  // Abstract / spiritual / geometric
  spirit: { warmth: 0.1, luminosity: 0.2, turbulence: 0.2, style: "kandinsky" },
  cosmic: { warmth: -0.1, luminosity: 0.2, turbulence: 0.3, style: "kandinsky" },
  universe: { warmth: -0.1, luminosity: 0.2, turbulence: 0.3, style: "kandinsky" },
  concerto: { warmth: 0, luminosity: 0.2, turbulence: 0.3, style: "kandinsky" },
  symphony: { warmth: 0, luminosity: 0.3, turbulence: 0.4, style: "kandinsky" },
  geometry: { warmth: 0, luminosity: 0.1, turbulence: 0.2, style: "kandinsky" },
  circle: { warmth: 0, luminosity: 0.2, turbulence: 0.15, style: "kandinsky" },
  whimsy: { warmth: 0.2, luminosity: 0.4, turbulence: 0.2, style: "klee" },
  playful: { warmth: 0.3, luminosity: 0.5, turbulence: 0.3, style: "klee" },
  child: { warmth: 0.3, luminosity: 0.5, turbulence: 0.25, style: "klee" },
  toy: { warmth: 0.3, luminosity: 0.5, turbulence: 0.3, style: "klee" },
  puzzle: { warmth: 0.1, luminosity: 0.2, turbulence: 0.2, style: "klee" },

  // Industrial / urban / fragmented
  city: { warmth: -0.1, luminosity: -0.1, turbulence: 0.4, style: "picasso" },
  street: { warmth: 0, luminosity: -0.1, turbulence: 0.35, style: "picasso" },
  steel: { warmth: -0.3, luminosity: -0.1, turbulence: 0.4, style: "picasso" },
  factory: { warmth: -0.2, luminosity: -0.2, turbulence: 0.5, style: "picasso" },
  concrete: { warmth: -0.2, luminosity: -0.2, turbulence: 0.3, style: "picasso" },

  // Blues/jazz/improvisation
  blues: { warmth: -0.2, luminosity: -0.2, turbulence: 0.3, style: "pollock" },
  jazz: { warmth: 0.1, luminosity: 0, turbulence: 0.5, style: "pollock" },
  improvisation: { warmth: 0, luminosity: 0.1, turbulence: 0.6, style: "pollock" },
  solo: { warmth: 0.1, luminosity: 0.1, turbulence: 0.4 },
};
