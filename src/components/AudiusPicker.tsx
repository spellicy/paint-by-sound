import { useEffect, useState } from "react";
import { searchTracks, type AudiusTrack } from "../audius/api";

interface AudiusPickerProps {
  /** Called when a track is picked -- starts playing it directly through
   * the analyzer (see usePaintBySound's playAudiusTrack), no separate
   * capture step needed. */
  onTrackSelected: (track: AudiusTrack) => void;
}

/** Lives inside the same "Sound source" card as Listen live / Upload a
 * file -- all three ways of getting audio into the analyzer belong in one
 * place -- so this renders as a plain continuation of that section (a top
 * divider, no card of its own) rather than a competing bordered panel.
 *
 * Unlike the earlier Spotify integration this replaced, there's no login
 * step and no separate "now hit Listen live" step: Audius's stream
 * endpoints serve plain, non-DRM audio files, so a picked track is fetched
 * and decoded directly into the analyzer, exactly like an uploaded file,
 * identically on every platform including iOS. */
export function AudiusPicker({ onTrackSelected }: AudiusPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AudiusTrack[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      searchTracks(query)
        .then((tracks) => {
          setResults(tracks);
          setSearchError(null);
        })
        .catch((e) => {
          setResults([]);
          setSearchError(e instanceof Error ? e.message : "Search failed.");
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSearchError(null);
    }
  };

  const handlePlay = (track: AudiusTrack) => {
    setSelectedId(track.id);
    onTrackSelected(track);
  };

  return (
    <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
      <p className="text-xs font-medium text-stone-400">Play from Audius</p>
      <p className="text-xs text-stone-500">
        Search Audius's open, independent-artist catalog and play a track
        right here &mdash; it paints immediately, the same way on every
        device.
      </p>
      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Search for a song..."
        className="w-full rounded-md border border-stone-800 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      {searchError && <p className="text-xs text-red-400">{searchError}</p>}
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((track) => (
            <li key={track.id} className="flex items-center gap-2">
              {track.artworkUrl && (
                <img src={track.artworkUrl} alt="" className="h-8 w-8 flex-none rounded" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-stone-200">{track.title}</p>
                <p className="truncate text-xs text-stone-500">{track.artist}</p>
              </div>
              <button
                onClick={() => handlePlay(track)}
                className={`flex-none rounded-md px-2.5 py-1 text-xs font-medium text-stone-950 ${
                  selectedId === track.id ? "bg-emerald-500" : "bg-emerald-600/90 hover:bg-emerald-500"
                }`}
              >
                Play
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
