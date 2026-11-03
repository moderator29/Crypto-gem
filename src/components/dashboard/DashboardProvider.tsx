"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accessToken, authConfigured } from "@/lib/auth/client";

export interface Overview {
  email: string | null;
  submissions: Array<{ id: string; name: string; symbol: string; network_id: string | null; address: string | null; status: string; rejection_reason: string | null; created_at: string }>;
  orders: Array<{ id: string; kind: string; price_usd: number; status: string; created_at: string; paid_at: string | null }>;
  boosts: Array<{ id: string; projectName: string | null; pack_id: string; status: string; starts_at: string | null; ends_at: string | null }>;
  campaigns: Array<{ id: string; placement_id: string; headline: string | null; status: string; starts_at: string; ends_at: string; impressions: number; clicks: number }>;
}
export interface WatchItem {
  network: string;
  address: string;
  live: { priceUsd: number | null; name: string | null; symbol: string | null; imageUrl: string | null; liquidityUsd: number | null } | null;
}
export type DashState = "loading" | "ok" | "signin" | "unavailable" | "error";

interface Ctx {
  state: DashState;
  data: Overview | null;
  watch: WatchItem[];
  refresh: () => Promise<void>;
}
const DashCtx = createContext<Ctx | null>(null);

export function useDashboard(): Ctx {
  const c = useContext(DashCtx);
  if (!c) throw new Error("useDashboard must be used inside the dashboard layout");
  return c;
}

/** Loads the signed-in user's overview and watchlist once for every dashboard page, so moving between pages is instant. */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashState>("loading");
  const [data, setData] = useState<Overview | null>(null);
  const [watch, setWatch] = useState<WatchItem[]>([]);

  const refresh = useCallback(async () => {
    if (!authConfigured()) return setState("unavailable");
    const jwt = await accessToken();
    if (!jwt) return setState("signin");
    const h = { Authorization: `Bearer ${jwt}` };
    try {
      const [o, w] = await Promise.all([fetch("/api/me/overview", { headers: h }), fetch("/api/watchlist", { headers: h })]);
      if (o.status === 401) return setState("signin");
      if (!o.ok) return setState(o.status === 503 ? "unavailable" : "error");
      setData((await o.json()) as Overview);
      if (w.ok) setWatch(((await w.json()) as { items: WatchItem[] }).items);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const value = useMemo(() => ({ state, data, watch, refresh }), [state, data, watch, refresh]);
  return <DashCtx.Provider value={value}>{children}</DashCtx.Provider>;
}
