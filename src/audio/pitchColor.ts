// Synesthetic note -> color mapping, inspired by Kandinsky's belief that
// musical pitch and color are "sister sciences" arranged on a shared wheel.
// Pitch classes are spaced evenly around the hue circle (30deg apart),
// echoing Scriabin's colour-tone correspondences without claiming to
// reproduce them literally.

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

const PITCH_CLASS_HUE: number[] = [
  0,   // C  - red
  30,  // C# - red-orange
  45,  // D  - orange
  60,  // D# - amber/yellow
  90,  // E  - yellow-green
  120, // F  - green
  165, // F# - teal
  195, // G  - cyan-blue
  225, // G# - blue
  260, // A  - indigo
  285, // A# - violet
  320, // B  - magenta
];

export interface NoteColor {
  pitchClass: number;
  noteName: string;
  octave: number;
  hue: number;
  saturation: number;
  lightness: number;
  rgb: string;
  rgba: (alpha: number) => string;
}

/** Convert a detected fundamental frequency (Hz) into a note + synesthetic color. */
export function frequencyToNoteColor(
  frequency: number,
  amplitude: number, // 0..1 RMS
  brightness: number, // 0..1 spectral centroid, normalized
): NoteColor {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;

  const hue = PITCH_CLASS_HUE[pitchClass];
  // Louder notes = more saturated pigment; brighter timbre = lighter tint.
  const saturation = clamp(55 + amplitude * 45, 40, 100);
  const lightness = clamp(35 + brightness * 30 - amplitude * 5, 20, 75);

  return {
    pitchClass,
    noteName: NOTE_NAMES[pitchClass],
    octave,
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
