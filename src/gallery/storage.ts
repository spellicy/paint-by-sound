import type { PaintStyleId } from "../paint/types";

export interface GalleryPiece {
  id: string;
  title: string;
  styleId: PaintStyleId;
  createdAt: number;
  dataUrl: string;
}

const STORAGE_KEY = "paint-by-sound.gallery.v1";
const MAX_PIECES = 24;

export function loadGallery(): GalleryPiece[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToGallery(piece: Omit<GalleryPiece, "id" | "createdAt">): GalleryPiece[] {
  const gallery = loadGallery();
  const entry: GalleryPiece = {
    ...piece,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [entry, ...gallery].slice(0, MAX_PIECES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full (data URLs are large) -- drop oldest half and retry once.
    const trimmed = next.slice(0, Math.ceil(next.length / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return trimmed;
    } catch {
      return gallery;
    }
  }
  return next;
}

export function removeFromGallery(id: string): GalleryPiece[] {
  const next = loadGallery().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
