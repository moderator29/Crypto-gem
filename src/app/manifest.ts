import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CryptoGemCN",
    short_name: "CryptoGemCN",
    description: "Multi-chain token discovery, market intelligence, listings and promotion.",
    start_url: "/",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#08080a",
    categories: ["finance", "news"],
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Markets", url: "/markets" },
      { name: "Price alerts", url: "/alerts" },
      { name: "Watchlist", url: "/dashboard/watchlist" },
    ],
  };
}
