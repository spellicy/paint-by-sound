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

export interface SpotifyDevice {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Lists the user's devices Spotify Connect currently knows about. A device
 * merely having the Spotify app open isn't enough to make it Connect's
 * notion of "the active device" (`isActive` below) -- that flag only
 * reliably sets once something has actually started playing there in the
 * current session, so "open but paused/idle elsewhere" commonly isn't
 * active despite genuinely being available. This endpoint lists it either
 * way, which lets callers target it explicitly by id instead of relying on
 * that flag. Devices with no id (Spotify marks some restricted/unusable
 * devices this way) are filtered out, since they can't be a play target.
 */
export async function listAvailableDevices(): Promise<SpotifyDevice[]> {
  const res = await authedFetch("https://api.spotify.com/v1/me/player/devices");
  if (!res.ok) return [];
  const json = await res.json();
  interface RawDevice {
    id: string | null;
    name: string;
    is_active: boolean;
  }
  return (json.devices ?? [])
    .filter((d: RawDevice): d is RawDevice & { id: string } => d.id !== null)
    .map((d: RawDevice & { id: string }) => ({ id: d.id, name: d.name, isActive: d.is_active }));
}

/**
 * Starts a track via Spotify Connect on the given device -- either the
 * in-page Web Playback SDK device (spotify/player.ts) so playback starts
 * right here, or an external one from `listAvailableDevices` so it starts
 * wherever the user already has Spotify open. Requires Premium; both
 * failure modes are common enough that they're reported back as a friendly
 * reason rather than a thrown error, since it's not something painting-side
 * code can retry.
 */
export async function playTrackOnActiveDevice(
  uri: string,
  deviceId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await authedFetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [uri] }),
    });
  } catch (e) {
    return { ok: false, reason: e instanceof SpotifyAuthError ? e.message : "Could not reach Spotify." };
  }
  if (res.status === 204) return { ok: true };
  if (res.status === 404) {
    return { ok: false, reason: "That device isn't available anymore -- try again." };
  }
  if (res.status === 403) {
    return { ok: false, reason: "Starting playback needs Spotify Premium." };
  }
  return { ok: false, reason: `Spotify couldn't start that track (${res.status}).` };
}

/**
 * Pauses playback on the given device via the same Connect REST control
 * plane `playTrackOnActiveDevice` uses to start it -- deliberately not the
 * Web Playback SDK's own local `player.pause()`. Spotify's SDK has a
 * long-reported bug (Safari specifically) where starting playback via this
 * REST `/play` endpoint leaves the SDK's local Player object out of sync
 * with what's actually playing, since it never went through the SDK's own
 * play/resume call -- so its `pause()` silently no-ops. Issuing pause the
 * same way play was issued sidesteps that local state entirely. Best-effort:
 * Stop doesn't need to explain *why* silencing Spotify failed, just try.
 */
export async function pauseOnActiveDevice(deviceId: string): Promise<boolean> {
  try {
    const res = await authedFetch(
      `https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
      { method: "PUT" },
    );
    return res.status === 204;
  } catch {
    return false;
  }
}
