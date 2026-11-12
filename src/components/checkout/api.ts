"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** JSON fetch for the checkout API. Never throws: network failures come back as status 0. */
export async function checkoutFetch<T>(url: string, init?: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: init?.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data && typeof data === "object" ? (data as { error?: unknown }).error : undefined;
      return { ok: false, status: res.status, error: typeof err === "string" ? err : `Request failed (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "Network problem. Check your connection and try again." };
  }
}
