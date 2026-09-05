# Paint by Sound

> "The eyes are made for astronomy, the ears for harmony, and these are sister
> sciences." — Wassily Kandinsky

A browser-based simulator for **Paint by Sound**, an invention concept by
Stephen Spellicy: an AI-driven artform where a robotic arm paints abstract,
modern-art canvases live, guided entirely by music — pitch mapped to color,
loudness and timbre mapped to brushstroke and gesture.

This app stands in for the physical installation. It listens to whatever
audio you play, analyzes it in real time, and drives a virtual brush across
a canvas the same way the concept's robotic arm would drive a real one.

**Listen live** turns on the microphone and paints whatever it hears out
loud nearby — a speaker, another device, the room — starting the instant it
hears sound, no separate "start painting" step. On iPhone specifically,
activating the microphone makes iOS pause audio playing in *other* apps
(Apple Music, Spotify, etc.) — a platform restriction, not something a
website can override — so Listen Live can't hear a track playing on the
*same* phone. Play the track through a separate speaker or device for this
phone to listen to, or use **Upload a file** instead, which plays an
MP3/WAV directly and works reliably on a single device with no microphone
involved.

## How it listens

Everything runs client-side on the Web Audio API:

- **Pitch** — autocorrelation on the time-domain signal, converted to a note
  name and octave.
- **Loudness** — RMS amplitude, smoothed over a short rolling window.
- **Timbre** — spectral centroid (brightness of the sound), affecting tint.
- **Onsets** — a simple adaptive energy threshold flags the start of a new
  note/hit, triggering a fresh brush gesture.
- **Key (major/minor)** — a rolling, amplitude-weighted pitch-class
  histogram correlated against the classic Krumhansl-Kessler major/minor
  key profiles (`src/audio/keyDetector.ts`), the same technique real
  music-information-retrieval key finders use. It's a slow-forming signal
  by nature — a few seconds of material before it can commit to a guess,
  and it keeps drifting with the piece rather than averaging everything
  played so far — shown live in the status bar once confident enough.

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
one full-saturation rainbow applied uniformly to everyone. The roster spans
raw, emotionally-driven mark-making across a century — Schiele's anxious
Viennese Expressionism, the New York School's gesture and color-field
painting, and the painters who carried that lineage into minimalism:

| Style | Composition | Palette |
|---|---|---|
| Rothko | The canvas divided into a few large horizontal **color fields**; pitch register selects which field a note reinforces, building soft-edged, full-bleed bands | Deep maroon, burnt orange, plum, mustard — luminous through layering, not raw brightness |
| Pollock | **All-over** — a continuous gestural sweep that roams and bounces across the *entire* canvas, no fixed subject | Earthy umber and sienna, mostly desaturated, with a rare cadmium-red accent |
| de Kooning | Two or three slashing strokes piled up in different directions per mark, overlaid with an independent looping black contour line and a palette-knife scrape, across focal areas | Hot flesh pink, cadmium red and yellow, clashing with whatever cool leftover a pitch's hue doesn't share with that warm cluster |
| Schiele | **Sparse** — a handful of isolated, angular contour marks across a mostly bare canvas, arm jumps between well-separated positions; each mark is a nervous multi-segment line with sharp elbows, never a smooth curve | Muted burnt red-orange, ochre and sickly olive, applied as a wash that hugs the contour and thins moving inward rather than filling evenly |
| Kelly | Fragmented flat forms across focal areas — one crisp, hard-edged shape per stroke, no blur or blending | Pure saturated primaries and secondaries: red, orange, yellow, green, blue |
| Martin | **Grid** — a fine, hand-ruled line sweeps steadily row by row at an unvarying, meditative pace | Barely-there pale tan, pale blue, pale pink washes |
| Marden | **Flow** — a continuous, unhurried curling sweep (a gentler, slower-drifting cousin of Pollock's roam) produces long sinuous single-line loops | Muted, near-monochrome ochre, sage and slate per piece |

### Major and minor

Every palette above also responds to the detected key's mode
(`src/paint/palettes.ts`, fed by `keyDetector.ts`): major-key material leans
the whole canvas brighter and a touch more saturated, minor-key material
leans it darker and more muted — the same emotional shorthand major/minor
already carries for composers and listeners, just applied to paint instead
of the staff. It's confidence-scaled, so this eases in as the detector's
guess firms up rather than snapping the moment a key is guessed. **de
Kooning** gets one further step: on minor-key material, his usual hot flesh/
red/yellow palette eases toward black-and-white as confidence climbs —
evoking the stark black enamel paintings he turned to in the late 1940s —
while major-key pieces keep his normal heated coloring.

The focal family (de Kooning, Kelly) plus Pollock is phase-aware via
`PhraseTracker` (`src/audio/phraseTracker.ts`), which reads the arc of the
music (loudness trend, onset density, how sustained or percussive things
are) and puts the engine into one of four phases:

- **Wash** — at the start, and again on major dynamic shifts, a soft
  translucent gradient sweep lays down an underpainting before any detail.
- **Melodic** — sustained, sparsely-attacked passages (a held note, a legato
  line) are drawn as one continuous flowing line tracing the pitch contour,
  instead of discrete stamps.
- **Rhythmic** — dense or loud passages get bolder marks, occasionally in an
  accent brush style different from the base one, for percussive emphasis.
- **Composing** — the default per-note stroke behavior.

Rothko, Schiele, Martin, and Marden paint continuously in their own technique
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

Naming an actual subject or place — *seaside*, *mountains*, *a city
skyline*, *starry night* — goes a step further: a separate curated lexicon
(`src/theme/subjects.ts`) reads it into a handful of abstract visual
primitives (a horizon line, a ridge of peaks, a stand of verticals, a
sun/moon disc, a spiral...) and the paint engine blocks those in early in
the piece, and keeps quietly nudging the composition back toward them for
the rest of it, in the *current painter's own hand* — the same "seaside"
horizon comes out as a Rothko color-field band, a length of Marden's
flowing line, or a scatter of Schiele's isolated contours, never as separate
representational drawing code (`PaintEngine.paintMotifUnderlay`,
`src/paint/motifs.ts`). It's a bias, not a template: the music-driven
painting in `paintNote` keeps
running exactly as before, layered on top. Pollock's genuinely all-over
technique explicitly has no fixed subject (that's the whole point of
Pollock), so it opts out of shape bias entirely and only picks up the
subject's palette lean, the same as an untitled piece would.

Finished paintings can be saved to an in-browser **exhibit catalog**
(`localStorage`), each tagged with track name, style, and date — a small
nod to the gallery catalog described in the original concept. Each piece can
be deleted (a trash icon on the thumbnail, always visible — not hover-only,
so it works on touch devices) or saved out via the Web Share API
(`src/gallery/saveImage.ts`), which opens the native "Save Image" sheet on
iOS/Android; browsers without share support fall back to a normal download.

## Running it

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run preview   # serve the production build locally
```

Open the app, tap "Listen live" (or "Upload a file"), pick a brush style,
and play some music. The canvas keeps painting for as long as audio plays.

## Project layout

```
src/
  audio/analyzer.ts       Web Audio pitch/loudness/timbre/onset analysis
  audio/pitchColor.ts     note -> synesthetic color mapping (continuous hue)
  audio/phraseTracker.ts  musical phase detection (wash/melodic/rhythmic/composing)
  audio/keyDetector.ts    rolling pitch-class histogram -> major/minor key estimate
  theme/lexicon.ts        mood-word -> warmth/luminosity/turbulence lookup
  theme/subjects.ts       subject-word -> abstract shape primitives lookup
  theme/themeAnalyzer.ts  reads a title/lyrics into a ThemeInfluence
  paint/PaintEngine.ts    per-style composition strategy + stroke dispatch
  paint/palettes.ts       each painter's signature color palette
  paint/styles.ts         the per-note brush-style renderers
  paint/motifs.ts         subject primitive -> canvas anchor points
  gallery/storage.ts      localStorage-backed exhibit catalog
  gallery/saveImage.ts    Web Share API save, with anchor-download fallback
  hooks/usePaintBySound.ts  wires audio + paint engine + theme into React state
  components/             Controls, StatusBar, ConceptPanel, InspirationPanel, Gallery
```

## Notes & limitations

- Pitch detection assumes monophonic-ish material (a solo, a lead line, a
  vocal); dense polyphonic mixes will still paint, just less "in tune" with
  any single note.
- Everything is local to the browser — no backend, no accounts, no audio
  ever leaves the machine it's played on.
- On iPhone, Safari pauses other apps' audio the moment a page activates the
  microphone (an iOS platform restriction with no web API workaround), so
  **Listen live** can't hear music playing in another app on the same
  device — use a separate speaker/device, or **Upload a file** instead.
- This is a software concept demo, not a control system for physical
  hardware; adapting the same `NoteEvent` stream to drive an actual robotic
  arm would replace `PaintEngine` with a motion-control client.
