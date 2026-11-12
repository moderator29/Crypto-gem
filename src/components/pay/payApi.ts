import { accessToken } from "@/lib/auth/client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Authenticated JSON call. Failures always come back as a readable message, never a throw. */
export async function payFetch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = await accessToken();
  if (!token) return { ok: false, status: 401, error: "Sign in to continue." };
  try {
    const res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !json) return { ok: false, status: res.status, error: json?.error ?? "Something went wrong. Please try again." };
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, error: "Network problem. Check your connection and try again." };
  }
}
