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

export async function accessToken(): Promise<string | null> {
  try {
    return (await getter?.()) ?? null;
  } catch {
    return null;
  }
}
