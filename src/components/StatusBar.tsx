import type { LiveStatus, SourceMode } from "../hooks/usePaintBySound";
import { NOTE_NAMES } from "../audio/pitchColor";

interface StatusBarProps {
  status: LiveStatus;
  sourceMode: SourceMode;
  trackName: string;
}

const PHASE_LABEL: Record<NonNullable<LiveStatus["phase"]>, string> = {
  wash: "Wash",
  melodic: "Melodic",
  rhythmic: "Rhythmic",
  building: "Composing",
};

export function StatusBar({ status, sourceMode, trackName }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-stone-800 bg-stone-950/60 px-4 py-2 text-xs text-stone-400">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            sourceMode !== "idle" ? "bg-emerald-500 animate-pulse" : "bg-stone-700"
          }`}
        />
        <span>
          {sourceMode === "idle" ? "No source playing" : trackName || "Listening…"}
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono">
        {status.phase && (
          <span>
            <span className="text-amber-400">{PHASE_LABEL[status.phase]}</span>
          </span>
        )}
        <span>
          Note:{" "}
          <span className="text-stone-200">
            {status.note ? `${status.note}${status.octave ?? ""}` : "—"}
          </span>
        </span>
        <span>
          Amp: <span className="text-stone-200">{Math.round(status.amplitude * 100)}%</span>
        </span>
        {status.keyMode && status.keyTonic !== null && (
          <span>
            Key:{" "}
            <span
              className={status.keyMode === "major" ? "text-amber-200" : "text-indigo-300"}
            >
              {NOTE_NAMES[status.keyTonic]} {status.keyMode}
            </span>{" "}
            <span className="text-stone-600">
              {Math.round(status.keyConfidence * 100)}%
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
