import { ProviderError } from "./errors";

interface BreakerState {
  failures: number;
  openUntil: number;
}
const breakers = new Map<string, BreakerState>();
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;

export interface ProviderHealth {
  provider: string;
  state: "closed" | "open";
  failures: number;
  openUntil: number | null;
}

export function providerHealth(): ProviderHealth[] {
  const now = Date.now();
  return [...breakers.entries()].map(([provider, s]) => ({
    provider,
    state: s.openUntil > now ? "open" : "closed",
    failures: s.failures,
    openUntil: s.openUntil > now ? s.openUntil : null,
  }));
}

export function resetBreakers(): void {
  breakers.clear();
}

interface FetchOptions {
  provider: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * JSON fetch with timeout, exponential backoff on 429 / 5xx, and a circuit
 * breaker per provider. A 4xx other than 429 is never retried.
 */
export async function fetchJson<T>(url: string, opts: FetchOptions): Promise<T> {
  const { provider, headers = {}, timeoutMs = 8000, retries = 2, baseDelayMs = 400 } = opts;
  const state = breakers.get(provider) ?? { failures: 0, openUntil: 0 };
  if (state.openUntil > Date.now()) {
    throw new ProviderError(provider, "circuit_open", `${provider} is cooling down after repeated failures`);
  }

  let lastErr: ProviderError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: ctrl.signal, cache: "no-store" });
      if (res.ok) {
        state.failures = 0;
        breakers.set(provider, state);
        try {
          return (await res.json()) as T;
        } catch {
          throw new ProviderError(provider, "bad_response", "Provider returned invalid JSON", res.status);
        }
      }
      if (res.status === 404) throw new ProviderError(provider, "not_found", "Not found", 404);
      if (res.status === 401 || res.status === 403) throw new ProviderError(provider, "unauthorized", "Provider rejected credentials", res.status);
      lastErr = new ProviderError(provider, res.status === 429 ? "rate_limited" : "unavailable", `HTTP ${res.status}`, res.status);
      if (res.status !== 429 && res.status < 500) throw lastErr;
    } catch (err) {
      if (err instanceof ProviderError) {
        if (err.kind === "not_found" || err.kind === "unauthorized" || err.kind === "bad_response") throw err;
        lastErr = err;
      } else if (err instanceof Error && err.name === "AbortError") {
        lastErr = new ProviderError(provider, "timeout", `Timed out after ${timeoutMs}ms`);
      } else {
        lastErr = new ProviderError(provider, "unavailable", "Network error");
      }
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
  }

  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) state.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  breakers.set(provider, state);
  throw lastErr ?? new ProviderError(provider, "unavailable", "Unknown failure");
}
