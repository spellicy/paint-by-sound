// Musical key (mode) detection: a rolling pitch-class histogram correlated
// against the Krumhansl-Kessler major/minor key profiles -- the same
// classic technique used in music-information-retrieval key finders. This
// gives the paint engine a slow-forming sense of "is this piece major or
// minor" to lean the palette toward, the way major/minor already carries an
// emotional shorthand for composers and listeners alike.

export interface KeyEstimate {
  mode: "major" | "minor" | null;
  /** Pitch class 0-11 (C=0) of the detected tonic, or null if unresolved. */
  tonic: number | null;
  /** 0..1 -- how clearly the histogram favors this key over the runner-up. */
  confidence: number;
}

const NEUTRAL_KEY: KeyEstimate = { mode: null, tonic: null, confidence: 0 };

// Krumhansl-Kessler tonal hierarchy weights, indexed by semitone above the
// tonic (index 0 = tonic itself).
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Histogram bins decay with this half-life so the estimate tracks the
// recent "feel" of the piece rather than an equal-weighted average of
// everything played so far -- a piece that modulates should drift with it.
const HALF_LIFE_SECONDS = 10;
// Below this accumulated weight, there's too little material to guess a
// key from -- report unresolved rather than an early, noisy guess.
const MIN_WEIGHT = 1.2;
// Recompute the (cheap, but not free) correlation at most this often.
const RECOMPUTE_INTERVAL = 0.2;

export class KeyDetector {
  private bins = new Array(12).fill(0);
  private lastDecayAt: number | null = null;
  private lastComputeAt = -Infinity;
  private cached: KeyEstimate = NEUTRAL_KEY;

  reset() {
    this.bins = new Array(12).fill(0);
    this.lastDecayAt = null;
    this.lastComputeAt = -Infinity;
    this.cached = NEUTRAL_KEY;
  }

  addPitch(pitchClass: number, amplitude: number, now: number) {
    this.decay(now);
    this.bins[pitchClass] += amplitude;
    if (now - this.lastComputeAt > RECOMPUTE_INTERVAL) {
      this.cached = this.compute();
      this.lastComputeAt = now;
    }
  }

  getEstimate(): KeyEstimate {
    return this.cached;
  }

  private decay(now: number) {
    if (this.lastDecayAt === null) {
      this.lastDecayAt = now;
      return;
    }
    const dt = Math.max(0, now - this.lastDecayAt);
    const factor = Math.pow(0.5, dt / HALF_LIFE_SECONDS);
    for (let i = 0; i < 12; i++) this.bins[i] *= factor;
    this.lastDecayAt = now;
  }

  private compute(): KeyEstimate {
    const total = this.bins.reduce((a, b) => a + b, 0);
    if (total < MIN_WEIGHT) return NEUTRAL_KEY;

    let best = -Infinity;
    let second = -Infinity;
    let bestTonic = 0;
    let bestMode: "major" | "minor" = "major";

    for (let t = 0; t < 12; t++) {
      const candidates: Array<["major" | "minor", number]> = [
        ["major", pearson(this.bins, rotate(MAJOR_PROFILE, t))],
        ["minor", pearson(this.bins, rotate(MINOR_PROFILE, t))],
      ];
      for (const [mode, score] of candidates) {
        if (score > best) {
          second = best;
          best = score;
          bestTonic = t;
          bestMode = mode;
        } else if (score > second) {
          second = score;
        }
      }
    }

    // Many candidate keys are close relatives (a minor and its relative
    // major share five of seven scale tones), so the gap between the top
    // match and the runner-up is usually small even for a clear tonal
    // piece -- scale it up rather than using the raw correlation as
    // confidence directly.
    const confidence = clamp((best - Math.max(second, 0)) * 2.2, 0, 1);
    return { mode: bestMode, tonic: bestTonic, confidence };
  }
}

/** `rotated[pc]` = the profile's weight for scale-degree `pc - tonic`. */
function rotate(profile: number[], tonic: number): number[] {
  const out = new Array(12);
  for (let pc = 0; pc < 12; pc++) out[pc] = profile[(pc - tonic + 12) % 12];
  return out;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
