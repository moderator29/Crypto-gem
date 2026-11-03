"use client";

import { useCallback, useEffect, useState } from "react";
import { accessToken } from "@/lib/auth/client";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/** Call an admin route with the signed-in user's access token as a Bearer header. The server decides access. */
export async function adminFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const token = await accessToken();
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, status: res.status, data: null, error: payload?.error ?? `Request failed (${res.status})` };
    return { ok: true, status: res.status, data: payload as T, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error. Check your connection and try again." };
  }
}

/** GET an admin route. `path` null means idle. `reload` refetches. Loading is derived, never set synchronously in the effect. */
export function useAdminQuery<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const key = path ? `${path}#${nonce}` : null;
  const [res, setRes] = useState<{ key: string; result: ApiResult<T> } | null>(null);

  useEffect(() => {
    if (!path || !key) return;
    let live = true;
    void adminFetch<T>(path).then((result) => {
      if (live) setRes({ key, result });
    });
    return () => {
      live = false;
    };
  }, [path, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = key !== null && res?.key !== key;
  const result = res && res.key === key ? res.result : null;
  return { data: result?.data ?? null, error: result?.error ?? null, status: result?.status ?? 0, loading, reload };
}
