"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowRight, ExternalLink, RefreshCw, Shuffle } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { formatAmount, formatCountdown, formatUsd, isNativeMethod, networkWarning } from "./payHelpers";
import { AddressText, AssetLogo, Callout, CopyRow, CountdownRing, TrustLine, useCopy } from "./payParts";
import type { PayIntent, PayMethod } from "./types";

interface Props {
  intent: PayIntent;
  method: PayMethod | null;
  remaining: number;
  span: number;
  expired: boolean;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onSent: () => void;
  onChangeMethod: () => void;
}

/** Amount, address, QR and the network warning. Everything a buyer needs to send from their own wallet. */
export function SendStep({ intent, method, remaining, span, expired, refreshing, refreshError, onRefresh, onSent, onChangeMethod }: Props) {
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(intent.address, { margin: 1, width: 288, errorCorrectionLevel: "M", color: { dark: "#0b0b0e", light: "#ffffff" } }).then(
      (url) => {
        if (live) setQr(url);
      },
      () => {
        if (live) setQr(null);
      },
    );
    return () => {
      live = false;
    };
  }, [intent.address]);

  return (
    <div className="space-y-5">
      <Callout tone="warn" title={networkWarning(intent.asset, intent.networkLabel)}>
        Sending a different coin or using another network will not reach us and cannot be recovered.
      </Callout>

      <div className="pay-amount-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AssetLogo asset={intent.asset} networkId={intent.networkId} token={method?.token ?? null} native={method ? isNativeMethod(method) : undefined} size={36} />
            <div className="min-w-0">
              <p className="eyebrow">Send exactly</p>
              <span className="chip pay-net-chip mt-1.5">
                <ChainBadge networkId={intent.networkId} size={14} />
                {intent.networkLabel}
              </span>
            </div>
          </div>
          {!expired && <CountdownRing remaining={remaining} span={span} />}
        </div>

        <button type="button" className="pay-amount-btn" onClick={() => copy("amount", intent.amount, "Amount copied")} aria-label={`Copy amount ${intent.amount} ${intent.asset}`}>
          <span className="pay-amount num">{formatAmount(intent.amount)}</span>
          <span className="pay-amount-asset">{intent.asset}</span>
        </button>
        <p className="text-sm text-soft">
          About <span className="num font-semibold text-[var(--text)]">{formatUsd(intent.amountUsd)}</span>
          {intent.rate !== null && <span className="text-muted"> at {intent.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })} USD per {intent.asset}</span>}
        </p>
        <div className="pay-actions">
          <CopyRow id="amount" value={intent.amount} label="Copy amount" message="Amount copied" copied={copied} onCopy={copy} />
        </div>
      </div>

      <div className="pay-send-grid">
        <div className="pay-qr" aria-label="QR code of the receiving address">
          {qr ? <img src={qr} alt={`QR code for the ${intent.networkLabel} receiving address`} width={144} height={144} /> : <div className="skeleton h-full w-full" />}
        </div>
        <div className="min-w-0 space-y-3">
          <p className="eyebrow">Our receiving address</p>
          <AddressText address={intent.address} />
          <p className="text-xs text-muted">Check the first 6 and last 6 characters match in your wallet before you confirm.</p>
          <div className="pay-actions">
            <CopyRow id="address" value={intent.address} label="Copy address" message="Address copied" copied={copied} onCopy={copy} primary />
            <a className="btn" href={intent.explorerAddressUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Explorer
            </a>
          </div>
        </div>
      </div>

      {expired ? (
        <Callout tone="error" title="This quote has expired" icon={<RefreshCw size={18} />}>
          <p>Prices move, so the amount is only held for a short time. Get a fresh quote before you send. If you already sent funds, tap below and paste your transaction hash. We will still check it.</p>
          {refreshError && <p className="mt-2 font-semibold">{refreshError}</p>}
          <div className="pay-actions mt-3">
            <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing" : "Refresh quote"}
            </button>
            <button type="button" className="btn" onClick={onSent}>I already sent it</button>
          </div>
        </Callout>
      ) : (
        <div className="space-y-3">
          <button type="button" className="btn btn-primary btn-lg pay-cta" onClick={onSent}>
            I have sent it <ArrowRight size={18} />
          </button>
          <p className="text-center text-xs text-muted">
            Quote held for <span className="num font-semibold">{formatCountdown(remaining)}</span>. We need {intent.minConfirmations} confirmation{intent.minConfirmations === 1 ? "" : "s"} on the network.
          </p>
        </div>
      )}

      <button type="button" className="pay-link" onClick={onChangeMethod}>
        <Shuffle size={14} /> Use a different method
      </button>
      <TrustLine />
    </div>
  );
}
