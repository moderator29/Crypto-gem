import type { ParamSpec } from "@/lib/engage/params";
import { COMPOUND_OPTIONS } from "./staking";

const price = { kind: "num", min: 0, max: 1e18 } as const;
const pct = (min: number, max: number) => ({ kind: "num", min, max }) as const;

/** What each calculator accepts from a shared link or a saved scenario. Anything outside these ranges is clamped or dropped. */
export const TOOL_SPECS: Record<string, ParamSpec> = {
  "profit-loss": { entry: price, exit: price, amount: price, fees: price },
  "position-size": { account: price, risk: pct(0, 100), entry: price, stop: price, target: price },
  dca: { mode: { kind: "pick", options: ["linear", "list"] }, amount: price, count: pct(0, 500), start: price, end: price, prices: { kind: "list", min: 0, max: 1e18, maxItems: 500 } },
  "market-cap": { basis: { kind: "pick", options: ["Market cap", "FDV"] }, price, current: price, target: price },
  recovery: { mode: { kind: "pick", options: ["recover", "move"] }, loss: pct(0, 99.99), from: price, to: price },
  "impermanent-loss": { change: pct(-99.99, 1e9), deposit: price },
  "token-vesting": { total: price, cliff: pct(0, 120), linear: pct(0, 120), tge: pct(0, 100) },
  "staking-apy": { principal: price, apr: pct(0, 1000), freq: { kind: "pick", options: COMPOUND_OPTIONS }, years: pct(0, 100) },
  "liquidation-price": { side: { kind: "pick", options: ["long", "short"] }, entry: price, leverage: pct(1, 1000), mmr: pct(0, 49.99), margin: price },
  "fee-slippage": { size: price, fee: pct(0, 99.99), impact: pct(0, 99.99), network: price },
};
