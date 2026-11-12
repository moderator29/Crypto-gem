/**
 * Shapes of the account-era dashboard rows. The dashboard now reads only what this device
 * saved (watchlist, alerts, receipts); these types remain for the pure helpers in logic.ts.
 */
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
