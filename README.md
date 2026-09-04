# Paint by Sound

> "The eyes are made for astronomy, the ears for harmony, and these are sister
> sciences." — Wassily Kandinsky

A browser-based simulator for **Paint by Sound**, an invention concept by
Stephen Spellicy: an AI-driven artform where a robotic arm paints abstract,
modern-art canvases live, guided entirely by music — pitch mapped to color,
loudness and timbre mapped to brushstroke and gesture.

This app stands in for the physical installation. It listens to whatever
audio you play (an uploaded file or your microphone), analyzes it in real
time, and drives a virtual brush across a canvas the same way the concept's
robotic arm would drive a real one.

## How it listens

Everything runs client-side on the Web Audio API:

- **Pitch** — autocorrelation on the time-domain signal, converted to a note
  name and octave.
- **Loudness** — RMS amplitude, smoothed over a short rolling window.
- **Timbre** — spectral centroid (brightness of the sound), affecting tint.
- **Onsets** — a simple adaptive energy threshold flags the start of a new
  note/hit, triggering a fresh brush gesture.

## How it paints

Painting isn't one stamp per note. Color hues interpolate continuously
between notes (no snapping to fixed steps), plus a slow palette drift over
the piece and per-stroke jitter, so the same note never paints quite the
same way twice.

### Seven painters, seven different techniques

Each style isn't just a different brush shape on a shared engine — it has
its own **composition strategy** (how the simulated arm moves and how much
of the canvas it uses) and its own **signature palette**
(`src/paint/palettes.ts`), the way each painter actually worked, rather than
one full-saturation rainbow applied uniformly to everyone:

| Style | Composition | Palette |
|---|---|---|
| Kandinsky | Develops several focal "subject" areas across a wide grid | Bauhaus-era primaries: red, gold, blue, yellow, green |
| Klee | Small organic dabs across evolving focal areas | Muted ochre, terracotta, teal, violet, olive |
| Pollock | **All-over** — a continuous gestural sweep that roams and bounces across the *entire* canvas, no fixed subject | Earthy umber and sienna, mostly desaturated, with a rare cadmium-red accent |
| Picasso | Fragmented planes across focal areas | Analytic-cubist ochre, blue-grey, muted brown-red |
| Rothko | The canvas divided into a few large horizontal **color fields**; pitch register selects which field a note reinforces, building soft-edged, full-bleed bands | Deep maroon, burnt orange, plum, mustard — luminous through layering, not raw brightness |
| Renoir | Full-canvas roam with fuller, rounder, warmer dabs | Warm pink, peach, gold, soft green — dappled garden light |
| Monet | Full-canvas roam, short broken-color strokes with occasional complementary flecks nearby for shimmer | Soft blue, lavender, pale green, light pink, pale gold |

The gestural/geometric family (Kandinsky, Klee, Picasso, Pollock) is also
phase-aware via `PhraseTracker` (`src/audio/phraseTracker.ts`), which reads
the arc of the music (loudness trend, onset density, how sustained or
percussive things are) and puts the engine into one of four phases:

- **Wash** — at the start, and again on major dynamic shifts, a soft
  translucent gradient sweep lays down an underpainting before any detail.
- **Melodic** — sustained, sparsely-attacked passages (a held note, a legato
  line) are drawn as one continuous flowing line tracing the pitch contour,
  instead of discrete stamps.
- **Rhythmic** — dense or loud passages get bolder marks, occasionally in an
  accent brush style different from the base one, for percussive emphasis.
- **Composing** — the default per-note stroke behavior.

Rothko, Renoir and Monet paint continuously in their own technique
regardless of phase (that's how those painters actually worked), with
loudness and onset density modulating intensity and size rather than
switching modes.

### Inspiration: title and lyrics

The **Inspiration** panel lets you name the piece (prefilled from the
filename, freely editable) and optionally add key lyrics or mood words. A
small local mood lexicon (`src/theme/lexicon.ts`) reads that text the way a
painter might take a cue from a title before starting a canvas — words like
*storm*, *midnight*, *sunshine*, or *ocean* nudge the palette's warmth,
luminosity, and compositional turbulence, and offer a gentle (never forced)
style suggestion. Everything runs locally against the curated lexicon; there's
no server call, and even words outside the lexicon still shift the palette via
a deterministic hash of the text, so every title leaves *some* mark on the
piece (`src/theme/themeAnalyzer.ts`).

Finished paintings can be saved to an in-browser **exhibit catalog**
(`localStorage`), each tagged with track name, style, and date — a small
nod to the gallery catalog described in the original concept.

## Running it

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run preview   # serve the production build locally
```

Open the app, upload an audio file (or grant microphone access), and pick a
brush style. The canvas keeps painting for as long as audio plays.

## Project layout

```
src/
  audio/analyzer.ts       Web Audio pitch/loudness/timbre/onset analysis
  audio/pitchColor.ts     note -> synesthetic color mapping (continuous hue)
  audio/phraseTracker.ts  musical phase detection (wash/melodic/rhythmic/composing)
  theme/lexicon.ts        mood-word -> warmth/luminosity/turbulence lookup
  theme/themeAnalyzer.ts  reads a title/lyrics into a ThemeInfluence
  paint/PaintEngine.ts    per-style composition strategy + stroke dispatch
  paint/palettes.ts       each painter's signature color palette
  paint/styles.ts         the per-note brush-style renderers
  gallery/storage.ts      localStorage-backed exhibit catalog
  hooks/usePaintBySound.ts  wires audio + paint engine + theme into React state
  components/             Controls, StatusBar, ConceptPanel, InspirationPanel, Gallery
```

## Notes & limitations

- Pitch detection assumes monophonic-ish material (a solo, a lead line, a
  vocal); dense polyphonic mixes will still paint, just less "in tune" with
  any single note.
- Everything is local to the browser — no backend, no accounts, no audio
  ever leaves the machine it's played on.
- This is a software concept demo, not a control system for physical
  hardware; adapting the same `NoteEvent` stream to drive an actual robotic
  arm would replace `PaintEngine` with a motion-control client.
