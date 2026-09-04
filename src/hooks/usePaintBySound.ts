import { useCallback, useEffect, useRef, useState } from "react";
import { SoundAnalyzer, type NoteEvent } from "../audio/analyzer";
import type { NoteColor } from "../audio/pitchColor";
import type { PaintPhase } from "../audio/phraseTracker";
import { PaintEngine } from "../paint/PaintEngine";
import type { PaintStyleId } from "../paint/types";
import { saveToGallery, type GalleryPiece } from "../gallery/storage";

export type SourceMode = "idle" | "file" | "mic";

export interface LiveStatus {
  note: string | null;
  octave: number | null;
  amplitude: number;
  isOnset: boolean;
  phase: PaintPhase | null;
}

export function usePaintBySound(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const analyzerRef = useRef<SoundAnalyzer | null>(null);
  const engineRef = useRef<PaintEngine | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [styleId, setStyleIdState] = useState<PaintStyleId>("kandinsky");
  const [sourceMode, setSourceMode] = useState<SourceMode>("idle");
  const [trackName, setTrackName] = useState<string>("");
  const [status, setStatus] = useState<LiveStatus>({
    note: null,
    octave: null,
    amplitude: 0,
    isOnset: false,
    phase: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new PaintEngine({
      canvas: canvasRef.current,
      styleId,
      onNoteRendered: (color: NoteColor, note: NoteEvent, phase: PaintPhase) => {
        setStatus({
          note: note.frequency > 0 ? color.noteName : null,
          octave: note.frequency > 0 ? color.octave : null,
          amplitude: note.amplitude,
          isOnset: note.isOnset,
          phase,
        });
      },
    });
    engine.clear();
    engineRef.current = engine;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current]);

  useEffect(() => {
    engineRef.current?.setStyle(styleId);
  }, [styleId]);

  const ensureAnalyzer = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new SoundAnalyzer();
    }
    return analyzerRef.current;
  }, []);

  const stop = useCallback(() => {
    analyzerRef.current?.stop();
    unsubRef.current?.();
    unsubRef.current = null;
    setSourceMode("idle");
  }, []);

  const playFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const analyzer = ensureAnalyzer();
        unsubRef.current?.();
        unsubRef.current = analyzer.onNote((note) => engineRef.current?.paintNote(note));
        setTrackName(file.name.replace(/\.[^/.]+$/, ""));
        setSourceMode("file");
        await analyzer.playFile(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not play that audio file.");
        setSourceMode("idle");
      }
    },
    [ensureAnalyzer],
  );

  const startMic = useCallback(async () => {
    setError(null);
    try {
      const analyzer = ensureAnalyzer();
      unsubRef.current?.();
      unsubRef.current = analyzer.onNote((note) => engineRef.current?.paintNote(note));
      setTrackName("Live input");
      setSourceMode("mic");
      await analyzer.startMic();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Microphone unavailable: ${e.message}`
          : "Microphone unavailable.",
      );
      setSourceMode("idle");
    }
  }, [ensureAnalyzer]);

  const clearCanvas = useCallback(() => {
    engineRef.current?.clear();
  }, []);

  const setStyleId = useCallback((id: PaintStyleId) => {
    setStyleIdState(id);
  }, []);

  const saveCurrentToGallery = useCallback((): GalleryPiece[] | null => {
    if (!engineRef.current) return null;
    const dataUrl = engineRef.current.toDataURL();
    return saveToGallery({
      title: trackName || "Untitled listening",
      styleId,
      dataUrl,
    });
  }, [styleId, trackName]);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      analyzerRef.current?.stop();
    };
  }, []);

  return {
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
  };
}
