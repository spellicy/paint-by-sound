// PKCE (Proof Key for Code Exchange) helpers -- lets the OAuth flow prove
// this browser tab is the one that started the login, without a client
// secret. `crypto.subtle` requires a secure context (https, or localhost),
// which every place this app runs (GitHub Pages, `vite dev`) already is.

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += CHARSET[b % CHARSET.length];
  return out;
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function codeChallengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}
