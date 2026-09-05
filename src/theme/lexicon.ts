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
  // Storm / turbulence / violence -- Pollock's energetic all-over drip,
  // de Kooning's slashing emotional attack
  storm: { warmth: -0.3, luminosity: -0.5, turbulence: 0.9, style: "pollock" },
  thunder: { warmth: -0.2, luminosity: -0.6, turbulence: 1, style: "pollock" },
  rain: { warmth: -0.4, luminosity: -0.2, turbulence: 0.5, style: "pollock" },
  fire: { warmth: 1, luminosity: 0.3, turbulence: 0.8, style: "pollock" },
  burn: { warmth: 0.9, luminosity: 0.1, turbulence: 0.7 },
  war: { warmth: -0.2, luminosity: -0.6, turbulence: 1, style: "dekooning" },
  chaos: { warmth: 0, luminosity: -0.3, turbulence: 1, style: "pollock" },
  wild: { warmth: 0.3, luminosity: 0.1, turbulence: 0.9, style: "pollock" },
  rage: { warmth: 0.6, luminosity: -0.4, turbulence: 1, style: "pollock" },
  scream: { warmth: -0.1, luminosity: -0.5, turbulence: 0.9, style: "dekooning" },
  broken: { warmth: -0.2, luminosity: -0.4, turbulence: 0.8, style: "dekooning" },
  shatter: { warmth: -0.1, luminosity: -0.2, turbulence: 0.9, style: "dekooning" },
  machine: { warmth: -0.3, luminosity: -0.2, turbulence: 0.6, style: "dekooning" },
  riot: { warmth: 0.3, luminosity: -0.3, turbulence: 1, style: "pollock" },

  // Calm / stillness / melancholy -- Rothko's luminous, brooding fields
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

  // Joy / warmth / celebration -- Kelly's bold, cheerful flat color
  joy: { warmth: 0.8, luminosity: 0.6, turbulence: 0.3, style: "kelly" },
  happy: { warmth: 0.7, luminosity: 0.6, turbulence: 0.3, style: "kelly" },
  love: { warmth: 0.7, luminosity: 0.4, turbulence: 0.2, style: "kelly" },
  dance: { warmth: 0.5, luminosity: 0.4, turbulence: 0.5, style: "kelly" },
  party: { warmth: 0.6, luminosity: 0.5, turbulence: 0.5, style: "kelly" },
  summer: { warmth: 0.8, luminosity: 0.6, turbulence: 0.3, style: "kelly" },
  sunshine: { warmth: 0.9, luminosity: 0.8, turbulence: 0.2, style: "kelly" },
  garden: { warmth: 0.5, luminosity: 0.5, turbulence: 0.2, style: "kelly" },
  friend: { warmth: 0.5, luminosity: 0.4, turbulence: 0.2, style: "kelly" },
  laugh: { warmth: 0.6, luminosity: 0.6, turbulence: 0.4, style: "kelly" },
  festival: { warmth: 0.6, luminosity: 0.5, turbulence: 0.5, style: "kelly" },
  golden: { warmth: 0.7, luminosity: 0.7, turbulence: 0.2, style: "kelly" },
  wine: { warmth: 0.6, luminosity: 0.2, turbulence: 0.2, style: "kelly" },

  // Water / flow -- Marden's sinuous, fluid line
  ocean: { warmth: -0.3, luminosity: 0.3, turbulence: 0.4, style: "marden" },
  sea: { warmth: -0.2, luminosity: 0.3, turbulence: 0.4, style: "marden" },
  water: { warmth: -0.2, luminosity: 0.3, turbulence: 0.3, style: "marden" },
  river: { warmth: -0.1, luminosity: 0.3, turbulence: 0.3, style: "marden" },
  lake: { warmth: -0.1, luminosity: 0.3, turbulence: 0.15, style: "marden" },
  reflection: { warmth: 0, luminosity: 0.4, turbulence: 0.1, style: "marden" },
  lily: { warmth: 0, luminosity: 0.5, turbulence: 0.1, style: "marden" },
  pond: { warmth: -0.1, luminosity: 0.3, turbulence: 0.1, style: "marden" },

  // Air / light / pale nature -- Martin's quiet, barely-there washes
  light: { warmth: 0.2, luminosity: 0.8, turbulence: 0.2, style: "martin" },
  morning: { warmth: 0.3, luminosity: 0.6, turbulence: 0.15, style: "martin" },
  dawn: { warmth: 0.3, luminosity: 0.5, turbulence: 0.1, style: "martin" },
  sky: { warmth: -0.1, luminosity: 0.6, turbulence: 0.2, style: "martin" },
  cloud: { warmth: -0.1, luminosity: 0.5, turbulence: 0.15, style: "martin" },
  rainbow: { warmth: 0.2, luminosity: 0.7, turbulence: 0.3 },
  flower: { warmth: 0.3, luminosity: 0.6, turbulence: 0.1, style: "martin" },
  spring: { warmth: 0.3, luminosity: 0.6, turbulence: 0.2, style: "martin" },
  breeze: { warmth: 0.1, luminosity: 0.5, turbulence: 0.2, style: "martin" },
  mist: { warmth: -0.1, luminosity: 0.2, turbulence: 0.1, style: "martin" },

  // Night / cold / mystery
  night: { warmth: -0.3, luminosity: -0.5, turbulence: 0.2, style: "rothko" },
  blue: { warmth: -0.5, luminosity: 0, turbulence: 0.15 },
  cold: { warmth: -0.7, luminosity: -0.1, turbulence: 0.2 },
  ice: { warmth: -0.7, luminosity: 0.3, turbulence: 0.1 },
  winter: { warmth: -0.5, luminosity: 0, turbulence: 0.15 },
  dream: { warmth: 0.1, luminosity: 0.2, turbulence: 0.15, style: "martin" },
  star: { warmth: -0.1, luminosity: 0.6, turbulence: 0.1 },
  moon: { warmth: -0.2, luminosity: 0.3, turbulence: 0.1 },
  ghost: { warmth: -0.2, luminosity: -0.3, turbulence: 0.2 },
  mystery: { warmth: -0.1, luminosity: -0.2, turbulence: 0.25 },

  // Abstract / spiritual / cosmic -- Marden's infinite, meditative line
  spirit: { warmth: 0.1, luminosity: 0.2, turbulence: 0.2, style: "marden" },
  cosmic: { warmth: -0.1, luminosity: 0.2, turbulence: 0.3, style: "marden" },
  universe: { warmth: -0.1, luminosity: 0.2, turbulence: 0.3, style: "marden" },

  // Musical grandeur -- Rothko's immersive, symphonic scale
  concerto: { warmth: 0, luminosity: 0.2, turbulence: 0.3, style: "rothko" },
  symphony: { warmth: 0, luminosity: 0.3, turbulence: 0.4, style: "rothko" },

  // Geometric / playful -- Kelly's clean hard-edged shapes
  geometry: { warmth: 0, luminosity: 0.1, turbulence: 0.2, style: "kelly" },
  circle: { warmth: 0, luminosity: 0.2, turbulence: 0.15, style: "kelly" },
  whimsy: { warmth: 0.2, luminosity: 0.4, turbulence: 0.2, style: "kelly" },
  playful: { warmth: 0.3, luminosity: 0.5, turbulence: 0.3, style: "kelly" },
  child: { warmth: 0.3, luminosity: 0.5, turbulence: 0.25, style: "kelly" },
  toy: { warmth: 0.3, luminosity: 0.5, turbulence: 0.3, style: "kelly" },
  puzzle: { warmth: 0.1, luminosity: 0.2, turbulence: 0.2, style: "kelly" },

  // Industrial / urban / architectural -- Kelly's hard-edged flat forms
  city: { warmth: -0.1, luminosity: -0.1, turbulence: 0.4, style: "kelly" },
  street: { warmth: 0, luminosity: -0.1, turbulence: 0.35, style: "kelly" },
  steel: { warmth: -0.3, luminosity: -0.1, turbulence: 0.4, style: "kelly" },
  factory: { warmth: -0.2, luminosity: -0.2, turbulence: 0.5, style: "kelly" },
  concrete: { warmth: -0.2, luminosity: -0.2, turbulence: 0.3, style: "kelly" },

  // Anxiety / vulnerability / the body -- Schiele's raw, angular unease
  anxiety: { warmth: -0.1, luminosity: -0.2, turbulence: 0.5, style: "schiele" },
  angst: { warmth: -0.1, luminosity: -0.3, turbulence: 0.55, style: "schiele" },
  vulnerable: { warmth: 0.1, luminosity: -0.1, turbulence: 0.3, style: "schiele" },
  fragile: { warmth: 0, luminosity: 0, turbulence: 0.25, style: "schiele" },
  naked: { warmth: 0.2, luminosity: 0, turbulence: 0.3, style: "schiele" },
  longing: { warmth: 0.1, luminosity: -0.1, turbulence: 0.2, style: "schiele" },
  isolation: { warmth: -0.2, luminosity: -0.2, turbulence: 0.2, style: "schiele" },
  tension: { warmth: 0, luminosity: -0.1, turbulence: 0.5, style: "schiele" },
  gaunt: { warmth: -0.1, luminosity: -0.2, turbulence: 0.3, style: "schiele" },
  intimate: { warmth: 0.2, luminosity: 0.1, turbulence: 0.15, style: "schiele" },

  // Blues/jazz/improvisation -- Pollock's gestural energy
  blues: { warmth: -0.2, luminosity: -0.2, turbulence: 0.3, style: "pollock" },
  jazz: { warmth: 0.1, luminosity: 0, turbulence: 0.5, style: "pollock" },
  improvisation: { warmth: 0, luminosity: 0.1, turbulence: 0.6, style: "pollock" },
  solo: { warmth: 0.1, luminosity: 0.1, turbulence: 0.4 },
};
