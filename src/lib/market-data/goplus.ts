import { fetchJson } from "./http";

const CHAIN_ID: Record<string, string> = { ethereum: "1", bsc: "56", base: "8453", arbitrum: "42161", optimism: "10", polygon: "137", avalanche: "43114", fantom: "250", linea: "59144", scroll: "534352", zksync: "324", mantle: "5000", blast: "81457", cronos: "25", gnosis: "100", opbnb: "204" };

export interface RiskFlag { level: "high" | "medium" | "info"; label: string }
export interface RiskReport { source: "goplus"; flags: RiskFlag[]; checked: number; holders: number | null; buyTax: number | null; sellTax: number | null }

interface Raw { [k: string]: string | undefined; holder_count?: string; buy_tax?: string; sell_tax?: string }

const yes = (v: string | undefined) => v === "1";

/** Maps a GoPlus token_security record to plain flags. Every flag is a direct reading of one field. */
export function readRisk(raw: Raw): RiskReport {
  const flags: RiskFlag[] = [];
  const add = (cond: boolean, level: RiskFlag["level"], label: string) => cond && flags.push({ level, label });
  add(yes(raw.is_honeypot), "high", "Flagged as a honeypot: buyers may not be able to sell");
  add(yes(raw.cannot_sell_all), "high", "Holders cannot sell their full balance");
  add(yes(raw.is_blacklisted), "medium", "Contract can blacklist addresses");
  add(yes(raw.is_mintable), "medium", "Supply can be minted by the owner");
  add(yes(raw.can_take_back_ownership), "high", "Ownership can be taken back");
  add(yes(raw.hidden_owner), "medium", "Has a hidden owner");
  add(yes(raw.transfer_pausable), "medium", "Transfers can be paused");
  add(yes(raw.is_proxy), "info", "Upgradeable proxy contract");
  add(yes(raw.is_open_source) === false && raw.is_open_source !== undefined, "medium", "Contract source is not verified");
  const buy = raw.buy_tax ? Number(raw.buy_tax) : null;
  const sell = raw.sell_tax ? Number(raw.sell_tax) : null;
  add((buy ?? 0) >= 0.1, "medium", `Buy tax ${((buy ?? 0) * 100).toFixed(0)}%`);
  add((sell ?? 0) >= 0.1, "high", `Sell tax ${((sell ?? 0) * 100).toFixed(0)}%`);
  return { source: "goplus", flags, checked: 11, holders: raw.holder_count ? Number(raw.holder_count) : null, buyTax: buy, sellTax: sell };
}

/** Token security from GoPlus for EVM chains. Returns null when the chain is not covered or the provider has no record. */
export async function getRisk(networkId: string, address: string): Promise<RiskReport | null> {
  const chain = CHAIN_ID[networkId];
  if (!chain) return null;
  const a = address.toLowerCase();
  const json = await fetchJson<{ result?: Record<string, Raw> }>(`https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${a}`, { provider: "goplus", timeoutMs: 8000 });
  const raw = json.result?.[a];
  return raw ? readRisk(raw) : null;
}
