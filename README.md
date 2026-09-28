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

All three ways of getting audio in live together in one **Sound source**
card. Alongside Listen live and Upload a file, a **Spotify** option lets
you search Spotify by name and play it right there, without needing
Spotify already open and active somewhere else first: connecting creates
an in-page Spotify Connect device (the Web Playback SDK,
`src/spotify/player.ts`, Premium required), and starting a track targets
that device directly. It only ever picks and starts a track -- Spotify's
own playback is DRM-protected and exposes no raw audio to the page even
when embedded, so painting the result still means hitting **Listen live**
afterward, same as any other external source. See `src/spotify/config.ts`
for the one-time setup (a free Spotify Developer app) this needs before it
works.

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

### Eleven painters, eleven different techniques

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
| Pollock | **All-over** — a continuous gestural sweep that roams and bounces across the *entire* canvas, no fixed subject | Wide-ranging, from near-black shadow to fully vivid, tracking pitch and key almost freely rather than one fixed earth-tone family |
| de Kooning | Two or three slashing strokes piled up in different directions per mark, overlaid with an independent looping black contour line and a palette-knife scrape, across focal areas | Hot flesh pink, cadmium red and yellow, clashing with whatever cool leftover a pitch's hue doesn't share with that warm cluster |
| Schiele | **Sparse** — a handful of isolated, angular contour marks across a mostly bare canvas, arm jumps between well-separated positions; each mark is a nervous multi-segment line with sharp elbows, never a smooth curve | Muted burnt red-orange, ochre and sickly olive, applied as a wash that hugs the contour and thins moving inward rather than filling evenly |
| Louis | **Stripe** — several narrow vertical color bands, each fed by its own pitch register and building up over the piece; soft, translucent-wash edges bleed across the gap into their neighbors, watercolor-style, rather than stopping in a clean line | Full spectrum of pure, vivid poured hues — red, orange, yellow, viridian, ultramarine, violet — never muted or earthy |
| Kandinsky | **All-over** — overlapping soft-edged circles of varying size scattered across the entire canvas, sometimes nested as a few concentric rings in a shifted hue, occasionally ringed in white or near-black | Jewel-toned primaries and secondaries spread across nearly the whole wheel, so overlaps read as genuinely different colors rather than shades of one family |
| Delaunay | **All-over** — concentric flat-color rings scattered across the canvas like his "Simultaneous Disks," largest ring first with each smaller one painted on top; sometimes only a half or a quarter of the disc appears, as if cropped by a neighboring shape | Full color-wheel spectrum in flat, high-contrast bands, punctuated by black and white/grey rings for structure — hard-edged, never blended |
| Martin | **Grid** — a fine, hand-ruled line sweeps steadily row by row at an unvarying, meditative pace | Barely-there pale washes drawn from a full twelve-hue wheel, one per pitch class, rather than just a few |
| Marden | **Flow** — a continuous, unhurried curling sweep (a gentler, slower-drifting cousin of Pollock's roam) produces long sinuous single-line loops | Loosely wandering hue across a handful of muted anchors, rather than settling on one fixed color per piece |
| Miro | **Sparse** — a handful of isolated biomorphic signs across a mostly bare canvas: an irregular amoeba blob, a looping calligraphic squiggle, a flat dot, a radiating star, or a watchful eye, picked at random per mark | A small, flat alphabet of pure poster-paint color — cadmium red, chrome yellow, ultramarine blue, leaf green — snapped hard to those few anchors rather than drifting across the spectrum |
| Albers | **Mosaic** — a persistent 4x4 grid of 16 cells tiles the whole canvas, echoing how his hundreds of "Homage to the Square" studies get exhibited together; pitch register selects which cell a note belongs to, and each hit fully repaints that cell's own nested squares, whose gap is widest at the top, equal at the sides, and narrowest at the bottom, the series' signature asymmetric niche | Warm, often muted earth tones — ochre, brick, rust, olive — persistent per cell like Rothko's bands, occasionally broken by one jarring contrasting color at the center |

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

The focal family (currently just de Kooning) plus the all-over family
(Pollock, Kandinsky, Delaunay) is phase-aware via `PhraseTracker` (`src/audio/phraseTracker.ts`), which reads the arc of the
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

Rothko, Schiele, Martin, Marden, Miro, and Albers paint continuously in
their own technique regardless of phase (that's how those painters actually worked), with
loudness and onset density modulating intensity and size rather than
switching modes.

### A dormant capability: title/lyrics-driven theme

An earlier version had an **Inspiration** panel where you could name the
piece and add key lyrics or mood words, which nudged the palette's warmth,
luminosity, and compositional turbulence, and could block in an abstract
subject shape (a horizon, a ridge of peaks, a spiral...) that the current
painter kept nudging the composition back toward. It was removed from the
UI — a typed title or a filename rarely carried enough signal to be worth
the extra input step — but the machinery it drove is still very much
present and wired up: `PaintEngine.setTheme`, the mood/subject lexicons
(`src/theme/lexicon.ts`, `src/theme/subjects.ts`), `themeAnalyzer.ts`, and
`paint/motifs.ts` are all intact, just permanently fed the neutral default
now that nothing ever calls `setTheme` with real text. Reviving this would
mean re-adding a caller (a title field, a track's actual metadata, lyrics
fetched from somewhere) rather than rebuilding any of the analysis itself.

Finished paintings can be saved to an in-browser **exhibit catalog**
(`IndexedDB`, holding up to 10 pieces), each tagged with track name, style,
and date — a small nod to the gallery catalog described in the original
concept. The canvas renders at a backing-store resolution several times
denser than its on-screen size (`PaintEngine`'s `RESOLUTION_SCALE`), so a
saved piece stays sharp at full size rather than the modest, slightly soft
raster a 1:1 screen capture would give. Each piece can
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
  gallery/storage.ts      IndexedDB-backed exhibit catalog
  gallery/saveImage.ts    Web Share API save, with anchor-download fallback
  spotify/config.ts       Client ID / redirect URI / scopes -- one-time setup lives here
  spotify/pkce.ts         PKCE code-verifier/challenge generation
  spotify/auth.ts         OAuth login redirect, token exchange, refresh, storage
  spotify/player.ts       Web Playback SDK -- the in-page Spotify Connect device
  spotify/api.ts          track search + start-playback (in-page device or active device)
  hooks/usePaintBySound.ts  wires audio + paint engine + theme into React state
  components/             Controls (incl. SpotifyPicker), StatusBar, ConceptPanel, Gallery
```

## Notes & limitations

- Pitch detection assumes monophonic-ish material (a solo, a lead line, a
  vocal); dense polyphonic mixes will still paint, just less "in tune" with
  any single note.
- Everything is local to the browser — no backend, no audio ever leaves the
  machine it's played on. Connecting Spotify is the one opt-in exception: it
  talks to Spotify's own API directly from the browser (OAuth via
  Authorization Code + PKCE, no server or client secret involved) purely to
  search tracks and start playback — never to read or analyze audio.
- The Spotify panel needs a Spotify Premium account — both starting
  playback at all and the in-page Web Playback SDK device are Premium-only
  on Spotify's side. It also needs a Spotify Developer app registered once
  per deployment; see `src/spotify/config.ts`. Reconnecting is required
  after any change to `SPOTIFY_SCOPES`, since a token issued under the old
  scope list won't carry a newly-added one.
- Safari's autoplay policy blocks the Web Playback SDK's internal audio
  element until a genuine click unlocks it — every Play click calls
  Spotify's documented `activateElement()`/`resume()` workaround for this
  (`spotify/player.ts`), but Safari specifically (mobile and desktop) has
  a known, currently unresolved gap in Spotify's own SDK where that
  doesn't always take effect on the first click. If Play reports a
  playback error, try it again.
- On iPhone/iPad, the in-page Web Playback SDK only works in Safari itself.
  Chrome, Firefox, Edge, and Opera on iOS are all required by Apple to embed
  Safari's own WebKit engine, but Apple reserves full DRM/protected-content
  playback — which Spotify's player needs — to Safari's own process, not to
  a third-party app merely embedding it. The SDK fails there every time, not
  just on the first click like the retry-able Safari quirk above; the app
  detects this (`spotify/player.ts`'s `isThirdPartyIOSBrowser`) and says so
  rather than implying a retry will help. Use Safari, or start the track via
  Spotify Connect on another device instead.
- Listen live disables the mic's echo cancellation and noise suppression
  (`audio/analyzer.ts`). Both are voice-call optimizations that, left on,
  actively suppress the very thing being painted whenever the source is
  playing through the same device's own speaker (the common case with the
  embedded Spotify player, or any source played on a laptop's built-in
  speakers): echo cancellation specifically models "what my speaker is
  outputting" and subtracts it from the mic input, so the song gets
  filtered out and mostly room noise passes through instead.
- On iPhone, Safari pauses other apps' audio the moment a page activates the
  microphone (an iOS platform restriction with no web API workaround), so
  **Listen live** can't hear music playing in another app on the same
  device — use a separate speaker/device, or **Upload a file** instead.
- This is a software concept demo, not a control system for physical
  hardware; adapting the same `NoteEvent` stream to drive an actual robotic
  arm would replace `PaintEngine` with a motion-control client.
