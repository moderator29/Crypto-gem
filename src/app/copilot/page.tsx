import type { Metadata } from "next";
import { Chat } from "@/components/copilot/Chat";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";

export const metadata: Metadata = { title: "AI Copilot" };

export default async function CopilotPage({ searchParams }: { searchParams: Promise<{ network?: string; address?: string }> }) {
  const { network, address } = await searchParams;
  const ctx = network && address && getNetwork(network) && classifyAddress(address) !== "unknown" ? { network, address: normalizeAddress(address) } : null;
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="font-display text-3xl font-bold">AI Copilot</h1>
        <p className="text-sm text-soft">Research assistant that reads live market data. Facts come from data sources, interpretation is labelled.</p>
      </header>
      {configured ? <Chat context={ctx} /> : <div className="glass p-6 text-sm text-soft">The Copilot is not configured in this environment. Set <code>ANTHROPIC_API_KEY</code> (see SETUP.md). Nothing is simulated.</div>}
    </div>
  );
}
