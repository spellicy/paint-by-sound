# Paint by Sound

**Paint by Sound** is a browser simulator for an invention concept: a gallery
installation where a robotic arm paints live, abstract, modern-art canvases
guided entirely by music. This app stands in for the physical robot &mdash;
it listens to real audio in your browser and drives a simulated brush across
a canvas in real time, in the spirit of Kandinsky, Klee, Pollock and Picasso.

See [`docs/CONCEPT.md`](docs/CONCEPT.md) for the original invention concept
this app simulates.

## How it listens

All analysis happens client-side with the Web Audio API &mdash; no audio is
ever uploaded anywhere.

- **`src/audio/analyzer.ts`** &mdash; `SoundAnalyzer` taps an `AnalyserNode`
  on every animation frame and extracts:
  - **Pitch**, via time-domain autocorrelation of the waveform.
  - **Loudness**, via RMS amplitude.
  - **Timbre/brightness**, via the spectral centroid of the frequency data.
  - **Onsets**, by detecting sudden jumps in RMS above a rolling average
    (i.e. the start of a new "note").

  It emits a stream of `NoteEvent`s from either an uploaded audio file
  (`playFile`) or a live microphone (`startMic`).

- **`src/audio/pitchColor.ts`** &mdash; maps a detected frequency to a note
  name, octave, and an HSL color. Pitch classes are spread evenly around the
  hue wheel, echoing Kandinsky's own belief that pitch and color are "sister
  sciences." Loudness drives saturation; brightness drives lightness.

## How it paints

- **`src/paint/PaintEngine.ts`** &mdash; owns the simulated robotic arm's
  brush position (`ArmCursor`) on the canvas. Pitch moves the cursor
  vertically (higher notes paint higher), and it drifts and scans
  horizontally over time, like a gantry sweeping the canvas. Each `NoteEvent`
  is converted to a color and handed to the active style renderer.
- **`src/paint/styles.ts`** &mdash; four independent stroke renderers
  selectable at runtime:
  - **Kandinsky** &mdash; geometric arcs, circles and lines.
  - **Klee** &mdash; small organic dabs drifting across the canvas.
  - **Pollock** &mdash; flung drips and splatter, driven by loudness.
  - **Picasso** &mdash; angular, fragmented cubist planes.

A seeded PRNG (`mulberry32`) drives all the "randomness" in a stroke, so a
given style's texture is reproducible run to run.

Finished paintings can be saved to a small **gallery** (`src/gallery/`),
persisted to `localStorage` and rendered on the page as an exhibit catalog,
with a download option for each piece.

## Running it

```bash
npm install
npm run dev      # start the dev server
npm run build     # type-check and produce a production build
npm run preview   # preview the production build locally
```

Then either upload an audio file or grant microphone access, pick a brush
style, and watch the canvas paint itself.

## Project layout

```
src/
  audio/
    analyzer.ts       # pitch/loudness/timbre/onset detection (the "AI ear")
    pitchColor.ts      # note -> synesthetic color mapping
  paint/
    PaintEngine.ts      # simulated arm cursor + per-note rendering
    styles.ts           # Kandinsky / Klee / Pollock / Picasso stroke renderers
    types.ts            # shared paint types
  gallery/
    storage.ts           # localStorage-backed gallery persistence
  hooks/
    usePaintBySound.ts    # wires audio source, engine and UI state together
  components/
    Controls.tsx           # source + style + save/clear controls
    StatusBar.tsx            # live note/amplitude readout
    ConceptPanel.tsx          # collapsible "about this concept" blurb
    Gallery.tsx                # saved-piece catalog + lightbox
  App.tsx
docs/
  CONCEPT.md              # the original invention concept
```
