import type { ThemeInfluence } from "../theme/themeAnalyzer";
import { PAINT_STYLES } from "../paint/types";

interface InspirationPanelProps {
  title: string;
  onTitleChange: (v: string) => void;
  lyrics: string;
  onLyricsChange: (v: string) => void;
  theme: ThemeInfluence;
}

const styleLabel = (id: NonNullable<ThemeInfluence["suggestedStyle"]>) =>
  PAINT_STYLES.find((s) => s.id === id)?.label ?? id;

export function InspirationPanel({
  title,
  onTitleChange,
  lyrics,
  onLyricsChange,
  theme,
}: InspirationPanelProps) {
  return (
    <div className="space-y-3 rounded-lg border border-stone-800 bg-stone-950/60 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Inspiration
      </h3>
      <p className="text-xs text-stone-500">
        The title and any key lyrics or mood words shape the palette and
        composition, the way a painter might take a cue from a title before
        starting a canvas.
      </p>
      <div>
        <label className="mb-1 block text-xs text-stone-500">Title</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="What's this piece called?"
          className="w-full rounded-md border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-stone-500">
          Key lyrics or mood words (optional)
        </label>
        <textarea
          value={lyrics}
          onChange={(e) => onLyricsChange(e.target.value)}
          rows={2}
          placeholder="e.g. midnight, thunder, alone..."
          className="w-full resize-none rounded-md border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
        />
      </div>
      {theme.matchedWords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {theme.matchedWords.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300"
            >
              {w}
            </span>
          ))}
          {theme.suggestedStyle && (
            <span className="ml-1 text-[10px] text-stone-500">
              &rarr; leans {styleLabel(theme.suggestedStyle)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
