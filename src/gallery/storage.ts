import type { PaintStyleId } from "../paint/types";

export interface GalleryPiece {
  id: string;
  title: string;
  styleId: PaintStyleId;
  createdAt: number;
  dataUrl: string;
}

const DB_NAME = "paint-by-sound";
const DB_VERSION = 1;
const STORE_NAME = "gallery";
const MAX_PIECES = 10;

// Each saved piece is a full-resolution PNG data URL (roughly 1-1.5MB) --
// localStorage's ~5MB per-origin quota only ever held 3-4 of those before
// setItem started silently failing, well short of the intended cap.
// IndexedDB's quota is a large fraction of free disk space, comfortably
// holding MAX_PIECES full-resolution images.
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadGallery(): Promise<GalleryPiece[]> {
  try {
    const all = await withStore<GalleryPiece[]>("readonly", (store) => store.getAll());
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveToGallery(
  piece: Omit<GalleryPiece, "id" | "createdAt">,
): Promise<GalleryPiece[]> {
  const entry: GalleryPiece = {
    ...piece,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  try {
    await withStore("readwrite", (store) => store.put(entry));
  } catch {
    // Storage genuinely full -- report whatever's already there.
    return loadGallery();
  }
  const gallery = await loadGallery();
  const overflow = gallery.slice(MAX_PIECES);
  if (overflow.length > 0) {
    await Promise.all(overflow.map((p) => withStore("readwrite", (store) => store.delete(p.id))));
  }
  return gallery.slice(0, MAX_PIECES);
}

export async function removeFromGallery(id: string): Promise<GalleryPiece[]> {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // ignore -- fall through to reporting current state
  }
  return loadGallery();
}
