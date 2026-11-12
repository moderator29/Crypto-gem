import { DIRECT_METHODS } from "@/lib/payments/direct/methods";

/** The platform receiving wallets, one row per address with the networks it receives on. */
export function receivingWallets(): Array<{ address: string; family: "evm" | "solana"; networks: string[] }> {
  const byAddress = new Map<string, { family: "evm" | "solana"; networks: Set<string> }>();
  for (const m of DIRECT_METHODS) {
    const row = byAddress.get(m.address) ?? { family: m.networkId === "solana" ? "solana" : "evm", networks: new Set<string>() };
    row.networks.add(m.networkLabel);
    byAddress.set(m.address, row);
  }
  return [...byAddress.entries()].map(([address, v]) => ({ address, family: v.family, networks: [...v.networks] }));
}
