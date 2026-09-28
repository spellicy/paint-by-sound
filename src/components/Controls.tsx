import { useRef, useState } from "react";
import { PAINT_STYLES } from "../paint/types";
import type { PaintStyleId } from "../paint/types";
import type { SourceMode } from "../hooks/usePaintBySound";
import { SpotifyPicker } from "./SpotifyPicker";
import type { SpotifyTrack } from "../spotify/api";
import { isIOS } from "../platform";

interface ControlsProps {
  styleId: PaintStyleId;
  onStyleChange: (id: PaintStyleId) => void;
  sourceMode: SourceMode;
  onPlayFile: (file: File) => void;
  onPrepareFileUpload: () => void;
  onStartMic: () => void;
  onSpotifyTrackSelected: (track: SpotifyTrack) => void;
  onStop: () => void;
  onClear: () => void;
  onSave: () => void;
}

export function Controls({
  styleId,
  onStyleChange,
  sourceMode,
  onPlayFile,
  onPrepareFileUpload,
  onStartMic,
  onSpotifyTrackSelected,
  onStop,
  onClear,
  onSave,
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Fixed for the life of the tab.
  const [onIOS] = useState(isIOS);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Sound source
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStartMic}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              sourceMode === "mic"
                ? "bg-amber-600 text-stone-950"
                : "bg-amber-600/90 text-stone-950 hover:bg-amber-500"
            }`}
          >
            Listen live
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPlayFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => {
              // Resume audio here, inside this click, rather than waiting
              // for the file <input>'s change event -- that only fires
              // after the native file picker closes, an async gap some
              // browsers no longer count as close enough to the original
              // gesture to unsuspend audio.
              onPrepareFileUpload();
              fileInputRef.current?.click();
            }}
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-700"
          >
            Upload a file
          </button>
          {sourceMode !== "idle" && (
            <button
              onClick={onStop}
              className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-700"
            >
              Stop
            </button>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          <strong className="text-stone-400">Listen live</strong> uses the
          microphone to paint whatever's playing out loud nearby &mdash; a
          speaker, another device, or the room. Painting starts the moment
          it hears sound, no extra step.
        </p>
        {onIOS && (
          <p className="mt-1 text-xs leading-relaxed text-amber-500/90">
            On iPhone/iPad, play from a genuinely separate speaker or device
            &mdash; iOS forces echo cancellation on regardless of the source,
            so anything played through this same phone's own speaker gets
            filtered out as if it were an echo, leaving only room noise. The
            Spotify search below already accounts for this by playing on
            another device rather than this one.
          </p>
        )}
        <SpotifyPicker onTrackSelected={onSpotifyTrackSelected} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Brush style
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PAINT_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStyleChange(s.id)}
              title={s.blurb}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                styleId === s.id
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700"
              }`}
            >
              <div className="font-medium">{s.label}</div>
              <div className="mt-0.5 text-xs text-stone-500">{s.blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 rounded-md bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-white"
        >
          Save to gallery
        </button>
        <button
          onClick={onClear}
          className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-700"
        >
          Clear canvas
        </button>
      </div>
    </div>
  );
}
