import { z } from "zod";
import { BOOST_PACKS, LISTING_PACKAGES, PLACEMENTS } from "@/lib/ads/catalog";
import { classifyAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";

/**
 * What can be bought at checkout, how it is validated and what it costs.
 * Prices always come from the catalog here, never from the client. Safe to import on the client
 * so the order summary shows exactly the price the server will quote.
 */

export const BANNER_DAYS = [1, 3, 7] as const;
export type BannerDays = (typeof BANNER_DAYS)[number];

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069\uFEFF]/g;

/** Strips control and bidi characters, collapses whitespace and bounds the length. */
export const cleanText = (s: string): string => s.replace(CONTROL, "").replace(/\s+/g, " ").trim();

const text = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanText)
    .pipe(z.string().min(1, "Required").max(max));

const symbol = z
  .string()
  .max(40)
  .transform(cleanText)
  .pipe(z.string().min(1, "Required").max(20).regex(/^[\p{L}\p{N}$._-]+$/u, "Use letters and numbers only"));

const networkId = z
  .string()
  .max(40)
  .refine((v) => !!getNetwork(v), "Unknown network");

const address = z.string().max(140).transform((s) => s.trim()).pipe(z.string().min(1).max(130).regex(/^[A-Za-z0-9:_.-]+$/, "Invalid address"));

/** Telegram handle: accepts "@name", "name" or a t.me link and keeps just the handle. */
const telegram = z
  .string()
  .max(120)
  .transform((s) => s.trim().replace(/^https?:\/\/(www\.)?t\.me\//i, "").replace(/^@/, "").replace(/\/+$/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9_]{4,32}$/, "Use a Telegram handle like @yourproject"));

const httpsUrl = z
  .string()
  .max(300)
  .transform((s) => s.trim())
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !!u.hostname && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a full https link")
  .transform((v) => new URL(v).toString());

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((v) => {
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}, "Invalid date");

/** EVM networks need a 0x address and Solana a base58 one; other families only get the generic format check. */
function addressFitsNetwork(network: string, addr: string): boolean {
  const fam = getNetwork(network)?.family;
  if (fam === "evm") return classifyAddress(addr) === "evm";
  if (fam === "solana") return classifyAddress(addr) === "solana";
  return true;
}

export const boostItemSchema = z
  .object({
    kind: z.literal("boost"),
    packId: z.string().refine((v) => BOOST_PACKS.some((p) => p.id === v), "Unknown boost pack"),
    network: networkId,
    address,
    name: text(60),
    symbol,
  })
  .refine((v) => addressFitsNetwork(v.network, v.address), { message: "That address does not match the network", path: ["address"] });

export const listingItemSchema = z
  .object({
    kind: z.literal("listing"),
    packageId: z.string().refine((v) => LISTING_PACKAGES.some((p) => p.id === v), "Unknown listing package"),
    name: text(60),
    symbol,
    network: networkId.optional(),
    address: address.optional(),
    telegram: telegram.optional(),
  })
  .refine((v) => !v.address || (!!v.network && addressFitsNetwork(v.network, v.address)), { message: "That address does not match the network", path: ["address"] });

export const bannerItemSchema = z
  .object({
    kind: z.literal("banner"),
    placementId: z.string().refine((v) => PLACEMENTS.some((p) => p.id === v), "Unknown placement"),
    days: z.union([z.literal(1), z.literal(3), z.literal(7)]),
    startDate: isoDay,
    name: text(60),
    url: httpsUrl,
  })
  .refine((v) => PLACEMENTS.find((p) => p.id === v.placementId)?.prices[v.days] !== undefined, { message: "That length is not sold for this placement", path: ["days"] });

export const itemSchema = z.union([boostItemSchema, listingItemSchema, bannerItemSchema]);

/** Validates an unknown value as an item, picking the schema by `kind` so errors name the real field. */
export function parseItem(raw: unknown): { ok: true; item: CheckoutItem } | { ok: false; error: string } {
  const kind = raw && typeof raw === "object" ? (raw as { kind?: unknown }).kind : undefined;
  const schema = kind === "boost" ? boostItemSchema : kind === "listing" ? listingItemSchema : kind === "banner" ? bannerItemSchema : null;
  if (!schema) return { ok: false, error: "Unknown checkout type." };
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, item: parsed.data } : { ok: false, error: firstIssue(parsed.error) };
}

export type BoostItem = z.infer<typeof boostItemSchema>;
export type ListingItem = z.infer<typeof listingItemSchema>;
export type BannerItem = z.infer<typeof bannerItemSchema>;
export type CheckoutItem = z.infer<typeof itemSchema>;

export interface ItemDescription {
  title: string;
  lines: string[];
  priceUsd: number;
}

const addDays = (day: string, n: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function duration(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  return `${hours} hours`;
}

const shortAddr = (a: string): string => (a.length > 16 ? `${a.slice(0, 8)}...${a.slice(-6)}` : a);

/** Title, summary lines and the catalog price of a validated item. Throws if the catalog no longer has it. */
export function describeItem(item: CheckoutItem): ItemDescription {
  if (item.kind === "boost") {
    const pack = BOOST_PACKS.find((p) => p.id === item.packId);
    if (!pack) throw new Error("Unknown boost pack");
    const net = getNetwork(item.network)?.name ?? item.network;
    return {
      title: `${pack.name} boost for ${item.name}`,
      lines: [`Project: ${item.name} (${item.symbol})`, `Network: ${net}`, `Contract: ${shortAddr(item.address)}`, `Pack: ${pack.name}, ${duration(pack.hours)} of sponsored visibility`],
      priceUsd: pack.priceUsd,
    };
  }
  if (item.kind === "listing") {
    const pkg = LISTING_PACKAGES.find((p) => p.id === item.packageId);
    if (!pkg) throw new Error("Unknown listing package");
    const lines = [`Project: ${item.name} (${item.symbol})`, `Package: ${pkg.name} listing`];
    if (item.network) lines.push(`Network: ${getNetwork(item.network)?.name ?? item.network}`);
    if (item.address) lines.push(`Contract: ${shortAddr(item.address)}`);
    if (item.telegram) lines.push(`Telegram: @${item.telegram}`);
    return { title: `${pkg.name} listing for ${item.name}`, lines, priceUsd: pkg.priceUsd };
  }
  const placement = PLACEMENTS.find((p) => p.id === item.placementId);
  const price = placement?.prices[item.days];
  if (!placement || price === undefined) throw new Error("Unknown placement");
  return {
    title: `${placement.name} banner for ${item.name}`,
    lines: [`Placement: ${placement.name}`, `Length: ${item.days} ${item.days === 1 ? "day" : "days"}`, `Runs: ${item.startDate} to ${addDays(item.startDate, item.days)} (UTC)`, `Link: ${item.url}`],
    priceUsd: price,
  };
}

/** Earliest and latest banner start dates accepted, as YYYY-MM-DD in UTC. */
export function bannerStartBounds(now = new Date()): { min: string; max: string } {
  const today = now.toISOString().slice(0, 10);
  return { min: today, max: addDays(today, 180) };
}

/** Server-only rule on top of the schema: a banner cannot start in the past or more than 180 days out. */
export function checkItemDates(item: CheckoutItem, now = new Date()): string | null {
  if (item.kind !== "banner") return null;
  const { min, max } = bannerStartBounds(now);
  if (item.startDate < min) return "The start date is in the past. Pick today or a later day.";
  if (item.startDate > max) return "Banner campaigns can be booked up to 180 days ahead.";
  return null;
}

type Query = Record<string, string | string[] | undefined>;
const one = (q: Query, k: string): string | undefined => {
  const v = q[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === "" ? undefined : s;
};

/**
 * Builds and validates an item from the /checkout query string:
 * kind, pack, package, placement, days, start, network, address, name, symbol, url, telegram.
 */
export function itemFromQuery(q: Query): { item: CheckoutItem | null; error: string | null } {
  const kind = one(q, "kind");
  if (!kind) return { item: null, error: null };
  let raw: Record<string, unknown>;
  if (kind === "boost") raw = { kind, packId: one(q, "pack"), network: one(q, "network"), address: one(q, "address"), name: one(q, "name"), symbol: one(q, "symbol") };
  else if (kind === "listing") raw = { kind, packageId: one(q, "package"), name: one(q, "name"), symbol: one(q, "symbol"), network: one(q, "network"), address: one(q, "address"), telegram: one(q, "telegram") };
  else if (kind === "banner") raw = { kind, placementId: one(q, "placement"), days: Number(one(q, "days")), startDate: one(q, "start"), name: one(q, "name"), url: one(q, "url") };
  else return { item: null, error: "Unknown checkout type." };
  const parsed = parseItem(raw);
  if (!parsed.ok) return { item: null, error: parsed.error };
  const dateError = checkItemDates(parsed.item);
  return dateError ? { item: null, error: dateError } : { item: parsed.item, error: null };
}

/** A readable message for the first validation problem, naming the field. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid order details.";
  const field = issue.path.filter((p) => p !== "item").join(".");
  if (issue.code === "invalid_type" && field) return `${field}: Required`;
  return field ? `${field}: ${issue.message}` : issue.message;
}
