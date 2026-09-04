import { useState } from "react";
import type { GalleryPiece } from "../gallery/storage";
import { PAINT_STYLES } from "../paint/types";

interface GalleryProps {
  pieces: GalleryPiece[];
  onRemove: (id: string) => void;
}

const styleLabel = (id: GalleryPiece["styleId"]) =>
  PAINT_STYLES.find((s) => s.id === id)?.label ?? id;

export function Gallery({ pieces, onRemove }: GalleryProps) {
  const [openPiece, setOpenPiece] = useState<GalleryPiece | null>(null);

  if (pieces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-800 px-5 py-8 text-center text-sm text-stone-500">
        Nothing exhibited yet &mdash; save a painting to start the catalog.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {pieces.map((p) => (
          <figure
            key={p.id}
            className="group relative overflow-hidden rounded-md border border-stone-800 bg-stone-900"
          >
            <button className="block w-full" onClick={() => setOpenPiece(p)}>
              <img src={p.dataUrl} alt={p.title} className="aspect-square w-full object-cover" />
            </button>
            <figcaption className="border-t border-stone-800 px-2 py-1.5 text-left">
              <div className="truncate text-xs font-medium text-stone-200">{p.title}</div>
              <div className="text-[10px] text-stone-500">
                {styleLabel(p.styleId)} &middot; {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </figcaption>
            <button
              onClick={() => onRemove(p.id)}
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-stone-950/80 text-xs text-stone-300 hover:text-red-400 group-hover:flex"
              aria-label="Remove from gallery"
            >
              ×
            </button>
          </figure>
        ))}
      </div>

      {openPiece && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setOpenPiece(null)}
        >
          <div
            className="max-h-full max-w-2xl overflow-auto rounded-lg bg-stone-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={openPiece.dataUrl} alt={openPiece.title} className="rounded-md" />
            <div className="mt-3 flex items-center justify-between text-sm text-stone-300">
              <div>
                <div className="font-medium">{openPiece.title}</div>
                <div className="text-xs text-stone-500">
                  {styleLabel(openPiece.styleId)} &middot;{" "}
                  {new Date(openPiece.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={openPiece.dataUrl}
                  download={`${openPiece.title || "painting"}.png`}
                  className="rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-900 hover:bg-white"
                >
                  Download
                </a>
                <button
                  onClick={() => setOpenPiece(null)}
                  className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
