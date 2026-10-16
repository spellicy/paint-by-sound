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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  // document.fullscreenEnabled is a real feature check, not a guess -- but
  // iPhone Safari (unlike iPad, which gained this in iOS 16.4) has a long
  // history of declaring support it doesn't reliably honor for a plain
  // element, so toggleFullscreen below still has to handle a rejected
  // request on top of this, rather than trusting this flag alone.
  const [fullscreenSupported] = useState(
    () => typeof document !== "undefined" && document.fullscreenEnabled,
  );
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

  // Tracks real fullscreen state rather than just the button's own intent,
  // since the browser's own Esc handling (or any other way out) exits
  // fullscreen without going through toggleFullscreen below -- without
  // this listener the UI would keep showing the fullscreen layout after
  // the browser had already left it.
  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === canvasWrapRef.current);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const el = canvasWrapRef.current;
    if (!el?.requestFullscreen) {
      setFullscreenError("Full screen isn't available in this browser.");
      return;
    }
    el.requestFullscreen().catch(() => {
      // iPhone Safari in particular can report fullscreenEnabled: true and
      // still reject the actual request -- fail visibly instead of the
      // button silently doing nothing.
      setFullscreenError("Full screen isn't available in this browser.");
      setTimeout(() => setFullscreenError(null), 3000);
    });
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
              isFullscreen
                ? "relative flex h-screen w-screen items-center justify-center bg-black"
                : "group relative overflow-hidden rounded-lg border border-stone-800 bg-[#e8e2d5] p-3 shadow-inner"
            }
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE.width}
              height={CANVAS_SIZE.height}
              className={
                isFullscreen
                  ? "h-auto max-h-screen w-auto max-w-[100vw] bg-[#f7f3ec]"
                  : "w-full rounded bg-[#f7f3ec]"
              }
            />
            {isFullscreen ? (
              <button
                onClick={toggleFullscreen}
                className="absolute right-5 top-5 rounded-md bg-stone-950/70 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-950/90"
              >
                Exit full screen
              </button>
            ) : (
              fullscreenSupported && (
                <button
                  onClick={toggleFullscreen}
                  title="Full screen"
                  aria-label="Full screen"
                  className="absolute right-5 top-5 rounded-md bg-stone-950/60 p-1.5 text-stone-200 opacity-0 transition hover:bg-stone-950/85 group-hover:opacity-100"
                >
                  <FullscreenIcon />
                </button>
              )
            )}
          </div>
          {fullscreenError && (
            <p className="text-xs text-amber-500">{fullscreenError}</p>
          )}
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
