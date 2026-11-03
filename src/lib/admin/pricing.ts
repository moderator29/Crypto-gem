import { z } from "zod";

/** USD amount: finite, non-negative, at most two decimals, capped to catch typos like an extra zero. */
export const usd = z
  .number()
  .finite()
  .min(0)
  .max(100_000)
  .refine((v) => Math.abs(Math.round(v * 100) / 100 - v) < 1e-9, "at most 2 decimals");

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "invalid id");
const name = z.string().trim().min(1).max(80);
const sort = z.number().int().min(0).max(1000);

const listingPackagePatch = z
  .object({ name, price_usd: usd, duration_days: z.number().int().min(1).max(3650).nullable(), active: z.boolean(), sort })
  .partial()
  .strict();

const boostPackPatch = z
  .object({ name, price_usd: usd, credits: z.number().int().min(1).max(1_000_000), duration_hours: z.number().int().min(1).max(24 * 365), label: z.string().trim().max(40).nullable(), active: z.boolean(), sort })
  .partial()
  .strict();

/** Placement prices are keyed by whole days ("1", "3", "7") and map to a USD amount. */
export const placementPrices = z
  .record(z.string().regex(/^[1-9][0-9]{0,2}$/, "day keys must be whole numbers"), usd)
  .refine((r) => Object.keys(r).length >= 1 && Object.keys(r).length <= 12, "between 1 and 12 durations");

const placementPatch = z
  .object({ name, description: z.string().trim().max(300).nullable(), prices: placementPrices, slots: z.number().int().min(1).max(100), min_days: z.number().int().min(1).max(365), active: z.boolean() })
  .partial()
  .strict();

const nonEmpty = (o: object) => Object.keys(o).length > 0;

export const priceUpdate = z.discriminatedUnion("table", [
  z.object({ table: z.literal("listing_packages"), id, patch: listingPackagePatch.refine(nonEmpty, "nothing to change") }),
  z.object({ table: z.literal("boost_packs"), id, patch: boostPackPatch.refine(nonEmpty, "nothing to change") }),
  z.object({ table: z.literal("advertising_placements"), id, patch: placementPatch.refine(nonEmpty, "nothing to change") }),
]);
export type PriceUpdate = z.infer<typeof priceUpdate>;

/** Tables with an `updated_at` column. `boost_packs` has none. */
export const HAS_UPDATED_AT: Record<PriceUpdate["table"], boolean> = { listing_packages: true, boost_packs: false, advertising_placements: true };
