"use client";

import { AlertTriangle, Check, Copy, ShieldCheck } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { trustChainLogo } from "@/lib/trustwallet";
import { addressChunks, formatCountdown } from "./helpers";

/** Clipboard write with a toast. `copied` holds the key of the last copied value for a moment. */
export function useCopy(): { copied: string | null; copy: (key: string, value: string, message: string) => Promise<void> } {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(
    async (key: string, value: string, message: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        toast.success(message);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
      } catch {
        toast.error("Could not copy", "Select the text and copy it manually.");
      }
    },
    [toast],
  );
  return { copied, copy };
}

const NATIVE_LOGO_CHAIN: Record<string, string> = { ETH: "ethereum", BNB: "bsc" };

/** Real asset logo: the token contract logo for stablecoins, the chain coin logo for ETH and BNB. */
export function AssetLogo({ asset, networkId, token, size = 40 }: { asset: string; networkId: string; token: string | null; size?: number }) {
  const chain = NATIVE_LOGO_CHAIN[asset];
  if (!token && chain) return <TokenLogo src={trustChainLogo(chain)} symbol={asset} size={size} />;
  return <TokenLogo src={null} symbol={asset} size={size} networkId={networkId} address={token} />;
}

/** Ring that drains as the quote window closes, with the time left in the middle. */
export function CountdownRing({ remaining, span, size = 60 }: { remaining: number; span: number; size?: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const frac = span > 0 ? Math.min(1, remaining / span) : 0;
  const low = remaining < 120;
  return (
    <div className="co-ring" style={{ width: size, height: size }} role="timer" aria-label={`Quote expires in ${formatCountdown(remaining)}`}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={low ? "var(--down)" : "var(--brand)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="co-ring-arc"
        />
      </svg>
      <span className="num">{formatCountdown(remaining)}</span>
    </div>
  );
}

/** Address in grouped chunks with the first and last six characters lit up. */
export function AddressText({ address }: { address: string }) {
  return (
    <span className="co-addr num" aria-label={address}>
      {addressChunks(address).map((c, i) => (
        <span key={i} className={c.highlight ? "co-addr-hl" : "co-addr-mid"} aria-hidden="true">
          {c.text}
        </span>
      ))}
    </span>
  );
}

/** Copy button that shows a tick once copied. */
export function CopyAction({ id, value, label, message, copied, onCopy, primary }: { id: string; value: string; label: string; message: string; copied: string | null; onCopy: (key: string, value: string, message: string) => Promise<void>; primary?: boolean }) {
  const done = copied === id;
  return (
    <button type="button" className={`btn ${primary ? "btn-primary" : ""} co-nowrap`} onClick={() => onCopy(id, value, message)} aria-label={label}>
      {done ? <Check size={16} /> : <Copy size={16} />}
      {done ? "Copied" : label}
    </button>
  );
}

/** Always visible reminder that we never ask for secrets. */
export function TrustLine() {
  return (
    <p className="co-trust">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>We never ask for your seed phrase or private key. You send from your own wallet; nobody else touches your funds.</span>
    </p>
  );
}

/** High contrast callout for warnings, errors and good news. */
export function Callout({ tone = "warn", title, children, icon }: { tone?: "warn" | "error" | "info" | "ok"; title?: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className={`co-callout co-callout-${tone}`} role={tone === "error" || tone === "warn" ? "alert" : "status"}>
      <span className="co-callout-icon" aria-hidden="true">
        {icon ?? <AlertTriangle size={18} />}
      </span>
      <div className="min-w-0">
        {title && <p className="co-callout-title">{title}</p>}
        {children && <div className="co-callout-body">{children}</div>}
      </div>
    </div>
  );
}
