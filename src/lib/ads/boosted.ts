import "server-only";
import { normalizeAddress } from "@/lib/market-data/identifiers";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { ACTIVE_BOOSTS, type StaticBoost } from "@/data/sponsored";
import { BOOST_PACKS } from "./catalog";

export interface BoostedProject {
  id: string;
  name: string;
  symbol: string;
  networkId: string | null;
  address: string | null;
  logoUrl: string | null;
  priority: number;
}

/** Boosts from src/data/sponsored.ts that have not ended, mapped to the same shape and order as database boosts. */
export function staticBoostedProjects(list: StaticBoost[] = ACTIVE_BOOSTS, now = Date.now(), limit = 6): BoostedProject[] {
  const prio = (packId: string): number => BOOST_PACKS.find((p) => p.id === packId)?.priority ?? 0;
  return list
    .filter((b) => {
      const end = Date.parse(b.endsAt);
      return Number.isFinite(end) && end > now && !!b.network && !!b.address;
    })
    .sort((a, b) => prio(b.packId) - prio(a.packId) || a.endsAt.localeCompare(b.endsAt))
    .slice(0, limit)
    .map((b) => ({
      id: `static:${b.network}:${normalizeAddress(b.address)}`,
      name: b.name,
      symbol: b.symbol,
      networkId: b.network,
      address: b.address.trim(),
      logoUrl: b.logo && b.logo.startsWith("https://") ? b.logo : null,
      priority: prio(b.packId),
    }));
}

/**
 * Projects with a boost running right now, highest pack priority first and
 * oldest start first among equals. This is the sponsored list. It is never
 * merged into organic ranking and every consumer must label it Sponsored.
 * Without a database the list comes from src/data/sponsored.ts.
 */
export async function getBoostedProjects(limit = 6): Promise<BoostedProject[]> {
  if (!supabaseConfigured()) return staticBoostedProjects(ACTIVE_BOOSTS, Date.now(), limit);
  try {
    const db = supabaseAdmin();
    const now = new Date().toISOString();
    const { data: boosts } = await db.from("boost_campaigns").select("submission_id,pack_id,starts_at").eq("status", "active").lte("starts_at", now).gte("ends_at", now);
    if (!boosts?.length) return [];
    const { data: packs } = await db.from("boost_packs").select("id,priority");
    const prio = new Map((packs ?? []).map((p) => [p.id, p.priority as number]));
    const ids = [...new Set(boosts.map((b) => b.submission_id))];
    const { data: subs } = await db.from("token_submissions").select("id,name,symbol,network_id,address,logo_url").in("id", ids).eq("status", "published");
    const byId = new Map((subs ?? []).map((s) => [s.id, s]));
    return boosts
      .filter((b) => byId.has(b.submission_id))
      .sort((a, b) => (prio.get(b.pack_id) ?? 0) - (prio.get(a.pack_id) ?? 0) || String(a.starts_at).localeCompare(String(b.starts_at)))
      .slice(0, limit)
      .map((b) => {
        const s = byId.get(b.submission_id)!;
        return { id: s.id, name: s.name, symbol: s.symbol, networkId: s.network_id, address: s.address, logoUrl: s.logo_url, priority: prio.get(b.pack_id) ?? 0 };
      });
  } catch {
    return [];
  }
}

/** Keys (`network:address`) of every project with a boost running now, for badges on lists and token pages. */
export async function getBoostedKeys(): Promise<Set<string>> {
  const items = await getBoostedProjects(200);
  return new Set(items.filter((b) => b.networkId && b.address).map((b) => `${b.networkId}:${normalizeAddress(b.address as string)}`));
}
