"use client";

import { useEffect, useMemo, useState } from "react";
import { assetKey } from "@/lib/market-data/identifiers";

export interface LivePrice { priceUsd: number | null; at: number; error: boolean }

const TTL = 50_000;
const cache = new Map<string, LivePrice>();
const inflight = new Map<string, Promise<LivePrice>>();

/** Latest price for one token from GET /api/price. Answers are cached for under a minute and requests for the same token are shared. */
export function fetchLivePrice(network: string, address: string): Promise<LivePrice> {
  const key = assetKey(network, address);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const p = fetch(`/api/price?${new URLSearchParams({ network, address })}`)
    .then(async (r) => {
      const j = (await r.json().catch(() => ({}))) as { priceUsd?: number | null };
      const price = r.ok && typeof j.priceUsd === "number" && Number.isFinite(j.priceUsd) ? j.priceUsd : null;
      return { priceUsd: price, at: Date.now(), error: !r.ok };
    })
    .catch(() => ({ priceUsd: null, at: Date.now(), error: true }))
    .then((v) => {
      cache.set(key, v);
      inflight.delete(key);
      return v;
    });
  inflight.set(key, p);
  return p;
}

/** Runs tasks a few at a time so a long list never floods the price endpoint. */
export async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
}

/** Live prices for a list of tokens, refreshed every minute while the component is on screen. */
export function useLivePrices(tokens: Array<{ network: string; address: string }>): Map<string, LivePrice> {
  const sig = tokens.map((t) => assetKey(t.network, t.address)).join("|");
  const list = useMemo(() => sig.split("|").filter(Boolean).map((k) => {
    const i = k.indexOf(":");
    return { network: k.slice(0, i), address: k.slice(i + 1) };
  }), [sig]);
  const [prices, setPrices] = useState<Map<string, LivePrice>>(() => new Map());

  useEffect(() => {
    let live = true;
    const load = async () => {
      await inBatches(list.slice(0, 60), 4, async (t) => {
        const v = await fetchLivePrice(t.network, t.address);
        if (live) setPrices((m) => new Map(m).set(assetKey(t.network, t.address), v));
      });
    };
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [list]);

  return prices;
}
