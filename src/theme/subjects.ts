/**
 * A small curated "subject" lexicon -- reads a title/lyrics for a concrete
 * physical subject (a place, a scene) the way "seaside" or "mountains"
 * might inspire a landscape's underlying shapes, distinct from the mood
 * lexicon's emotional/atmospheric reading of the same text. Each matched
 * word nudges the composition toward a handful of abstract visual
 * primitives -- never literal objects, just the underlying shapes a
 * landscape painter might block in before the music takes over: a horizon
 * line, a ridge of peaks, a stand of verticals. Which painter is selected
 * still decides how those primitives actually get marked down -- the same
 * "seaside" horizon reads as a Rothko color-field band, a length of
 * Marden's flowing line, or a row of Kline's bold bars.
 */

export type MotifPrimitive =
  | "horizon"
  | "waves"
  | "peaks"
  | "verticals"
  | "canopy"
  | "grid"
  | "disc"
  | "spiral"
  | "field";

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

  // Forest
  forest: { primitives: ["canopy", "verticals"], strength: 0.8 },
  woods: { primitives: ["canopy", "verticals"], strength: 0.7 },
  jungle: { primitives: ["canopy"], strength: 0.7 },
  tree: { primitives: ["verticals"], strength: 0.5 },
  trees: { primitives: ["verticals"], strength: 0.6 },
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
