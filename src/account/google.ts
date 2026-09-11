/**
 * Google Identity Services sign-in for a static site.
 *
 * Scope and limits, stated plainly:
 * - There is no backend, so the ID token is NOT verified on a server. The decoded
 *   claims are used only to label the local profile and pick a save slot.
 * - Progress stays in this browser. Signing in does not sync saves across devices.
 * - A determined user can edit their own local save either way.
 */
import { profileFromToken, type GoogleProfile } from "./token";

export { decodeIdToken, profileFromToken, type GoogleProfile } from "./token";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const OVERRIDE_KEY = "skyfront_ace_google_client_id";

/**
 * Production OAuth Client ID for https://skyfront1.netlify.app.
 * A Client ID is public by design (it ships in the browser bundle), so
 * embedding it is safe. VITE_GOOGLE_CLIENT_ID in Netlify still overrides it.
 */
export const DEFAULT_CLIENT_ID = "47437516587-aeoflbr843e22akfu7o0b80rv48ct8cc.apps.googleusercontent.com";

export function configuredClientId(): string {
  const fromEnv = (import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const override = (localStorage.getItem(OVERRIDE_KEY) ?? "").trim();
    if (override) return override;
  } catch {
    /* storage blocked */
  }
  return DEFAULT_CLIENT_ID;
}

export function setClientIdOverride(value: string): void {
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(OVERRIDE_KEY, trimmed);
    else localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* storage blocked; sign-in stays unavailable this session */
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadGoogleScript(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if ((window as any).google?.accounts?.id) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const element = existing ?? document.createElement("script");
    const done = () => resolve(Boolean((window as any).google?.accounts?.id));
    element.addEventListener("load", done, { once: true });
    element.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) {
      element.src = SCRIPT_SRC;
      element.async = true;
      element.defer = true;
      document.head.appendChild(element);
    }
    // The script may already be cached and loaded before listeners attach.
    setTimeout(done, 6000);
  }).then((ok) => {
    if (!ok) scriptPromise = null; // allow a retry after a network failure
    return ok;
  });
  return scriptPromise;
}

export interface RenderOptions {
  container: HTMLElement;
  clientId: string;
  locale: string;
  text: "signin_with" | "continue_with";
  onProfile: (profile: GoogleProfile) => void;
  onError: (reason: "unavailable" | "invalid") => void;
}

/** Renders Google's official button, which their branding guidelines require. */
export async function renderGoogleButton(options: RenderOptions): Promise<boolean> {
  const ready = await loadGoogleScript();
  const id = (window as any).google?.accounts?.id;
  if (!ready || !id) { options.onError("unavailable"); return false; }
  try {
    id.initialize({
      client_id: options.clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response: { credential?: string }) => {
        const profile = response?.credential ? profileFromToken(response.credential, options.clientId) : null;
        if (profile) options.onProfile(profile);
        else options.onError("invalid");
      },
    });
    options.container.replaceChildren();
    id.renderButton(options.container, {
      type: "standard", theme: "filled_black", size: "large",
      text: options.text, shape: "pill", locale: options.locale, width: 260,
    });
    return true;
  } catch {
    options.onError("unavailable");
    return false;
  }
}

export function googleSignOut(): void {
  try {
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* nothing to revoke */
  }
}
