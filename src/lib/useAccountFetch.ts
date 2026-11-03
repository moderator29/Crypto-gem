"use client";

import { useCallback, useEffect, useState } from "react";
import { accessToken } from "@/lib/auth/client";

export type AccountState<T> = { state: "loading" } | { state: "signin" } | { state: "error"; message: string } | { state: "ok"; data: T };

/** Fetches a per-user API route with the Privy token. Reports signed out, failed and loaded states plainly. */
export function useAccountFetch<T>(url: string): AccountState<T> & { reload: () => void } {
  const [value, setValue] = useState<AccountState<T>>({ state: "loading" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      const jwt = await accessToken();
      if (!live) return;
      if (!jwt) return setValue({ state: "signin" });
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
        const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
        if (!live) return;
        if (res.status === 401) return setValue({ state: "signin" });
        if (!res.ok || !json) return setValue({ state: "error", message: json?.error ?? "Could not load this right now." });
        setValue({ state: "ok", data: json });
      } catch {
        if (live) setValue({ state: "error", message: "Could not load this right now." });
      }
    })();
    return () => {
      live = false;
    };
  }, [url, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...value, reload };
}

/** Authenticated JSON call used by account views. Throws with the server message on failure. */
export async function accountCall(url: string, method: "POST" | "DELETE", body?: unknown): Promise<void> {
  const jwt = await accessToken();
  if (!jwt) throw new Error("Sign in to continue.");
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "That did not work. Try again.");
}
