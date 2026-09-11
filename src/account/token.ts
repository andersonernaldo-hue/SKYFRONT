/**
 * Pure ID-token helpers, isolated from browser/bundler globals so they can be
 * unit tested directly.
 *
 * These are sanity checks only. Without a backend the signature is never
 * verified, so the claims must not be treated as proof of identity — they only
 * label the local profile and pick a save slot.
 */
export interface GoogleProfile { sub: string; name: string; email?: string; picture?: string }

const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Base64url JWT payload decode with correct UTF-8 handling for non-ASCII names. */
export function decodeIdToken(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function profileFromToken(token: string, clientId: string, now = Date.now()): GoogleProfile | null {
  const claims = decodeIdToken(token);
  if (!claims || !clientId) return null;
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const exp = Number(claims.exp ?? 0) * 1000;
  if (!ISSUERS.has(String(claims.iss ?? ""))) return null;
  if (!sub || claims.aud !== clientId || !Number.isFinite(exp) || exp <= now) return null;
  const email = typeof claims.email === "string" ? claims.email : undefined;
  const rawName = typeof claims.name === "string" ? claims.name.trim() : "";
  return {
    sub,
    name: rawName || email || "Pilot",
    email,
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}
