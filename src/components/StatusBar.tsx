import type { LiveStatus, SourceMode } from "../hooks/usePaintBySound";

interface StatusBarProps {
  status: LiveStatus;
  sourceMode: SourceMode;
  trackName: string;
}

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
        <span>
          Note:{" "}
          <span className="text-stone-200">
            {status.note ? `${status.note}${status.octave ?? ""}` : "—"}
          </span>
        </span>
        <span>
          Amp: <span className="text-stone-200">{Math.round(status.amplitude * 100)}%</span>
        </span>
      </div>
    </div>
  );
}
