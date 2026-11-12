"use client";

import { AlertTriangle, Check, Copy, ShieldCheck } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { addressChunks, formatCountdown, isNativeMethod } from "./payHelpers";

/** Clipboard write with a confirmation toast. Returns a flag that flips for a moment after a successful copy. */
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

/** Asset logo: the real token logo where a contract is known, a clean lettered tile for native coins. */
export function AssetLogo({ asset, networkId, token, native, size = 44 }: { asset: string; networkId: string; token: string | null; native?: boolean; size?: number }) {
  const isNative = native ?? isNativeMethod({ kind: token ? "token" : "native", token });
  if (isNative) {
    return (
      <span className="pay-asset-tile" style={{ width: size, height: size, fontSize: size * 0.3 }} aria-hidden="true">
        {asset.slice(0, 4).toUpperCase()}
      </span>
    );
  }
  return <TokenLogo src={null} symbol={asset} size={size} networkId={networkId} address={token} />;
}

/** Ring that drains as the quote window closes, with the time left in the middle. */
export function CountdownRing({ remaining, span, size = 56 }: { remaining: number; span: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = span > 0 ? Math.min(1, remaining / span) : 0;
  const low = remaining < 120;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`Quote expires in ${formatCountdown(remaining)}`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={low ? "var(--down)" : "var(--brand)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 300ms ease", filter: low ? undefined : "drop-shadow(0 0 4px var(--neon-glow))" }}
        />
      </svg>
      <span className="num text-[11px] font-bold">{formatCountdown(remaining)}</span>
    </div>
  );
}

/** Address in grouped chunks with the first and last six characters lit up so it can be checked against the wallet screen. */
export function AddressText({ address }: { address: string }) {
  const chunks = addressChunks(address);
  return (
    <span className="pay-addr num" aria-label={address}>
      {chunks.map((c, i) => (
        <span key={i} className={c.highlight ? "pay-addr-hl" : "pay-addr-mid"} aria-hidden="true">
          {c.text}
        </span>
      ))}
    </span>
  );
}

/** Copy button that fills the row on a phone and shows a tick once copied. */
export function CopyRow({ id, value, label, message, copied, onCopy, primary }: { id: string; value: string; label: string; message: string; copied: string | null; onCopy: (key: string, value: string, message: string) => Promise<void>; primary?: boolean }) {
  const done = copied === id;
  return (
    <button type="button" className={`btn ${primary ? "btn-primary" : ""} pay-copy-btn`} onClick={() => onCopy(id, value, message)} aria-label={label}>
      {done ? <Check size={16} /> : <Copy size={16} />}
      {done ? "Copied" : label}
    </button>
  );
}

/** Always-visible reminder that we never ask for secrets. */
export function TrustLine({ className = "" }: { className?: string }) {
  return (
    <p className={`pay-trust ${className}`}>
      <ShieldCheck size={16} aria-hidden="true" className="shrink-0" />
      <span>We never ask for your seed phrase or private key. Only send from a wallet you control.</span>
    </p>
  );
}

/** High contrast callout used for the network warning and error states. */
export function Callout({ tone = "warn", title, children, icon }: { tone?: "warn" | "error" | "info" | "ok"; title?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className={`pay-callout pay-callout-${tone}`} role={tone === "error" || tone === "warn" ? "alert" : "status"}>
      <span className="pay-callout-icon" aria-hidden="true">
        {icon ?? <AlertTriangle size={18} />}
      </span>
      <div className="min-w-0">
        {title && <p className="pay-callout-title">{title}</p>}
        <div className="pay-callout-body">{children}</div>
      </div>
    </div>
  );
}
