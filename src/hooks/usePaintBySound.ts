import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SoundAnalyzer, type NoteEvent } from "../audio/analyzer";
import type { NoteColor } from "../audio/pitchColor";
import type { PaintPhase } from "../audio/phraseTracker";
import { PaintEngine } from "../paint/PaintEngine";
import type { PaintStyleId } from "../paint/types";
import { saveToGallery, type GalleryPiece } from "../gallery/storage";
import { analyzeTheme, type ThemeInfluence } from "../theme/themeAnalyzer";

export type SourceMode = "idle" | "file" | "mic";

export interface LiveStatus {
  note: string | null;
  octave: number | null;
  amplitude: number;
  isOnset: boolean;
  phase: PaintPhase | null;
  keyMode: "major" | "minor" | null;
  keyConfidence: number;
  keyTonic: number | null;
}

export function usePaintBySound(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const analyzerRef = useRef<SoundAnalyzer | null>(null);
  const engineRef = useRef<PaintEngine | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [styleId, setStyleIdState] = useState<PaintStyleId>("kandinsky");
  const [sourceMode, setSourceMode] = useState<SourceMode>("idle");
  const [trackName, setTrackName] = useState<string>("");
  const [inspirationTitle, setInspirationTitle] = useState<string>("");
  const [inspirationLyrics, setInspirationLyrics] = useState<string>("");
  const inspirationTitleRef = useRef("");
  useEffect(() => {
    inspirationTitleRef.current = inspirationTitle;
  }, [inspirationTitle]);
  const [status, setStatus] = useState<LiveStatus>({
    note: null,
    octave: null,
    amplitude: 0,
    isOnset: false,
    phase: null,
    keyMode: null,
    keyConfidence: 0,
    keyTonic: null,
  });
  const [error, setError] = useState<string | null>(null);

  const themeInfluence = useMemo<ThemeInfluence>(
    () => analyzeTheme(`${inspirationTitle} ${inspirationLyrics}`),
    [inspirationTitle, inspirationLyrics],
  );

  useEffect(() => {
    engineRef.current?.setTheme(themeInfluence);
  }, [themeInfluence]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new PaintEngine({
      canvas: canvasRef.current,
      styleId,
      onNoteRendered: (color: NoteColor, note: NoteEvent, phase: PaintPhase) => {
        const key = analyzerRef.current?.getKeyEstimate();
        setStatus({
          note: note.frequency > 0 ? color.noteName : null,
          octave: note.frequency > 0 ? color.octave : null,
          amplitude: note.amplitude,
          isOnset: note.isOnset,
          phase,
          keyMode: key?.mode ?? null,
          keyConfidence: key?.confidence ?? 0,
          keyTonic: key?.tonic ?? null,
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
        unsubRef.current = analyzer.onNote((note) => {
          engineRef.current?.setKeyEstimate(analyzer.getKeyEstimate());
          engineRef.current?.paintNote(note);
        });
        const name = file.name.replace(/\.[^/.]+$/, "");
        setTrackName(name);
        // Only auto-fill the inspiration title from the filename if the
        // user hasn't typed their own -- don't clobber a title they set.
        if (!inspirationTitleRef.current.trim()) {
          setInspirationTitle(humanizeFilename(name));
        }
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
      unsubRef.current = analyzer.onNote((note) => {
        engineRef.current?.setKeyEstimate(analyzer.getKeyEstimate());
        engineRef.current?.paintNote(note);
      });
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
    inspirationTitle,
    setInspirationTitle,
    inspirationLyrics,
    setInspirationLyrics,
    themeInfluence,
  };
}

/** "my_song-title_final" -> "my song title final" */
function humanizeFilename(name: string): string {
  return name.replace(/[_-]+/g, " ").trim();
}
