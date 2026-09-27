import { getAccessToken } from "./auth";

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumArt: string | null;
}

export class SpotifyAuthError extends Error {}

async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyAuthError("Not connected to Spotify.");
  return fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query, type: "track", limit: "8" });
  const res = await authedFetch(`https://api.spotify.com/v1/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Spotify search failed (${res.status}).`);
  const json = await res.json();
  interface RawTrack {
    id: string;
    uri: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  }
  return (json.tracks?.items ?? []).map((t: RawTrack) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => a.name),
    albumArt: t.album.images.at(-1)?.url ?? null, // smallest image -- this is only ever shown as a thumbnail
  }));
}

/**
 * Starts a track via Spotify Connect. With a `deviceId` (the in-page Web
 * Playback SDK device -- see spotify/player.ts), it targets that device
 * directly, so playback starts right here with no other Spotify session
 * needed. Without one, it falls back to whichever device the user already
 * has active elsewhere (phone, desktop app, smart speaker). Requires
 * Premium and, in the no-`deviceId` case, at least one device with an open
 * Spotify session; both failure modes are common enough that they're
 * reported back as a friendly reason rather than a thrown error, since
 * it's not something painting-side code can retry.
 */
export async function playTrackOnActiveDevice(
  uri: string,
  deviceId?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  let res: Response;
  try {
    res = await authedFetch(`https://api.spotify.com/v1/me/player/play${query}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [uri] }),
    });
  } catch (e) {
    return { ok: false, reason: e instanceof SpotifyAuthError ? e.message : "Could not reach Spotify." };
  }
  if (res.status === 204) return { ok: true };
  if (res.status === 404) {
    return {
      ok: false,
      reason: deviceId
        ? "The in-page player isn't ready yet -- wait a moment and try again."
        : "No active Spotify device -- open Spotify on your phone or computer first.",
    };
  }
  if (res.status === 403) {
    return { ok: false, reason: "Starting playback needs Spotify Premium." };
  }
  return { ok: false, reason: `Spotify couldn't start that track (${res.status}).` };
}
