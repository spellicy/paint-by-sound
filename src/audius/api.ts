// Audius: an open, decentralized music-streaming catalog. Unlike Spotify
// (and every other major licensed streaming service), its stream endpoints
// serve plain, non-DRM audio files -- so a track can be fetched and decoded
// directly with the Web Audio API, exactly like an uploaded file, on every
// platform including iOS. No login, no API key, no separate "capture" step.
// The tradeoff is catalog: independent/emerging artists rather than
// mainstream/major-label music.

const HOST = "https://discoveryprovider.audius.co";
const APP_NAME = "PaintBySound";

export interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  streamUrl: string;
}

interface RawTrack {
  id: string;
  title: string;
  user: { name: string };
  artwork: { "150x150"?: string } | null;
}

export async function searchTracks(query: string): Promise<AudiusTrack[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ query, app_name: APP_NAME });
  const res = await fetch(`${HOST}/v1/tracks/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Audius search failed (${res.status}).`);
  const json = await res.json();
  return ((json.data ?? []) as RawTrack[]).slice(0, 8).map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.user.name,
    artworkUrl: t.artwork?.["150x150"] ?? null,
    // The browser follows this endpoint's redirect straight to the actual
    // audio file on whichever content node hosts it -- no separate lookup
    // step needed before this URL can be fetched and decoded.
    streamUrl: `${HOST}/v1/tracks/${t.id}/stream?app_name=${encodeURIComponent(APP_NAME)}`,
  }));
}
