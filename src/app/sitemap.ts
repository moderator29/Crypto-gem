import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/trending", "/markets", "/markets/new", "/markets/heating", "/markets/gainers", "/markets/losers", "/markets/volume", "/chains", "/search", "/pulse", "/promotion", "/boost", "/add-coin", "/copilot", "/about", "/privacy", "/terms", "/markets/map", "/compare", "/status", "/tools", "/learn", "/help", "/changelog", "/contact", "/glossary", "/tools/token-vesting", "/tools/staking-apy", "/tools/liquidation-price", "/tools/fee-slippage", "/tools/dca", "/tools/market-cap", "/tools/position-size", "/tools/impermanent-loss", "/tools/recovery", "/tools/profit-loss", "/learn/what-is-a-rug-pull", "/learn/liquidity-and-why-it-matters", "/learn/slippage-and-price-impact", "/learn/market-cap-vs-fdv", "/learn/how-to-read-a-dex-pair", "/learn/what-is-a-honeypot", "/learn/token-allowances-and-revoking", "/learn/mev-and-sandwich-attacks", "/learn/bridging-safely", "/learn/wallet-hygiene", "/learn/how-boost-and-sponsored-placements-work", "/learn/how-organic-rank-works"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: p === "" ? "hourly" : "weekly", priority: p === "" ? 1 : 0.6 }));
}
