import { useEffect, useRef, useState } from "react";
import { usePaintBySound } from "./hooks/usePaintBySound";
import { Controls } from "./components/Controls";
import { StatusBar } from "./components/StatusBar";
import { ConceptPanel } from "./components/ConceptPanel";
import { Gallery } from "./components/Gallery";
import { loadGallery, removeFromGallery, type GalleryPiece } from "./gallery/storage";

const CANVAS_SIZE = { width: 1000, height: 700 };

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  // Drives the actual "fill the screen" layout by itself, via plain CSS --
  // deliberately not gated on the browser's Fullscreen API being supported
  // (document.fullscreenEnabled), since that API is genuinely unreliable on
  // iPhone Safari specifically: it can report that flag as true and still
  // reject the real request for a plain element (iPad, unlike iPhone, got
  // real support in iOS 16.4). Gating the button's very existence on that
  // flag, as an earlier version of this did, meant the button just didn't
  // exist at all on the one platform this app has been tested on the most.
  // The real Fullscreen API is still requested below, best-effort, as a
  // bonus layer (hides the browser chrome too) on top of this CSS layout
  // where it happens to work -- but the core feature never depends on it.
  const [isMaximized, setIsMaximized] = useState(false);
  const {
    styleId,
    setStyleId,
    sourceMode,
    trackName,
    status,
    error,
    playFile,
    prepareFileUpload,
    startMic,
    playAudiusTrack,
    stop,
    clearCanvas,
    saveCurrentToGallery,
  } = usePaintBySound(canvasRef);

  const [pieces, setPieces] = useState<GalleryPiece[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    void loadGallery().then(setPieces);
  }, []);

  // If the bonus real-fullscreen layer (see enterFullscreen) is active and
  // the browser's own Esc handling (or any other route) exits it, drop out
  // of maximized mode too rather than leaving the CSS layout stranded on
  // screen with no real fullscreen underneath it.
  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) setIsMaximized(false);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Esc exits maximized mode even when the real Fullscreen API never
  // engaged (so no native fullscreenchange will ever fire) -- most
  // reliably the case on iPhone. A no-op the rest of the time, since a
  // successful real-fullscreen exit already sets isMaximized false via the
  // listener above before this would otherwise fire a second time.
  useEffect(() => {
    if (!isMaximized) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMaximized(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMaximized]);

  // Locks background scroll while maximized -- the fixed overlay covers
  // the viewport either way, but without this the page behind it can still
  // scroll under touch, which iOS Safari in particular renders as visible
  // jank around a position: fixed element during momentum scrolling.
  useEffect(() => {
    if (!isMaximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMaximized]);

  const toggleFullscreen = () => {
    if (isMaximized) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setIsMaximized(false);
      return;
    }
    setIsMaximized(true);
    // Best-effort real fullscreen on top of the CSS layout above -- hides
    // the browser's own chrome too, where supported. Silently ignored if
    // not: the CSS layout alone already delivers the actual "fill the
    // screen, exit to get the app back" experience on every platform.
    void canvasWrapRef.current?.requestFullscreen?.().catch(() => {});
  };

  const handleSave = async () => {
    const next = await saveCurrentToGallery();
    if (next) {
      setPieces(next);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const handleRemove = (id: string) => {
    void removeFromGallery(id).then(setPieces);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Paint <span className="text-amber-500">by</span> Sound
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          An AI-driven artform &mdash; music, translated live into abstract painting.
        </p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div
            ref={canvasWrapRef}
            className={
              isMaximized
                ? "fixed inset-0 z-50 flex items-center justify-center bg-black"
                : "relative overflow-hidden rounded-lg border border-stone-800 bg-[#e8e2d5] p-3 shadow-inner"
            }
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE.width}
              height={CANVAS_SIZE.height}
              className={
                isMaximized
                  ? "h-auto max-h-screen w-auto max-w-[100vw] bg-[#f7f3ec]"
                  : "w-full rounded bg-[#f7f3ec]"
              }
            />
            {isMaximized ? (
              <button
                onClick={toggleFullscreen}
                className="absolute right-5 top-5 rounded-md bg-stone-950/70 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-950/90"
              >
                Exit full screen
              </button>
            ) : (
              <button
                onClick={toggleFullscreen}
                title="Full screen"
                aria-label="Full screen"
                className="absolute right-5 top-5 rounded-md bg-stone-950/60 p-1.5 text-stone-200 hover:bg-stone-950/85"
              >
                <FullscreenIcon />
              </button>
            )}
          </div>
          <StatusBar status={status} sourceMode={sourceMode} trackName={trackName} />
          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <ConceptPanel />
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
            <Controls
              styleId={styleId}
              onStyleChange={setStyleId}
              sourceMode={sourceMode}
              onPlayFile={playFile}
              onPrepareFileUpload={prepareFileUpload}
              onStartMic={startMic}
              onAudiusTrackSelected={playAudiusTrack}
              onStop={stop}
              onClear={clearCanvas}
              onSave={handleSave}
            />
            {savedFlash && (
              <p className="mt-3 text-xs font-medium text-emerald-400">Saved to gallery.</p>
            )}
          </div>
        </aside>
      </main>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Exhibit catalog
        </h2>
        <Gallery pieces={pieces} onRemove={handleRemove} />
      </section>
    </div>
  );
}
