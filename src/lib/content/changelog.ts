export type ChangeTag = "New" | "Improved" | "Security" | "Data";

export interface ChangeItem { tag: ChangeTag; text: string }
export interface Release { version: string; title: string; date: string | null; summary: string; items: ChangeItem[] }

/** Newest first. Dates are shown only where a release date is known. */
export const RELEASES: Release[] = [
  {
    version: "0.5.0",
    title: "Tools, guides and help",
    date: "2026-11-04",
    summary: "A set of calculators, a learning library and a help centre, plus a pass over the account and payment screens.",
    items: [
      { tag: "New", text: "Trader tools: profit and loss, position size and risk, DCA, market cap what-if, break-even and impermanent loss calculators. Each shows its formula and uses only what you type." },
      { tag: "New", text: "Learn: twelve guides on rug pulls, liquidity, slippage, honeypots, allowances, MEV, bridging, wallet hygiene, and how Boost and organic rank work here." },
      { tag: "New", text: "Help centre with searchable answers on listings, Boost, banners, payments, accounts and data, and a contact form." },
      { tag: "Improved", text: "Payment page shows progress, a countdown to expiry, and a clear confirmation when your payment completes." },
      { tag: "Improved", text: "Dashboard tiles, activity timeline and empty states, plus a refreshed Copilot chat, Pulse and sign-in screens." },
    ],
  },
  {
    version: "0.4.0",
    title: "Navigation, boards and alerts",
    date: null,
    summary: "A new way around the site and richer live views of the market.",
    items: [
      { tag: "New", text: "Sidebar navigation with a consistent icon set and a compact bottom bar on phones." },
      { tag: "New", text: "Price board with sparklines, so you can see the shape of the last day at a glance." },
      { tag: "New", text: "Price map: a heat map of tokens sized and coloured by market activity." },
      { tag: "New", text: "Price alerts and a notifications inbox." },
      { tag: "New", text: "Compare view for lining up tokens side by side." },
      { tag: "Security", text: "Security check on token pages built from contract analysis, with the source of each signal shown." },
      { tag: "New", text: "Boost packs from Spark to Moon, with rotation priority by pack and queued repeat purchases." },
      { tag: "New", text: "Banner strip on Discover with hero, featured and side positions, each clearly labelled as sponsored." },
      { tag: "Data", text: "Detection fallbacks: when one provider cannot identify a contract or chain, the next is tried, and fields that stay unknown are shown as unknown." },
    ],
  },
  {
    version: "0.3.0",
    title: "Accounts and layouts",
    date: null,
    summary: "Sign-in moved to Privy and the layout grew up for larger screens.",
    items: [
      { tag: "Security", text: "Privy sign-in replaces the previous auth. Private tables are reachable from the server only." },
      { tag: "Improved", text: "Desktop and tablet layouts, a sortable market table and a right rail." },
      { tag: "New", text: "Add Coin parity with extra links and logo upload, community votes, and About, Privacy and Terms pages." },
    ],
  },
  {
    version: "0.2.0",
    title: "Boost, ads and Copilot",
    date: null,
    summary: "Paid visibility and the AI assistant arrive.",
    items: [
      { tag: "New", text: "Boost flow, ad booking and delivery with measured impressions and clicks." },
      { tag: "New", text: "AI Copilot for questions about tokens and markets." },
      { tag: "New", text: "Admin tools and moderation for reviewing listings and creatives." },
    ],
  },
  {
    version: "0.1.0",
    title: "Foundation",
    date: null,
    summary: "The first working version of the discovery platform.",
    items: [
      { tag: "Data", text: "Market data layer with caching, de-duplication, backoff and a circuit breaker over GeckoTerminal, CoinGecko and CoinMarketCap." },
      { tag: "New", text: "Discovery home with trending ranked by a public organic score, heating up, new pairs, gainers, losers and volume." },
      { tag: "New", text: "Token page with real candles, pools, derived risk signals and validated trade links." },
      { tag: "New", text: "Add Coin wizard with Express and Standard paths and live contract detection." },
      { tag: "New", text: "Dark and light themes." },
    ],
  },
];
