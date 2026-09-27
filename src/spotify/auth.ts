// Spotify OAuth via Authorization Code + PKCE -- entirely client-side, no
// backend and no client secret. `beginLogin` sends the browser to Spotify's
// consent screen; `completeLoginIfRedirected` picks the flow back up when
// Spotify sends the browser back here with a `?code=...`.

import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from "./config";
import { codeChallengeFromVerifier, randomString } from "./pkce";

const VERIFIER_KEY = "pbs_spotify_pkce_verifier";
const STATE_KEY = "pbs_spotify_pkce_state";
const TOKENS_KEY = "pbs_spotify_tokens";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StoredTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function isConnected(): boolean {
  return loadTokens() !== null;
}

export function disconnect() {
  localStorage.removeItem(TOKENS_KEY);
}

/** Redirect the whole page to Spotify's consent screen. Resumes back into
 * this same app (see `completeLoginIfRedirected`) once the user approves. */
export async function beginLogin(): Promise<void> {
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const challenge = await codeChallengeFromVerifier(verifier);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/** Call once on app load. If the URL carries a Spotify redirect (`code` +
 * `state`), exchanges the code for tokens and strips those query params
 * back off the URL so a refresh doesn't try to redeem the same code twice.
 * A no-op on any normal page load. */
export async function completeLoginIfRedirected(): Promise<void> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  // Always scrub the OAuth params off the visible URL, even if something
  // below fails -- an error shouldn't leave a redeemable `code` sitting in
  // the address bar for a page refresh to trip over.
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());

  if (!verifier || !state || state !== expectedState) return;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return;
  const json = await res.json();
  saveTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = await res.json();
  const tokens: StoredTokens = {
    accessToken: json.access_token,
    // Spotify doesn't always issue a new refresh token on refresh -- keep
    // the existing one when it doesn't.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  saveTokens(tokens);
  return tokens;
}

/** A currently-valid access token, refreshing first if the stored one is
 * expired (or close to it). Returns null if the user isn't connected, or
 * the refresh token has been revoked/expired -- callers should treat that
 * as "connect Spotify again," not a transient error. */
export async function getAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  if (tokens.expiresAt - Date.now() > 30_000) return tokens.accessToken;

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  if (!refreshed) {
    disconnect();
    return null;
  }
  return refreshed.accessToken;
}
