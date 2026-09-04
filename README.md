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

Every stroke also gets **impasto shading** (`applyImpasto` in
`src/paint/styles.ts`): a soft dark shadow cast down-right, plus a small
bright sheen up-left, screen-blended so it only ever brightens. Canvas 2D
has no real lighting model, but that two-sided cue — shadow where thick
paint would block a gallery light, a highlight where it would catch one —
is enough to read as raised, textured paint instead of flat color. It's
applied once, geometry-agnostic, in the shared stroke dispatcher, so all
ten painters' brushwork gets it uniformly with no changes to the individual
renderers. Rothko's soft-edged color fields (rendered directly, not through
that dispatcher) deliberately skip it — his technique is luminous layering,
not relief, and embossing it would fight the look.

Painting isn't one stamp per note. Color hues interpolate continuously
between notes (no snapping to fixed steps), plus a slow palette drift over
the piece and per-stroke jitter, so the same note never paints quite the
same way twice.

### Ten painters, ten different techniques

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
| Cézanne | Constructive hatched planes across focal areas — small parallel rectangular strokes at one of a few fixed angles, patched together | Muted structured naturalism: blue, green, ochre, terracotta |
| Dalí | **Sparse** — most notes are skipped so the arm places only a few, well-separated forms across a mostly empty canvas, each a smooth melting droop with a long cast shadow | Warm desert sand and rust against a stark dream-sky blue |
| Van Gogh | **Swirl** — a persistent, slowly-drifting curl (not random jitter) produces extended spiraling loops, like the sky in *Starry Night*; thick layered impasto strokes follow the arm's direction of travel | Bold complementary contrast: gold/yellow against deep blue, with a hot orange accent |

### Major and minor

Every palette above also responds to the detected key's mode
(`src/paint/palettes.ts`, fed by `keyDetector.ts`): major-key material leans
the whole canvas brighter and a touch more saturated, minor-key material
leans it darker and more muted — the same emotional shorthand major/minor
already carries for composers and listeners, just applied to paint instead
of the staff. It's confidence-scaled, so this eases in as the detector's
guess firms up rather than snapping the moment a key is guessed. **Picasso**
gets one further step: on minor-key material, his usual analytic-cubist
ochre/blue-grey palette eases toward black-and-white as confidence climbs —
evoking *Guernica*, the black-and-white political mural he turned to for his
most anguished work — while major-key Picasso pieces keep his normal
cubist coloring.

The gestural/geometric family (Kandinsky, Klee, Picasso, Pollock, Cézanne) is
also phase-aware via `PhraseTracker` (`src/audio/phraseTracker.ts`), which
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

Rothko, Renoir, Monet, Dalí, and Van Gogh paint continuously in their own
technique regardless of phase (that's how those painters actually worked),
with loudness and onset density modulating intensity and size rather than
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
horizon comes out as a Rothko color-field band, a row of Monet broken-color
dabs, or a line of Van Gogh impasto, never as separate representational
drawing code (`PaintEngine.paintMotifUnderlay`, `src/paint/motifs.ts`). It's
a bias, not a template: the music-driven painting in `paintNote` keeps
running exactly as before, layered on top. Pollock's genuinely all-over
technique explicitly has no fixed subject (that's the whole point of
Pollock), so it opts out of shape bias entirely and only picks up the
subject's palette lean, the same as an untitled piece would.

Beyond landscapes, the same mechanism paints literal subjects: name *a
cat*, *a person*, *a tree*, *a boat*, and a small library of parametric
silhouettes (`src/paint/silhouettes.ts`) -- each built from a handful of
simple shapes, an ellipse body, a circle head, a couple of triangle ears --
gets sampled into hundreds of points along its outline and scattered
through its interior, then handed to the selected painter's *own* stroke
renderer exactly like the landscape primitives are. The abstraction is
entirely in how a painter's technique marks down those points: the same
cat comes out as soft impressionist dabs through Monet, looping impasto
through Van Gogh, or a jumbled, barely-legible cluster of fragmented planes
through Picasso -- which is, per the concept this app is modeling, roughly
how Picasso *would* paint a cat. Because it's driven by geometry and each
painter's existing `renderStroke` implementation rather than any
painter-specific drawing code, a new painter added to the roster gets this
for free. The library ships with people, cats, dogs, birds, trees, houses,
flowers, boats, cars, stars, and hearts, and is meant to keep growing.

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
  theme/subjects.ts       subject-word -> landscape primitive/figure lookup
  theme/themeAnalyzer.ts  reads a title/lyrics into a ThemeInfluence
  paint/PaintEngine.ts    per-style composition strategy + stroke dispatch
  paint/palettes.ts       each painter's signature color palette
  paint/styles.ts         the per-note brush-style renderers
  paint/motifs.ts         subject primitive/figure -> canvas anchor points
  paint/silhouettes.ts    parametric literal-subject library (cat, person, tree, ...)
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
