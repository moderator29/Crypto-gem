import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/markets", "/markets/new", "/markets/heating", "/markets/gainers", "/markets/losers", "/markets/volume", "/chains", "/search", "/pulse", "/promotion", "/boost", "/add-coin", "/copilot", "/about", "/privacy", "/terms", "/markets/map", "/compare", "/status", "/tools", "/learn", "/help", "/changelog", "/contact"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: p === "" ? "hourly" : "weekly", priority: p === "" ? 1 : 0.6 }));
}
