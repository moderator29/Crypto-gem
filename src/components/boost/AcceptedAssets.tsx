import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { DIRECT_METHODS, type DirectAsset } from "@/lib/payments/direct/methods";

const ASSETS: DirectAsset[] = ["USDT", "USDC", "ETH", "BNB"];

/** The accepted assets and networks, derived from the live method list so the chips can never drift from what the payment page offers. */
export function acceptedAssets() {
  const assets = ASSETS.flatMap((asset) => {
    const m = DIRECT_METHODS.find((x) => x.asset === asset);
    return m ? [{ asset, networkId: m.networkId, token: m.kind === "native" ? null : (m.token ?? null) }] : [];
  });
  const networks = [...new Map(DIRECT_METHODS.map((m) => [m.networkId, m.networkLabel])).entries()].map(([id, label]) => ({ id, label }));
  return { assets, networks };
}

/** Asset and network logo chips for the "Pay with crypto" block. */
export function AcceptedAssets({ className = "" }: { className?: string }) {
  const { assets, networks } = acceptedAssets();
  return (
    <div className={`min-w-0 space-y-3 ${className}`}>
      <ul className="flex flex-wrap gap-2" aria-label="Accepted assets">
        {assets.map((a) => (
          <li key={a.asset} className="asset-chip">
            {a.token ? <TokenLogo src={null} symbol={a.asset} size={20} networkId={a.networkId} address={a.token} /> : <ChainBadge networkId={a.networkId} size={20} />}
            <span>{a.asset}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-2" aria-label="Accepted networks">
        {networks.map((n) => (
          <li key={n.id} className="asset-chip asset-chip-net">
            <ChainBadge networkId={n.id} size={16} />
            <span>{n.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">You choose the asset and network on the next screen. Sent from your own wallet, verified on chain.</p>
    </div>
  );
}
