import { MOOD_LEXICON } from "./lexicon";
import type { PaintStyleId } from "../paint/types";

export interface ThemeInfluence {
  /** -1 (cold) .. 1 (warm) -- shifts the palette toward blues/violets or reds/golds. */
  warmth: number;
  /** -1 (shadowed) .. 1 (luminous) -- shifts overall lightness. */
  luminosity: number;
  /** 0 (still) .. 1 (agitated) -- widens compositional spread and stroke energy. */
  turbulence: number;
  /** Base hue rotation (degrees) derived from the text itself, so untagged
   * titles still get a distinct, repeatable palette lean instead of a
   * neutral default. */
  hueRotation: number;
  /** Mood words from the lexicon that were actually found, for the UI. */
  matchedWords: string[];
  /** A gentle style suggestion from the strongest lexicon match -- never
   * applied automatically, just offered. */
  suggestedStyle: PaintStyleId | null;
}

const NEUTRAL: ThemeInfluence = {
  warmth: 0,
  luminosity: 0,
  turbulence: 0.3,
  hueRotation: 0,
  matchedWords: [],
  suggestedStyle: null,
};

/** Small stable string hash (djb2) -- deterministic, no dependencies. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Read a track's title and/or key lyrics as inspiration for the palette and
 * composition, the way a painter might take a cue from a poem or a place
 * before starting a canvas. Runs entirely locally against a small curated
 * mood lexicon; words outside the lexicon still shift the palette via a
 * deterministic hash of the text, so every title leaves *some* mark.
 */
export function analyzeTheme(text: string): ThemeInfluence {
  const trimmed = text.trim();
  if (!trimmed) return NEUTRAL;

  const words = trimmed.toLowerCase().match(/[a-z']+/g) ?? [];
  const matches: { word: string; entry: (typeof MOOD_LEXICON)[string] }[] = [];
  for (const word of words) {
    const entry = MOOD_LEXICON[word];
    if (entry) matches.push({ word, entry });
  }

  const hueRotation = hashString(trimmed.toLowerCase()) % 360;

  if (matches.length === 0) {
    return { ...NEUTRAL, hueRotation };
  }

  const n = matches.length;
  const warmth = matches.reduce((s, m) => s + m.entry.warmth, 0) / n;
  const luminosity = matches.reduce((s, m) => s + m.entry.luminosity, 0) / n;
  const turbulence = clamp(
    matches.reduce((s, m) => s + m.entry.turbulence, 0) / n,
    0,
    1,
  );

  const styleVotes = new Map<PaintStyleId, number>();
  for (const m of matches) {
    if (m.entry.style) styleVotes.set(m.entry.style, (styleVotes.get(m.entry.style) ?? 0) + 1);
  }
  let suggestedStyle: PaintStyleId | null = null;
  let bestVotes = 0;
  for (const [style, votes] of styleVotes) {
    if (votes > bestVotes) {
      bestVotes = votes;
      suggestedStyle = style;
    }
  }

  return {
    warmth: clamp(warmth, -1, 1),
    luminosity: clamp(luminosity, -1, 1),
    turbulence,
    hueRotation,
    matchedWords: matches.map((m) => m.word),
    suggestedStyle,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
