"use client";

/** No accounts exist on CryptoGemCN, so sign-in is never configured. */
export function authConfigured(): boolean {
  return false;
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

/** Credential for API calls: this browser's guest key. */
export async function accessToken(): Promise<string | null> {
  return guestToken();
}
