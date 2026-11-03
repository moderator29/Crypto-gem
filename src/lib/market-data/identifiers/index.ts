export type AddressKind = "evm" | "solana" | "tron" | "ton" | "move" | "bitcoin" | "unknown";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const isBase58 = (s: string) => [...s].every((c) => BASE58.includes(c));

/**
 * Classify an address by format alone. This is a hint, never proof of a
 * network: every EVM chain shares one format.
 */
export function classifyAddress(input: string): AddressKind {
  const a = input.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "evm";
  if (/^0x[0-9a-fA-F]{1,64}::\w+::\w+$/.test(a)) return "move";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return "tron";
  if (/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(a)) return "ton";
  if (/^bc1[a-z0-9]{25,62}$/.test(a) || /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) return "bitcoin";
  if (a.length >= 32 && a.length <= 44 && isBase58(a)) return "solana";
  return "unknown";
}

/**
 * Canonical form for storage and comparison. EVM addresses are
 * case-insensitive (lowercased); all other families are case-sensitive and
 * returned untouched.
 */
export function normalizeAddress(input: string): string {
  const a = input.trim();
  return classifyAddress(a) === "evm" ? a.toLowerCase() : a;
}

export function sameAddress(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b);
}

/** Stable key for an asset: network plus canonical address. Symbols are never identifiers. */
export function assetKey(networkId: string, address: string): string {
  return `${networkId}:${normalizeAddress(address)}`;
}
