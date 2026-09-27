// Spotify Web Playback SDK -- turns this browser tab itself into a Spotify
// Connect device, so starting a track never needs an already-active
// session on some other device (phone, desktop app) first. Still doesn't
// expose raw audio (same DRM wall as regular Spotify playback), so
// painting the result still means a capture step afterward (Listen live).

import { getAccessToken } from "./auth";

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready" | "not_ready", cb: (data: { device_id: string }) => void): void;
  addListener(
    event: "initialization_error" | "authentication_error" | "account_error" | "playback_error",
    cb: (data: { message: string }) => void,
  ): void;
}

// The SDK ships no official TypeScript types of its own -- just the
// surface this file actually uses.
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

/** Resolves once `window.Spotify` is available, or rejects if the script
 * itself never loads (a blocked host, an ad/privacy blocker, offline) --
 * without this, that failure mode left the UI silently stuck on
 * "Connecting..." forever with no way for the caller to tell something had
 * actually gone wrong versus just still being in flight. */
function loadSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Spotify player script failed to load."));
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

export type PlayerStatus =
  | { state: "connecting" }
  | { state: "ready"; deviceId: string }
  | { state: "error"; message: string };

let playerInstance: SpotifyPlayerInstance | null = null;

/** Creates (once per page load) and connects the in-page "Paint by Sound"
 * device. Requires Spotify Premium -- the SDK reports that as
 * `account_error` rather than failing silently. Safe to call repeatedly;
 * a second call while already connecting/connected is a no-op, so callers
 * don't need to track whether they've already initialized it. */
export function ensureEmbeddedPlayer(onStatus: (status: PlayerStatus) => void): void {
  if (playerInstance) return;
  onStatus({ state: "connecting" });
  void loadSdk()
    .then(() => {
      if (!window.Spotify) {
        onStatus({ state: "error", message: "Spotify player failed to load." });
        return;
      }
      const player = new window.Spotify.Player({
        name: "Paint by Sound",
        getOAuthToken: (cb) => {
          void getAccessToken().then((token) => {
            if (token) cb(token);
          });
        },
        volume: 0.8,
      });
      playerInstance = player;

      player.addListener("ready", ({ device_id }) => {
        onStatus({ state: "ready", deviceId: device_id });
      });
      player.addListener("not_ready", () => {
        onStatus({ state: "connecting" });
      });
      player.addListener("initialization_error", ({ message }) => {
        onStatus({ state: "error", message: `Couldn't start the in-page player: ${message}` });
      });
      player.addListener("authentication_error", () => {
        onStatus({ state: "error", message: "Spotify session expired -- reconnect Spotify." });
      });
      player.addListener("account_error", () => {
        onStatus({ state: "error", message: "The in-page player needs Spotify Premium." });
      });
      player.addListener("playback_error", ({ message }) => {
        onStatus({ state: "error", message: `Playback error: ${message}` });
      });

      void player.connect();
    })
    .catch(() => {
      // Let a later call try loading the script again instead of being
      // stuck forever on this one failed attempt (e.g. a blocked host that
      // works again once an extension is toggled off).
      sdkLoadPromise = null;
      onStatus({ state: "error", message: "Couldn't load the Spotify player -- check your connection." });
    });
}

export function disconnectEmbeddedPlayer(): void {
  playerInstance?.disconnect();
  playerInstance = null;
}
