import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/pulse", "/promotion", "/boost", "/add-coin", "/copilot", "/about", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: p === "" ? "hourly" : "weekly", priority: p === "" ? 1 : 0.6 }));
}
