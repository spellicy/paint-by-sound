import type { NoteEvent } from "./analyzer";

/**
 * A painter doesn't react to one note at a time -- they read the arc of a
 * piece: a quiet opening, a melodic line to follow, a loud rhythmic section
 * to attack. PhraseTracker turns the raw NoteEvent stream into that kind of
 * higher-level musical context so PaintEngine can paint with intention
 * instead of stamping one mark per note.
 */
export type PaintPhase = "wash" | "melodic" | "rhythmic" | "building";

export interface PhraseState {
  phase: PaintPhase;
  energyFast: number; // 0..1, ~0.3s smoothed loudness
  energySlow: number; // 0..1, ~a few seconds smoothed loudness (the "trend")
  onsetRate: number; // smoothed onsets/second
  brightnessSlow: number; // 0..1 smoothed timbral brightness
  elapsed: number; // seconds since the first analyzed sample
  sectionChange: boolean; // true on the tick a sustained dynamic shift is detected
}

export class PhraseTracker {
  private energyFast = 0;
  private energySlow = 0;
  private onsetRate = 0;
  private brightnessSlow = 0;
  private lastOnsetTime: number | null = null;
  private startTime: number | null = null;
  private lastSectionEnergy = 0;
  private lastVoicedAt = -Infinity;
  private phase: PaintPhase = "wash";
  private candidatePhase: PaintPhase | null = null;
  private candidateSince = 0;

  reset() {
    this.energyFast = 0;
    this.energySlow = 0;
    this.onsetRate = 0;
    this.brightnessSlow = 0;
    this.lastOnsetTime = null;
    this.startTime = null;
    this.lastSectionEnergy = 0;
    this.lastVoicedAt = -Infinity;
    this.phase = "wash";
    this.candidatePhase = null;
    this.candidateSince = 0;
  }

  update(note: NoteEvent): PhraseState {
    if (this.startTime === null) this.startTime = note.time;
    const elapsed = note.time - this.startTime;

    this.energyFast += (note.amplitude - this.energyFast) * 0.25;
    this.energySlow += (note.amplitude - this.energySlow) * 0.02;
    this.brightnessSlow += (note.brightness - this.brightnessSlow) * 0.03;

    if (note.isOnset) {
      if (this.lastOnsetTime !== null) {
        const interval = note.time - this.lastOnsetTime;
        const instantRate = interval > 0 ? 1 / interval : this.onsetRate;
        this.onsetRate += (instantRate - this.onsetRate) * 0.3;
      }
      this.lastOnsetTime = note.time;
    } else {
      this.onsetRate += (0 - this.onsetRate) * 0.008;
    }

    const sectionChange = Math.abs(this.energyFast - this.lastSectionEnergy) > 0.28;
    if (sectionChange) this.lastSectionEnergy = this.energyFast;

    // Bridge brief pitch-detection dropouts (a cycle or two where autocorrelation
    // comes up empty mid-note) so a sustained tone doesn't flicker out of "tonal"
    // just because one analysis frame failed to find a fundamental.
    if (note.frequency > 0) this.lastVoicedAt = note.time;
    const recentlyVoiced = note.time - this.lastVoicedAt < 0.3;

    // Order matters: a loud but sustained, sparsely-attacked passage (a held
    // note, a legato line) is melodic, not rhythmic, however loud it gets --
    // rhythmic means busy with attacks, not merely loud. So low onset rate
    // wins the classification before a loudness-only check can misread a
    // held tone as a percussive section.
    let raw: PaintPhase;
    if (elapsed < 1.4) {
      raw = "wash";
    } else if (this.onsetRate < 0.9 && recentlyVoiced && this.energyFast > 0.03) {
      raw = "melodic";
    } else if (this.onsetRate > 2.2 || this.energyFast > 0.85) {
      raw = "rhythmic";
    } else {
      raw = "building";
    }

    // Debounce: only commit a phase switch once the new reading has held for
    // ~180ms, so a single stray frame can't flicker the phase back and forth.
    if (raw === this.candidatePhase) {
      if (note.time - this.candidateSince > 0.18) {
        this.phase = raw;
      }
    } else {
      this.candidatePhase = raw;
      this.candidateSince = note.time;
    }

    return {
      phase: this.phase,
      energyFast: this.energyFast,
      energySlow: this.energySlow,
      onsetRate: this.onsetRate,
      brightnessSlow: this.brightnessSlow,
      elapsed,
      sectionChange,
    };
  }
}
