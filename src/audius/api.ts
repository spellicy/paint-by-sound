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
  genre?: string | null;
  user: { name: string };
  artwork: { "150x150"?: string } | null;
}

function mapTrack(t: RawTrack): AudiusTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.user.name,
    artworkUrl: t.artwork?.["150x150"] ?? null,
    // The browser follows this endpoint's redirect straight to the actual
    // audio file on whichever content node hosts it -- no separate lookup
    // step needed before this URL can be fetched and decoded.
    streamUrl: `${HOST}/v1/tracks/${t.id}/stream?app_name=${encodeURIComponent(APP_NAME)}`,
  };
}

export async function searchTracks(query: string): Promise<AudiusTrack[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ query, app_name: APP_NAME });
  const res = await fetch(`${HOST}/v1/tracks/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Audius search failed (${res.status}).`);
  const json = await res.json();
  return ((json.data ?? []) as RawTrack[]).slice(0, 8).map(mapTrack);
}

/**
 * The genre names actually in use right now, read off real trending tracks
 * rather than hardcoded -- Audius's genre values are exact-match strings
 * (e.g. "Hip-Hop/Rap") that aren't published anywhere this app could pull a
 * guaranteed-current, guaranteed-correctly-spelled list from, and a wrong
 * guess wouldn't error, just silently return zero results. Pulling them
 * from live data sidesteps that entirely.
 */
export async function listGenres(): Promise<string[]> {
  const params = new URLSearchParams({ app_name: APP_NAME, limit: "100" });
  const res = await fetch(`${HOST}/v1/tracks/trending?${params.toString()}`);
  if (!res.ok) return [];
  const json = await res.json();
  const genres = new Set<string>();
  for (const t of (json.data ?? []) as RawTrack[]) {
    if (t.genre) genres.add(t.genre);
  }
  return [...genres].sort();
}

/** Trending tracks in a given genre (one of `listGenres`'s results) -- a
 * way to browse by genre rather than searching by name. */
export async function tracksByGenre(genre: string): Promise<AudiusTrack[]> {
  const params = new URLSearchParams({ genre, app_name: APP_NAME, limit: "8" });
  const res = await fetch(`${HOST}/v1/tracks/trending?${params.toString()}`);
  if (!res.ok) throw new Error(`Audius genre lookup failed (${res.status}).`);
  const json = await res.json();
  return ((json.data ?? []) as RawTrack[]).map(mapTrack);
}
