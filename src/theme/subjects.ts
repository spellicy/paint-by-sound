/**
 * A small curated "subject" lexicon -- reads a title/lyrics for a concrete
 * physical subject the way "seaside" or "a cat" might inspire the
 * underlying shape a landscape (or figure) painter would block in before
 * the music takes over, distinct from the mood lexicon's emotional reading
 * of the same text. Two kinds of primitive:
 *
 * - Landscape primitives (horizon, waves, peaks, ...) -- abstract shapes,
 *   never literal objects.
 * - Subject figures (person, cat, dog, ...) -- literal (if simply drawn)
 *   silhouettes, defined in `src/paint/silhouettes.ts`.
 *
 * Either way, which painter is selected still decides how the primitive
 * actually gets marked down: the same "seaside" horizon reads as a Rothko
 * color-field band or a row of Monet dabs; the same "cat" comes out
 * fragmented and cubist through Picasso, or soft and broken-color through
 * Monet -- the literal subject stays constant, the hand is entirely the
 * painter's own.
 */

import type { SubjectFigure } from "../paint/silhouettes";

export type MotifPrimitive =
  | "horizon"
  | "waves"
  | "peaks"
  | "verticals"
  | "canopy"
  | "grid"
  | "disc"
  | "spiral"
  | "field"
  | SubjectFigure;

export const MOTIF_LABELS: Record<MotifPrimitive, string> = {
  horizon: "horizon",
  waves: "waves",
  peaks: "peaks",
  verticals: "verticals",
  canopy: "canopy",
  grid: "grid",
  disc: "disc",
  spiral: "spiral",
  field: "open field",
  person: "a person",
  cat: "a cat",
  dog: "a dog",
  bird: "a bird",
  tree: "a tree",
  house: "a house",
  flower: "a flower",
  boat: "a boat",
  car: "a car",
  star: "a star",
  heart: "a heart",
};

export interface SubjectHint {
  primitives: MotifPrimitive[];
  /** 0..1 how strongly the subject should assert its shape over the canvas. */
  strength: number;
}

export const SUBJECT_LEXICON: Record<string, SubjectHint> = {
  // Sea / coast
  seaside: { primitives: ["horizon", "waves"], strength: 0.8 },
  ocean: { primitives: ["horizon", "waves"], strength: 0.8 },
  sea: { primitives: ["horizon", "waves"], strength: 0.7 },
  beach: { primitives: ["horizon", "waves"], strength: 0.7 },
  shore: { primitives: ["horizon", "waves"], strength: 0.6 },
  coast: { primitives: ["horizon", "waves"], strength: 0.6 },
  wave: { primitives: ["waves"], strength: 0.5 },
  waves: { primitives: ["waves"], strength: 0.6 },
  tide: { primitives: ["waves"], strength: 0.5 },
  island: { primitives: ["horizon", "waves", "disc"], strength: 0.6 },
  harbor: { primitives: ["horizon", "verticals"], strength: 0.5 },
  harbour: { primitives: ["horizon", "verticals"], strength: 0.5 },

  // Mountains
  mountain: { primitives: ["peaks"], strength: 0.8 },
  mountains: { primitives: ["peaks"], strength: 0.8 },
  alps: { primitives: ["peaks"], strength: 0.7 },
  cliff: { primitives: ["peaks"], strength: 0.6 },
  cliffs: { primitives: ["peaks"], strength: 0.6 },
  ridge: { primitives: ["peaks"], strength: 0.6 },
  valley: { primitives: ["peaks", "horizon"], strength: 0.5 },

  // Forest (many trees -- abstract canopy/verticals texture)
  forest: { primitives: ["canopy", "verticals"], strength: 0.8 },
  woods: { primitives: ["canopy", "verticals"], strength: 0.7 },
  jungle: { primitives: ["canopy"], strength: 0.7 },
  trees: { primitives: ["canopy", "verticals"], strength: 0.6 },
  orchard: { primitives: ["verticals"], strength: 0.5 },

  // City
  city: { primitives: ["grid"], strength: 0.8 },
  skyline: { primitives: ["grid", "verticals"], strength: 0.7 },
  downtown: { primitives: ["grid"], strength: 0.6 },
  urban: { primitives: ["grid"], strength: 0.5 },
  street: { primitives: ["grid"], strength: 0.4 },
  village: { primitives: ["grid", "verticals"], strength: 0.5 },
  town: { primitives: ["grid"], strength: 0.5 },
  castle: { primitives: ["verticals", "peaks"], strength: 0.5 },
  bridge: { primitives: ["horizon", "verticals"], strength: 0.5 },

  // Sky / celestial
  sunset: { primitives: ["horizon", "disc"], strength: 0.8 },
  sunrise: { primitives: ["horizon", "disc"], strength: 0.8 },
  dawn: { primitives: ["horizon", "disc"], strength: 0.6 },
  dusk: { primitives: ["horizon", "disc"], strength: 0.6 },
  sun: { primitives: ["disc"], strength: 0.6 },
  moon: { primitives: ["disc"], strength: 0.6 },
  starry: { primitives: ["spiral", "disc"], strength: 0.9 },
  stars: { primitives: ["spiral", "disc"], strength: 0.6 },
  galaxy: { primitives: ["spiral"], strength: 0.7 },
  cosmos: { primitives: ["spiral"], strength: 0.6 },
  vortex: { primitives: ["spiral"], strength: 0.7 },
  storm: { primitives: ["spiral", "waves"], strength: 0.5 },
  hurricane: { primitives: ["spiral"], strength: 0.7 },
  whirlwind: { primitives: ["spiral"], strength: 0.6 },

  // Open land
  desert: { primitives: ["horizon", "field"], strength: 0.6 },
  dune: { primitives: ["waves", "horizon"], strength: 0.6 },
  dunes: { primitives: ["waves", "horizon"], strength: 0.6 },
  garden: { primitives: ["field", "canopy"], strength: 0.4 },
  meadow: { primitives: ["field"], strength: 0.4 },
  prairie: { primitives: ["field", "horizon"], strength: 0.5 },
  field: { primitives: ["field"], strength: 0.3 },
  snow: { primitives: ["field"], strength: 0.3 },
  river: { primitives: ["waves", "horizon"], strength: 0.5 },
  lake: { primitives: ["horizon"], strength: 0.4 },

  // People
  person: { primitives: ["person"], strength: 0.7 },
  people: { primitives: ["person"], strength: 0.6 },
  man: { primitives: ["person"], strength: 0.6 },
  woman: { primitives: ["person"], strength: 0.6 },
  girl: { primitives: ["person"], strength: 0.6 },
  boy: { primitives: ["person"], strength: 0.6 },
  dancer: { primitives: ["person"], strength: 0.6 },
  figure: { primitives: ["person"], strength: 0.5 },

  // Animals
  cat: { primitives: ["cat"], strength: 0.8 },
  kitten: { primitives: ["cat"], strength: 0.7 },
  kitty: { primitives: ["cat"], strength: 0.7 },
  dog: { primitives: ["dog"], strength: 0.8 },
  puppy: { primitives: ["dog"], strength: 0.7 },
  bird: { primitives: ["bird"], strength: 0.7 },
  sparrow: { primitives: ["bird"], strength: 0.6 },
  dove: { primitives: ["bird"], strength: 0.6 },
  crow: { primitives: ["bird"], strength: 0.6 },
  eagle: { primitives: ["bird"], strength: 0.6 },

  // A single tree (literal), as opposed to "trees"/"forest" (abstract texture)
  tree: { primitives: ["tree"], strength: 0.7 },
  oak: { primitives: ["tree"], strength: 0.6 },
  willow: { primitives: ["tree"], strength: 0.6 },

  // Everyday objects
  house: { primitives: ["house"], strength: 0.7 },
  home: { primitives: ["house"], strength: 0.5 },
  cottage: { primitives: ["house"], strength: 0.6 },
  cabin: { primitives: ["house"], strength: 0.6 },
  flower: { primitives: ["flower"], strength: 0.7 },
  rose: { primitives: ["flower"], strength: 0.7 },
  tulip: { primitives: ["flower"], strength: 0.6 },
  daisy: { primitives: ["flower"], strength: 0.6 },
  lily: { primitives: ["flower"], strength: 0.6 },
  blossom: { primitives: ["flower"], strength: 0.6 },
  boat: { primitives: ["boat"], strength: 0.7 },
  ship: { primitives: ["boat"], strength: 0.6 },
  sailboat: { primitives: ["boat"], strength: 0.7 },
  car: { primitives: ["car"], strength: 0.6 },
  automobile: { primitives: ["car"], strength: 0.5 },
  heart: { primitives: ["heart"], strength: 0.6 },
};

/**
 * Merge every matched subject's primitives, weighted by strength, and cap
 * at the strongest few so the composition stays legible instead of
 * cluttered with every primitive a long lyric sheet happens to touch.
 */
export function resolveMotifs(words: string[]): {
  primitives: MotifPrimitive[];
  strength: number;
  matched: string[];
} {
  const scores = new Map<MotifPrimitive, number>();
  const matched: string[] = [];
  let strengthSum = 0;
  let matchCount = 0;

  for (const word of words) {
    const hint = SUBJECT_LEXICON[word];
    if (!hint) continue;
    matched.push(word);
    strengthSum += hint.strength;
    matchCount++;
    for (const p of hint.primitives) {
      scores.set(p, (scores.get(p) ?? 0) + hint.strength);
    }
  }

  if (matchCount === 0) {
    return { primitives: [], strength: 0, matched: [] };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  // "field" alone only ever softens the composition (no explicit shape);
  // drop it once a stronger, actual shape has also matched, but keep it as
  // a fallback if it's the only thing that matched.
  const shaped = ranked.filter(([p]) => p !== "field").slice(0, 3);
  const primitives = (shaped.length ? shaped : ranked.slice(0, 1)).map(([p]) => p);

  return {
    primitives,
    strength: Math.min(1, strengthSum / matchCount),
    matched,
  };
}
