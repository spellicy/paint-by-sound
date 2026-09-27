import { useEffect, useState } from "react";
import { isSpotifyConfigured } from "../spotify/config";
import { beginLogin, disconnect, isConnected } from "../spotify/auth";
import { playTrackOnActiveDevice, searchTracks, type SpotifyTrack } from "../spotify/api";
import {
  activatePlaybackElement,
  disconnectEmbeddedPlayer,
  ensureEmbeddedPlayer,
  type PlayerStatus,
} from "../spotify/player";

interface SpotifyPickerProps {
  /** Called once a track has actually started playing on the user's active
   * Spotify device -- lets the app fill in a track name the same way an
   * uploaded file's filename does. */
  onTrackSelected: (track: SpotifyTrack) => void;
}

type PlayState = { message: string; ok: boolean } | null;

/** Lives inside the same "Sound source" card as Listen live / Upload a
 * file -- all three ways of getting audio into the analyzer belong in one
 * place -- so this renders as a plain continuation of that section (a top
 * divider, no card of its own) rather than a competing bordered panel. */
export function SpotifyPicker({ onTrackSelected }: SpotifyPickerProps) {
  const [connected, setConnected] = useState(isConnected());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({ state: "connecting" });

  // Once connected, this tab becomes its own Spotify Connect device (the
  // Web Playback SDK) -- so hitting Play never needs Spotify already open
  // somewhere else. Initializing this here, as soon as the panel is in its
  // connected state, means the device is usually already ready by the time
  // a search finishes and the user picks a track.
  useEffect(() => {
    if (!connected) return;
    // A playback_error is a per-attempt failure (a buffering hiccup, the
    // Safari autoplay-lock case), not a sign the device dropped -- routed
    // into playState (the same per-click feedback channel Play already
    // uses) rather than the persistent playerStatus, so it doesn't get
    // stuck showing a stale error after a later attempt actually succeeds.
    ensureEmbeddedPlayer(setPlayerStatus, (message) => setPlayState({ ok: false, message }));
  }, [connected]);

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
          if (!isConnected()) setConnected(false);
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

  if (!isSpotifyConfigured()) {
    return (
      <div className="mt-3 border-t border-stone-800 pt-3">
        <p className="text-xs text-stone-600">
          Spotify not set up yet -- add a Client ID in{" "}
          <code className="text-stone-500">src/spotify/config.ts</code>.
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
        <p className="text-xs text-stone-500">
          Or search <strong className="font-medium text-stone-400">Spotify</strong> and
          play a track right here (Premium required), then hit Listen live to
          paint it.
        </p>
        <button
          onClick={() => void beginLogin()}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-stone-950 hover:bg-emerald-500"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  const handlePlay = async (track: SpotifyTrack) => {
    // Must run synchronously, before any await below, so mobile browsers
    // (and Safari) still count this as triggered directly by the click --
    // see spotify/player.ts. A fetch()-triggered play command alone doesn't
    // satisfy their autoplay policy, even from a click's own handler.
    activatePlaybackElement();
    setPlayState(null);
    if (playerStatus.state !== "ready") {
      setPlayState({
        ok: false,
        message: "Still connecting the in-page player -- try again in a moment.",
      });
      return;
    }
    const result = await playTrackOnActiveDevice(track.uri, playerStatus.deviceId);
    if (result.ok) {
      setPlayState({ ok: true, message: "Playing -- hit Listen live to paint it." });
      onTrackSelected(track);
    } else {
      setPlayState({ ok: false, message: result.reason });
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-400">Play from Spotify</p>
        <button
          onClick={() => {
            disconnectEmbeddedPlayer();
            disconnect();
            setConnected(false);
            setResults([]);
            setQuery("");
          }}
          className="text-[10px] text-stone-600 hover:text-stone-400"
        >
          Disconnect
        </button>
      </div>
      {playerStatus.state === "connecting" && (
        <p className="text-[10px] text-stone-600">Connecting in-page player...</p>
      )}
      {playerStatus.state === "error" && (
        <p className="text-[10px] text-amber-500">{playerStatus.message}</p>
      )}
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
              {track.albumArt && (
                <img src={track.albumArt} alt="" className="h-8 w-8 flex-none rounded" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-stone-200">{track.name}</p>
                <p className="truncate text-xs text-stone-500">{track.artists.join(", ")}</p>
              </div>
              <button
                onClick={() => void handlePlay(track)}
                className="flex-none rounded-md bg-emerald-600/90 px-2.5 py-1 text-xs font-medium text-stone-950 hover:bg-emerald-500"
              >
                Play
              </button>
            </li>
          ))}
        </ul>
      )}
      {playState && (
        <p className={`text-xs ${playState.ok ? "text-emerald-400" : "text-red-400"}`}>
          {playState.message}
        </p>
      )}
    </div>
  );
}
