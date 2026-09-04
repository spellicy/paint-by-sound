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

Painting isn't one stamp per note — `PhraseTracker` (`src/audio/phraseTracker.ts`)
reads the arc of the music (loudness trend, onset density, how sustained or
percussive things are) and puts the engine into one of four phases:

- **Wash** — at the start, and again on major dynamic shifts, a soft
  translucent gradient sweep lays down an underpainting before any detail.
- **Melodic** — sustained, sparsely-attacked passages (a held note, a legato
  line) are drawn as one continuous flowing line tracing the pitch contour,
  instead of discrete stamps.
- **Rhythmic** — dense or loud passages get bolder marks, occasionally in an
  accent brush style different from the base one, for percussive emphasis.
- **Composing** — the default per-note stroke behavior.

The simulated "arm" also composes rather than scans: it's drawn toward a
slowly-relocating, rule-of-thirds focal area rather than sweeping the canvas
uniformly, so strokes build up around evolving areas of interest. Color hues
interpolate continuously between notes (no snapping to fixed steps), plus a
slow palette drift over the piece and per-stroke jitter, so the same note
never paints quite the same way twice.

Four selectable base brush styles (`src/paint/styles.ts`) give very different
results from the same audio:

| Style | Character |
|---|---|
| Kandinsky | Geometric arcs, concentric rings, straight lines |
| Klee | Small organic dabs and squares, quiet and gridded |
| Pollock | Flung drip paths and splatter, scaled by loudness |
| Picasso | Angular, overlapping cubist polygons |

Finished paintings can be saved to an in-browser **exhibit catalog**
(`localStorage`), each tagged with track name, style, and date — a small
nod to the gallery catalog described in the original concept.

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
    phraseTracker.ts musical phase detection (wash/melodic/rhythmic/composing)
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
