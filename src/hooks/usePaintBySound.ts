import { useCallback, useEffect, useRef, useState } from "react";
import { SoundAnalyzer, type NoteEvent } from "../audio/analyzer";
import type { NoteColor } from "../audio/pitchColor";
import type { PaintPhase } from "../audio/phraseTracker";
import { PaintEngine } from "../paint/PaintEngine";
import type { PaintStyleId } from "../paint/types";
import { saveToGallery, type GalleryPiece } from "../gallery/storage";
import type { AudiusTrack } from "../audius/api";

export type SourceMode = "idle" | "file" | "mic" | "audius";

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

  const [styleId, setStyleIdState] = useState<PaintStyleId>("rothko");
  const [sourceMode, setSourceMode] = useState<SourceMode>("idle");
  const [trackName, setTrackName] = useState<string>("");
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

  /** Resume the (possibly brand-new) AudioContext synchronously inside the
   * "Upload a file" button's own click, before the native file picker ever
   * opens. Without this, the only resume() call happens in `playFile`,
   * inside the <input>'s change handler -- which only fires after that
   * picker closes, an async gap some browsers no longer treat as close
   * enough to the original click to unsuspend audio, leaving playFile's
   * resume() a silent no-op (file "loads" but nothing plays or paints
   * until a later, unambiguous gesture like Listen Live resumes the same
   * underlying context). */
  const prepareFileUpload = useCallback(() => {
    const analyzer = ensureAnalyzer();
    void analyzer.audioContext.resume();
  }, [ensureAnalyzer]);

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

  /** A track picked via the Audius search panel. Unlike the earlier Spotify
   * integration this replaced, Audius serves plain, non-DRM audio, so it's
   * fetched and decoded straight into the analyzer here -- no separate
   * "Listen live" capture step needed, exactly like playFile. */
  const playAudiusTrack = useCallback(
    async (track: AudiusTrack) => {
      setError(null);
      try {
        const analyzer = ensureAnalyzer();
        unsubRef.current?.();
        unsubRef.current = analyzer.onNote((note) => {
          engineRef.current?.setKeyEstimate(analyzer.getKeyEstimate());
          engineRef.current?.paintNote(note);
        });
        setTrackName(`${track.title} — ${track.artist}`);
        setSourceMode("audius");
        await analyzer.playUrl(track.streamUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not play that track.");
        setSourceMode("idle");
      }
    },
    [ensureAnalyzer],
  );

  const clearCanvas = useCallback(() => {
    engineRef.current?.clear();
  }, []);

  const setStyleId = useCallback((id: PaintStyleId) => {
    setStyleIdState(id);
  }, []);

  const saveCurrentToGallery = useCallback(async (): Promise<GalleryPiece[] | null> => {
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
    prepareFileUpload,
    startMic,
    playAudiusTrack,
    stop,
    clearCanvas,
    saveCurrentToGallery,
  };
}
