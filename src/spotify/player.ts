// Spotify Web Playback SDK -- turns this browser tab itself into a Spotify
// Connect device, so starting a track never needs an already-active
// session on some other device (phone, desktop app) first. Still doesn't
// expose raw audio (same DRM wall as regular Spotify playback), so
// painting the result still means a capture step afterward (Listen live).

import { getAccessToken } from "./auth";
import { pauseOnActiveDevice } from "./api";
import { isIOS } from "../platform";

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement(): Promise<void>;
  resume(): Promise<void>;
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

/** Apple requires every iOS browser to embed its WebKit engine, but reserves
 * full DRM/EME protected-content playback -- which Spotify's Web Playback
 * SDK depends on -- to Safari's own first-party process. Chrome, Firefox,
 * Edge, and Opera on iOS are all third-party WKWebView wrappers, so they
 * never get that capability: the SDK's `playback_error` there is permanent,
 * not the retry-able autoplay-lock quirk real Safari has. No JS workaround
 * exists, so the UI needs to say that plainly instead of implying "try
 * again" on a failure that structurally never will succeed. */
export function isThirdPartyIOSBrowser(): boolean {
  const isThirdPartyWrapper = /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  return isIOS() && isThirdPartyWrapper;
}

const THIRD_PARTY_IOS_MESSAGE =
  "Spotify can't play in-page in this browser on iPhone/iPad -- Apple reserves that to Safari itself. Open this page in Safari, or start the track in the Spotify app on another device first.";

export type PlayerStatus =
  | { state: "connecting" }
  | { state: "ready"; deviceId: string }
  | { state: "error"; message: string };

let playerInstance: SpotifyPlayerInstance | null = null;
let readyDeviceId: string | null = null;

/** Creates (once per page load) and connects the in-page "Paint by Sound"
 * device. Requires Spotify Premium -- the SDK reports that as
 * `account_error` rather than failing silently. Safe to call repeatedly;
 * a second call while already connecting/connected is a no-op, so callers
 * don't need to track whether they've already initialized it.
 *
 * `onPlaybackError` is separate from `onStatus` on purpose: a
 * `playback_error` (buffering hiccup, the Safari autoplay-lock case, etc.)
 * is a per-attempt failure, not a sign the device itself dropped -- it
 * stays "ready" underneath. Folding it into the same persistent status as
 * connecting/ready/fatal-error left the UI stuck showing a stale error
 * forever after a *later* play attempt actually succeeded, since nothing
 * else ever fires to move it back off "error". */
export function ensureEmbeddedPlayer(
  onStatus: (status: PlayerStatus) => void,
  onPlaybackError: (message: string) => void,
): void {
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
        readyDeviceId = device_id;
        onStatus({ state: "ready", deviceId: device_id });
      });
      player.addListener("not_ready", () => {
        readyDeviceId = null;
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
        onPlaybackError(isThirdPartyIOSBrowser() ? THIRD_PARTY_IOS_MESSAGE : message || "Playback error.");
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
  readyDeviceId = null;
}

/** Mobile browsers (and, per Spotify's own SDK, Safari even on desktop)
 * block the player's internal audio element until a genuine user gesture
 * unlocks it -- a fetch()-triggered play command alone isn't enough, even
 * though it originated from a click. Call this synchronously at the very
 * top of that same click handler, before any `await`, so the browser still
 * counts it as gesture-triggered. This is Spotify's own documented
 * workaround; Safari specifically has a known, currently-unresolved gap in
 * their SDK where even this doesn't always start audio on the first
 * click -- so it helps, but isn't a guaranteed fix there. */
export function activatePlaybackElement(): void {
  if (!playerInstance) return;
  void playerInstance.activateElement();
  void playerInstance.resume();
}

/** Pauses Spotify on the in-page device, if one is connected -- a safe
 * no-op otherwise. Hitting "Stop" only ever stopped this app's own mic/file
 * capture; it left a track started via the embedded player running forever
 * with no way to silence it from here.
 *
 * Goes through the same Connect REST endpoint `playTrackOnActiveDevice`
 * used to start playback, rather than the SDK's own local `player.pause()`
 * -- see `pauseOnActiveDevice`'s comment in api.ts for why: the SDK's local
 * state gets left out of sync with reality on Safari specifically when
 * playback was started via that REST call, making its own pause() a
 * silent no-op there. */
export function pauseEmbeddedPlayback(): void {
  if (!readyDeviceId) return;
  void pauseOnActiveDevice(readyDeviceId);
}
