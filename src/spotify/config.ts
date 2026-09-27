/**
 * A Spotify Client ID is a public identifier, not a secret -- the
 * Authorization Code + PKCE flow used here exists specifically so a
 * browser-only app never needs a client secret at all. It's safe to commit.
 *
 * One-time setup (done once per deployment, outside this codebase):
 *   1. Create an app at https://developer.spotify.com/dashboard.
 *   2. Add this exact Redirect URI to that app's settings: the deployed
 *      site's root URL (e.g. https://spellicy.github.io/paint-by-sound/).
 *      This app has no router, so the redirect target is always just the
 *      root page -- the OAuth callback is handled by reading `?code=...`
 *      off the URL on load (see spotify/auth.ts) rather than a dedicated
 *      route, which also sidesteps GitHub Pages' lack of SPA deep-link
 *      support.
 *   3. Copy that app's Client ID and paste it below.
 */
export const SPOTIFY_CLIENT_ID: string = "d8afedd34dfb4c4ca5b72386ce8d14e3";

/** Always the deployed page's own root -- see the setup note above. */
export const SPOTIFY_REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;

/**
 * `user-read-playback-state` to find an active device, `user-modify-
 * playback-state` to start a track on it. Deliberately not requesting
 * anything broader (no private-data scopes) -- Phase 1 only ever picks a
 * track and hands playback to the user's own Spotify app.
 */
export const SPOTIFY_SCOPES = "user-read-playback-state user-modify-playback-state";

export function isSpotifyConfigured(): boolean {
  return SPOTIFY_CLIENT_ID !== "REPLACE_WITH_YOUR_SPOTIFY_CLIENT_ID" && SPOTIFY_CLIENT_ID.length > 0;
}
