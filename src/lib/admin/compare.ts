import { sameAddress } from "@/lib/market-data/identifiers";

export type Verdict = "match" | "differs" | "owner_only" | "detected_only" | "both_empty";

export interface CompareRow {
  field: string;
  owner: string | null;
  detected: string | null;
  source: string | null;
  verdict: Verdict;
}

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);

/** Read a detected field. Snapshots store `{ value, source }`, but a bare primitive is accepted too. */
function detectedField(det: Dict | null, key: string): { value: string | null; source: string | null } {
  if (!det) return { value: null, source: null };
  const raw = det[key];
  const inner = isDict(raw) ? raw.value : raw;
  const source = isDict(raw) && typeof raw.source === "string" ? raw.source : null;
  if (typeof inner === "string" && inner.trim()) return { value: inner.trim(), source };
  if (typeof inner === "number" && Number.isFinite(inner)) return { value: String(inner), source };
  return { value: null, source };
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function verdictFor(field: string, owner: string | null, detected: string | null): Verdict {
  if (!owner && !detected) return "both_empty";
  if (!detected) return "owner_only";
  if (!owner) return "detected_only";
  if (field === "Contract address") return sameAddress(owner, detected) ? "match" : "differs";
  const norm = (s: string) => s.toLowerCase().replace(/\/+$/, "").replace(/\s+/g, " ");
  return norm(owner) === norm(detected) ? "match" : "differs";
}

interface SubmissionLike {
  name?: unknown;
  symbol?: unknown;
  network_id?: unknown;
  address?: unknown;
  logo_url?: unknown;
  description?: unknown;
  links?: unknown;
  detected?: unknown;
}

/**
 * Compare what the owner submitted with the detection snapshot stored on the submission.
 * `detected` is null when the snapshot was never stored, in which case every row is owner-only.
 */
export function compareSubmission(sub: SubmissionLike): { rows: CompareRow[]; hasSnapshot: boolean } {
  const det = isDict(sub.detected) ? sub.detected : null;
  const links = isDict(sub.links) ? sub.links : {};
  const spec: Array<[string, string | null, string]> = [
    ["Name", str(sub.name), "name"],
    ["Symbol", str(sub.symbol), "symbol"],
    ["Network", str(sub.network_id), "networkId"],
    ["Contract address", str(sub.address), "address"],
    ["Logo", str(sub.logo_url), "logoUrl"],
    ["Description", str(sub.description), "description"],
    ["Website", str(links.website), "website"],
    ["Twitter", str(links.twitter), "twitter"],
    ["Telegram", str(links.telegram), "telegram"],
    ["Discord", str(links.discord), "discord"],
    ["CoinGecko", str(links.coingecko), "coingeckoUrl"],
    ["CoinMarketCap", str(links.coinmarketcap), "coinmarketcapUrl"],
  ];
  const rows = spec.map(([field, owner, key]) => {
    const d = detectedField(det, key);
    return { field, owner, detected: d.value, source: d.source, verdict: verdictFor(field, owner, d.value) };
  });
  return { rows, hasSnapshot: det !== null };
}
