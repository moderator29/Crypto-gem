import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crypto Gems",
    short_name: "Crypto Gems",
    description: "Multi-chain token discovery, market intelligence, listings and promotion.",
    start_url: "/",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#08080a",
    categories: ["finance", "news"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Markets", url: "/markets" },
      { name: "Price alerts", url: "/alerts" },
      { name: "Watchlist", url: "/dashboard/watchlist" },
    ],
  };
}
