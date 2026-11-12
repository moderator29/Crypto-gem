"use client";

import { ArrowRight, Coins, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { PublicMethod } from "@/lib/checkout/types";
import { AssetLogo } from "./parts";

const GROUPS = [
  { id: "stable", label: "Stablecoins", hint: "Pegged to the US dollar. No price risk.", assets: ["USDT", "USDC"], icon: Landmark },
  { id: "native", label: "Native coins", hint: "Priced live. Quote held for 20 minutes.", assets: ["ETH", "BNB"], icon: Coins },
] as const;

const ASSET_NAME: Record<string, string> = { USDT: "Tether USD", USDC: "USD Coin", ETH: "Ether", BNB: "BNB" };

/** Asset first, then network chips. Selecting both and continuing asks the server for a signed quote. */
export function MethodPicker({ methods, initialMethodId, busy, onPick }: { methods: PublicMethod[]; initialMethodId: string | null; busy: boolean; onPick: (methodId: string) => void }) {
  const initial = methods.find((m) => m.id === initialMethodId) ?? null;
  const [asset, setAsset] = useState<string>(initial?.asset ?? "USDT");
  const [methodId, setMethodId] = useState<string | null>(initial?.id ?? null);

  const networks = useMemo(() => methods.filter((m) => m.asset === asset), [methods, asset]);
  const selected = networks.find((m) => m.id === methodId) ?? (networks.length === 1 ? networks[0] : null);

  return (
    <div className="co-stack">
      {GROUPS.map((g) => {
        const Icon = g.icon;
        const assets = g.assets.filter((a) => methods.some((m) => m.asset === a));
        if (!assets.length) return null;
        return (
          <fieldset key={g.id} className="co-group">
            <legend className="co-group-head">
              <Icon size={16} aria-hidden="true" />
              <span>{g.label}</span>
              <span className="co-group-hint">{g.hint}</span>
            </legend>
            <div className="co-asset-grid">
              {assets.map((a) => {
                const sample = methods.find((m) => m.asset === a) as PublicMethod;
                const on = asset === a;
                return (
                  <button
                    key={a}
                    type="button"
                    className="co-asset"
                    aria-pressed={on}
                    onClick={() => {
                      setAsset(a);
                      setMethodId(null);
                    }}
                  >
                    <AssetLogo asset={a} networkId={sample.networkId} token={sample.token} size={36} />
                    <span className="min-w-0 text-left">
                      <span className="co-asset-sym">{a}</span>
                      <span className="co-asset-name">{ASSET_NAME[a] ?? a}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div>
        <p className="eyebrow mb-2">Network for {asset}</p>
        <div className="co-chips" role="radiogroup" aria-label={`Network for ${asset}`}>
          {networks.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={selected?.id === m.id} className="chip co-chip" onClick={() => setMethodId(m.id)}>
              <ChainBadge networkId={m.networkId} size={16} />
              {m.networkLabel}
            </button>
          ))}
        </div>
        {selected && <p className="co-note">{selected.note}. Other networks are lost.</p>}
      </div>

      <button type="button" className="btn btn-primary btn-lg co-cta" disabled={!selected || busy} aria-busy={busy} onClick={() => selected && onPick(selected.id)}>
        {busy ? "Preparing your payment" : selected ? `Pay with ${selected.asset} on ${selected.networkLabel}` : "Choose a network"}
        {!busy && <ArrowRight size={18} />}
      </button>
    </div>
  );
}
