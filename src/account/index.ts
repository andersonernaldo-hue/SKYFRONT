export type AccountKind = "guest" | "google";

export interface Account {
  kind: AccountKind;
  /** Stable id. Guest is always "guest"; Google uses the account's `sub` claim. */
  id: string;
  name: string;
  email?: string;
  picture?: string;
  /** When the session was created, for display only. */
  since: number;
}

const ACCOUNT_KEY = "skyfront_ace_account_v1";
export const GUEST: Account = { kind: "guest", id: "guest", name: "Guest", since: 0 };

/**
 * Save slot for an account. Guest keeps the original unsuffixed key so existing
 * local progress is never orphaned when this feature is added.
 */
export function profileFor(account: Account | null): string {
  return !account || account.kind === "guest" ? "" : `g_${account.id}`;
}

export function storageAvailable(): boolean {
  try {
    const probe = "__skyfront_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadAccount(): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Account>;
    if (parsed.kind === "guest") return { ...GUEST, since: Number(parsed.since) || Date.now() };
    if (parsed.kind !== "google" || typeof parsed.id !== "string" || !parsed.id) return null;
    return {
      kind: "google",
      id: parsed.id,
      name: typeof parsed.name === "string" && parsed.name ? parsed.name : "Pilot",
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      picture: typeof parsed.picture === "string" ? parsed.picture : undefined,
      since: Number(parsed.since) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function storeAccount(account: Account | null): boolean {
  try {
    if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    else localStorage.removeItem(ACCOUNT_KEY);
    return true;
  } catch {
    return false;
  }
}

export const displayName = (account: Account | null, guestLabel: string) =>
  !account || account.kind === "guest" ? guestLabel : account.name;
