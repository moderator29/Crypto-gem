import type { NavIconName } from "@/components/ui/NavIcon";

export interface PageJump { href: string; label: string; hint: string; icon: NavIconName; keys: string }

/** Pages reachable from the command palette. `keys` holds extra words people might type. */
export const PAGE_JUMPS: PageJump[] = [
  { href: "/", label: "Discover", hint: "Home", icon: "home", keys: "home start" },
  { href: "/markets", label: "Markets", hint: "Trending coins", icon: "markets", keys: "trending prices coins" },
  { href: "/markets/new", label: "New pairs", hint: "Fresh pools", icon: "fresh", keys: "new launches pools" },
  { href: "/markets/heating", label: "Heating up", hint: "Volume surges", icon: "heating", keys: "hot volume" },
  { href: "/markets/map", label: "Price map", hint: "Heatmap", icon: "map", keys: "heatmap treemap" },
  { href: "/chains", label: "Chains", hint: "Browse networks", icon: "chains", keys: "networks solana base ethereum" },
  { href: "/copilot", label: "AI Copilot", hint: "Ask about a token", icon: "copilot", keys: "ai assistant chat" },
  { href: "/pulse", label: "Market Pulse", hint: "Where activity is", icon: "pulse", keys: "activity" },
  { href: "/compare", label: "Compare tokens", hint: "Overlay 7 days", icon: "compare", keys: "versus" },
  { href: "/add-coin", label: "Add coin", hint: "List a token", icon: "add", keys: "list listing submit express" },
  { href: "/boost", label: "Boost", hint: "Sponsored packs", icon: "boost", keys: "promote packs" },
  { href: "/promotion", label: "Banner promotion", hint: "Banner placements", icon: "promo", keys: "ads advertise banner" },
  { href: "/dashboard/watchlist", label: "Watchlist", hint: "Tokens you follow", icon: "star", keys: "favourites favorites" },
  { href: "/alerts", label: "Price alerts", hint: "Notify me", icon: "alert", keys: "notify" },
  { href: "/notifications", label: "Notifications", hint: "Inbox", icon: "inbox", keys: "inbox" },
  { href: "/dashboard", label: "Dashboard", hint: "Listings and payments", icon: "dashboard", keys: "account orders" },
  { href: "/profile", label: "Profile", hint: "Your account", icon: "home", keys: "account me" },
  { href: "/settings", label: "Settings", hint: "Preferences", icon: "settings", keys: "theme sound language" },
  { href: "/tools", label: "Trader tools", hint: "Calculators", icon: "tools", keys: "calculator pnl dca" },
  { href: "/learn", label: "Learn", hint: "Guides", icon: "learn", keys: "guide glossary rug" },
  { href: "/help", label: "Help", hint: "FAQ", icon: "help", keys: "faq support" },
  { href: "/status", label: "Data status", hint: "Provider health", icon: "status", keys: "uptime" },
];

/** Pages matching what was typed. With nothing typed, the most used pages. */
export function matchPages(q: string): PageJump[] {
  const t = q.trim().toLowerCase();
  if (!t) return PAGE_JUMPS.slice(0, 8);
  return PAGE_JUMPS.filter((p) => `${p.label} ${p.hint} ${p.keys}`.toLowerCase().includes(t)).slice(0, 6);
}
