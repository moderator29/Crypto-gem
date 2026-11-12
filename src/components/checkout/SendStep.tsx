"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowRight, ExternalLink, RefreshCw, Shuffle } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { QuoteResponse } from "@/lib/checkout/types";
import { formatCountdown, formatUsd, splitFingerprint } from "./helpers";
import { AddressText, AssetLogo, Callout, CopyAction, CountdownRing, TrustLine, useCopy } from "./parts";

interface Props {
  quote: QuoteResponse;
  /** Token contract or mint, for the real logo. Null for native coins. */
  tokenAddress: string | null;
  token: string | null;
  remaining: number;
  span: number;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onSent: () => void;
  onChangeMethod: () => void;
}

/** Amount, address, QR of the plain address and the network warning: everything needed to send from a wallet. */
export function SendStep({ quote, tokenAddress, token, remaining, span, refreshing, refreshError, onRefresh, onSent, onChangeMethod }: Props) {
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);
  const expired = remaining <= 0;
  const { head, tail } = splitFingerprint(quote.amount);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(quote.address, { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark: "#0b0b0e", light: "#ffffff" } }).then(
      (url) => live && setQr(url),
      () => live && setQr(null),
    );
    return () => {
      live = false;
    };
  }, [quote.address]);

  return (
    <div className="co-stack">
      <Callout tone="warn" title={`Send only ${quote.asset} on ${quote.networkLabel}.`}>
        Another coin or another network will not reach us and cannot be recovered.
      </Callout>

      <div className="co-amount-card">
        <div className="co-row-between">
          <div className="co-row min-w-0">
            <AssetLogo asset={quote.asset} networkId={quote.networkId} token={tokenAddress} size={38} />
            <div className="min-w-0">
              <p className="eyebrow">Send exactly</p>
              <span className="co-net">
                <ChainBadge networkId={quote.networkId} size={14} />
                {quote.networkLabel}
              </span>
            </div>
          </div>
          {!expired && <CountdownRing remaining={remaining} span={span} />}
        </div>

        <button type="button" className="co-amount-btn" onClick={() => copy("amount", quote.amount, "Amount copied")} aria-label={`Copy amount ${quote.amount} ${quote.asset}`}>
          <span className="co-amount num">
            {head}
            {tail && <span className="co-amount-fp">{tail}</span>}
          </span>
          <span className="co-amount-asset">{quote.asset}</span>
        </button>
        <p className="co-amount-note">Send exactly this amount. The last digits identify your payment.</p>
        <p className="co-muted">
          About <span className="num co-strong">{formatUsd(quote.amountUsd)}</span>
          {quote.rate !== null && <> at {quote.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD per {quote.asset}, with a small buffer for price moves</>}
        </p>
        <CopyAction id="amount" value={quote.amount} label="Copy amount" message="Amount copied" copied={copied} onCopy={copy} />
      </div>

      <div className="co-send-grid">
        <div className="co-qr" role="img" aria-label={`QR code of the ${quote.networkLabel} receiving address`}>
          {qr ? <img src={qr} alt="" width={160} height={160} /> : <div className="skeleton h-full w-full" />}
        </div>
        <div className="co-stack-sm min-w-0">
          <p className="eyebrow">Our receiving address</p>
          <AddressText address={quote.address} />
          <p className="co-muted text-xs">Check the highlighted first and last 6 characters in your wallet before you confirm.</p>
          <div className="co-actions">
            <CopyAction id="address" value={quote.address} label="Copy address" message="Address copied" copied={copied} onCopy={copy} primary />
            <a className="btn" href={quote.explorerAddressUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Explorer
            </a>
          </div>
        </div>
      </div>

      {expired ? (
        <Callout tone="error" title="This quote has expired" icon={<RefreshCw size={18} />}>
          <p>Get a fresh quote before you send. If you already sent the amount above, tap &quot;I already sent it&quot; and paste the transaction hash. We still check it.</p>
          {refreshError && <p className="co-strong mt-2">{refreshError}</p>}
          <div className="co-actions mt-3">
            <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={refreshing} aria-busy={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing" : "New quote"}
            </button>
            <button type="button" className="btn" onClick={onSent} disabled={!token}>
              I already sent it
            </button>
          </div>
        </Callout>
      ) : (
        <div className="co-stack-sm">
          <button type="button" className="btn btn-primary btn-lg co-cta" onClick={onSent}>
            I have sent it <ArrowRight size={18} />
          </button>
          <p className="co-muted text-center text-xs">
            Quote held for <span className="num co-strong">{formatCountdown(remaining)}</span>. We wait for {quote.minConfirmations} confirmation{quote.minConfirmations === 1 ? "" : "s"} on {quote.networkLabel}.
          </p>
        </div>
      )}

      <button type="button" className="co-link" onClick={onChangeMethod}>
        <Shuffle size={14} /> Use a different coin or network
      </button>
      <TrustLine />
    </div>
  );
}
