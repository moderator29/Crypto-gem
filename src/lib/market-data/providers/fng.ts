import { cached } from "../cache";
import { fetchJson } from "../http";

export interface FearGreed {
  value: number;
  label: string;
  yesterday: number | null;
  observedAt: string;
}

/** Crypto Fear and Greed Index from alternative.me. Public, no key. Returns null when the service is unreachable. */
export async function getFearGreed(): Promise<FearGreed | null> {
  try {
    const { value } = await cached("fng", 10 * 60_000, () => fetchJson<{ data?: Array<{ value: string; value_classification: string }> }>("https://api.alternative.me/fng/?limit=2", { provider: "alternative", timeoutMs: 6000, retries: 1 }), { staleMs: 6 * 3600_000 });
    const [now, prev] = value.data ?? [];
    const v = Number(now?.value);
    if (!now || !Number.isFinite(v)) return null;
    const p = Number(prev?.value);
    return { value: v, label: now.value_classification, yesterday: Number.isFinite(p) ? p : null, observedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
