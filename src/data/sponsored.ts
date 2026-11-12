import type { PlacementId } from "@/lib/ads/catalog";

/**
 * Sponsored placements that are live without a database. Edit this file after a payment is verified
 * (the admin gets a Telegram alert with the receipt number), commit, and redeploy.
 * Entries whose endsAt is in the past are ignored automatically, so old ones can stay until a cleanup.
 */

export interface StaticBoost {
  /** Network id from src/lib/market-data/networks.ts, for example "solana", "ethereum", "bsc", "base". */
  network: string;
  /** Token contract or mint, exactly as on chain. */
  address: string;
  name: string;
  symbol: string;
  /** Optional https logo URL. Without it the real logo is looked up as usual. */
  logo?: string;
  /** Boost pack id from src/lib/ads/catalog.ts (spark, rise, surge, rocket, orbit, moon). Sets the rotation priority. */
  packId: string;
  /** ISO time the boost stops showing, for example "2026-11-20T12:00:00Z". */
  endsAt: string;
}

export interface StaticBanner {
  /** Unique id, for example the receipt number "CG-20261112-AB12CD". */
  id: string;
  name: string;
  /** https image URL or a file in /public, for example "/sponsored/acme-hero.webp". */
  image: string;
  /** https destination the banner opens. */
  url: string;
  /** ISO time the banner stops showing. */
  endsAt: string;
  /** Where it shows. Defaults to the homepage hero strip. */
  placement?: PlacementId;
}

/**
 * Active boosts. To add one after a paid Boost checkout, copy the details from the receipt:
 * { network: "solana", address: "Mint...", name: "Acme", symbol: "ACME", packId: "surge", endsAt: "2026-11-14T12:00:00Z" },
 */
export const ACTIVE_BOOSTS: StaticBoost[] = [];

/**
 * Active banner campaigns. To add one after a paid Banner checkout:
 * { id: "CG-20261112-AB12CD", name: "Acme", image: "/sponsored/acme.webp", url: "https://acme.xyz", endsAt: "2026-11-19T00:00:00Z", placement: "hero" },
 */
export const ACTIVE_BANNERS: StaticBanner[] = [];
