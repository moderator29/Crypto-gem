import { z } from "zod";
import { LISTING_PACKAGES } from "@/lib/ads/catalog";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";

const httpUrl = z.string().trim().max(300).refine((s) => {
  try {
    return ["https:", "http:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}, "Enter a valid http(s) URL");
const optUrl = z.union([z.literal(""), httpUrl]);

export const listingInput = z.object({
  mode: z.enum(["express", "standard"]),
  network: z.string().nullable(),
  address: z.string().trim().max(128).nullable(),
  package: z.enum(LISTING_PACKAGES.map((p) => p.id) as [string, ...string[]]),
  payCurrency: z.string().regex(/^[a-z0-9]{2,20}$/),
  form: z.object({
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(20),
    description: z.string().trim().min(30).max(2000),
    descriptionZh: z.string().trim().max(2000).optional().default(""),
    website: optUrl, twitter: optUrl, telegram: optUrl, discord: optUrl, medium: optUrl, coingecko: optUrl, coinmarketcap: optUrl,
    logoUrl: z.union([z.literal(""), z.string().url().startsWith("https://").max(500)]),
    email: z.string().email().max(200),
  }),
});
export type ListingInput = z.infer<typeof listingInput>;

/** Validates the contract against the chosen network. Returns an error message or the canonical address. */
export function checkContract(network: string | null, address: string | null): { ok: true; address: string | null } | { ok: false; error: string } {
  if (!address) return { ok: true, address: null };
  const kind = classifyAddress(address);
  if (kind === "unknown" || kind === "bitcoin") return { ok: false, error: "Invalid contract address" };
  if (network) {
    const n = getNetwork(network);
    if (!n || !n.contractLookup) return { ok: false, error: "Unsupported network" };
    if (n.family === "evm" && kind !== "evm") return { ok: false, error: "Address format does not match the network" };
    if (n.family === "solana" && kind !== "solana") return { ok: false, error: "Address format does not match the network" };
  }
  return { ok: true, address: normalizeAddress(address) };
}

/** Price always comes from the server, never from the client. */
export function packagePriceUsd(id: string, dbPrice?: number | null): number | null {
  if (typeof dbPrice === "number") return dbPrice;
  return LISTING_PACKAGES.find((p) => p.id === id)?.priceUsd ?? null;
}
