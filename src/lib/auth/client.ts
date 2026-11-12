"use client";

/**
 * Bridge so plain event handlers can fetch a fresh Privy access token without being
 * React hooks. AuthProvider registers the getter once Privy is ready.
 */
let getter: (() => Promise<string | null>) | null = null;

export function registerTokenGetter(fn: (() => Promise<string | null>) | null): void {
  getter = fn;
}

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
}

const GUEST_KEY = "cg:guest-key";
let guestCache: string | null = null;

/** This browser's private guest key, created on first use. It lets people use everything without an account. */
export function guestToken(): string | null {
  if (guestCache) return guestCache;
  if (typeof window === "undefined" || !window.crypto?.randomUUID) return null;
  let key: string | null = null;
  try {
    key = window.localStorage.getItem(GUEST_KEY);
  } catch {
    key = null;
  }
  if (!key || !/^[0-9a-f-]{36}$/i.test(key)) {
    key = window.crypto.randomUUID();
    try {
      window.localStorage.setItem(GUEST_KEY, key);
    } catch {
      /* private mode: the key lasts for this visit */
    }
  }
  guestCache = `guest.${key}`;
  return guestCache;
}

/** Credential for API calls: the Privy token when someone has signed in, otherwise the guest key. */
export async function accessToken(): Promise<string | null> {
  try {
    const t = await getter?.();
    if (t) return t;
  } catch {
    /* fall back to the guest key */
  }
  return guestToken();
}
