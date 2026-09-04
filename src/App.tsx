import { useEffect, useRef, useState } from "react";
import { usePaintBySound } from "./hooks/usePaintBySound";
import { Controls } from "./components/Controls";
import { StatusBar } from "./components/StatusBar";
import { ConceptPanel } from "./components/ConceptPanel";
import { InspirationPanel } from "./components/InspirationPanel";
import { Gallery } from "./components/Gallery";
import { loadGallery, removeFromGallery, type GalleryPiece } from "./gallery/storage";

const CANVAS_SIZE = { width: 1000, height: 700 };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    styleId,
    setStyleId,
    sourceMode,
    trackName,
    status,
    error,
    playFile,
    startMic,
    stop,
    clearCanvas,
    saveCurrentToGallery,
    inspirationTitle,
    setInspirationTitle,
    inspirationLyrics,
    setInspirationLyrics,
    themeInfluence,
  } = usePaintBySound(canvasRef);

  const [pieces, setPieces] = useState<GalleryPiece[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setPieces(loadGallery());
  }, []);

  const handleSave = () => {
    const next = saveCurrentToGallery();
    if (next) {
      setPieces(next);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const handleRemove = (id: string) => {
    setPieces(removeFromGallery(id));
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
          <div className="overflow-hidden rounded-lg border border-stone-800 bg-[#e8e2d5] p-3 shadow-inner">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE.width}
              height={CANVAS_SIZE.height}
              className="w-full rounded bg-[#f7f3ec]"
            />
          </div>
          <StatusBar status={status} sourceMode={sourceMode} trackName={trackName} />
          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <InspirationPanel
            title={inspirationTitle}
            onTitleChange={setInspirationTitle}
            lyrics={inspirationLyrics}
            onLyricsChange={setInspirationLyrics}
            theme={themeInfluence}
          />
          <ConceptPanel />
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
            <Controls
              styleId={styleId}
              onStyleChange={setStyleId}
              sourceMode={sourceMode}
              onPlayFile={playFile}
              onStartMic={startMic}
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
