export type ToolIcon = "pnl" | "position" | "dca" | "mcap" | "recovery" | "il";

export interface ToolMeta { slug: string; title: string; short: string; blurb: string; icon: ToolIcon }

export const TOOLS: ToolMeta[] = [
  { slug: "profit-loss", title: "Profit and loss", short: "P&L", blurb: "Entry, exit, amount and fees in. Profit or loss in dollars and percent out, plus your break-even exit.", icon: "pnl" },
  { slug: "position-size", title: "Position size and risk", short: "Position size", blurb: "Choose how much of your account you are willing to lose. Get the size, the max loss and the reward to risk.", icon: "position" },
  { slug: "dca", title: "DCA calculator", short: "DCA", blurb: "Buy a fixed amount on a schedule. See average cost, units bought and how it compares with buying all at once.", icon: "dca" },
  { slug: "market-cap", title: "Market cap what-if", short: "Market cap", blurb: "What would the price be at a different market cap or FDV? Holds supply fixed and shows the multiple.", icon: "mcap" },
  { slug: "recovery", title: "Percent change and break-even", short: "Break-even", blurb: "Measure a move, and see why a 50% loss needs a 100% gain to get back to even.", icon: "recovery" },
  { slug: "impermanent-loss", title: "Impermanent loss", short: "Impermanent loss", blurb: "How much a liquidity position gives up versus simply holding when prices drift apart.", icon: "il" },
];

export function toolBySlug(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
