"use client";

import { ArrowLeft, Check, ClipboardPaste, Loader2, RefreshCw, Shuffle } from "lucide-react";
import { useState } from "react";
import { Meter } from "@/components/ui/Kit";
import { amountShortfall, formatAmount, networkFamily, shortHash, validateTxHash } from "./payHelpers";
import { Callout, TrustLine } from "./payParts";
import type { PayIntent, PayStatus } from "./types";

interface Props {
  intent: PayIntent;
  status: PayStatus | null;
  submittedHash: string | null;
  submitting: boolean;
  rejection: string | null;
  expired: boolean;
  refreshing: boolean;
  onSubmit: (hash: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onChangeMethod: () => void;
}

type StepState = "done" | "active" | "todo";

function TimelineRow({ state, title, children }: { state: StepState; title: string; children?: React.ReactNode }) {
  return (
    <li className={`pay-tl-row pay-tl-${state}`}>
      <span className="pay-tl-dot" aria-hidden="true">
        {state === "done" ? <Check size={14} /> : state === "active" ? <Loader2 size={14} className="animate-spin" /> : null}
      </span>
      <div className="min-w-0">
        <p className="pay-tl-title">{title}</p>
        {children && <div className="pay-tl-body">{children}</div>}
      </div>
    </li>
  );
}

/** Live status timeline for a submitted or detected payment. */
function Timeline({ intent, status, hash }: { intent: PayIntent; status: PayStatus | null; hash: string | null }) {
  const confirmations = status?.confirmations ?? 0;
  const required = status?.required || intent.minConfirmations;
  const found = confirmations > 0 || status?.status === "confirming" || status?.status === "finished";
  const verified = status?.status === "finished";
  const pct = required > 0 ? Math.min(100, (confirmations / required) * 100) : 0;
  const shortfall = status && !verified ? amountShortfall(intent.amount, status.paidAmount) : null;

  return (
    <div className="space-y-4">
      <ol className="pay-timeline" aria-label="Payment status">
        <TimelineRow state="done" title="Submitted">
          {hash && <span className="num break-all">{shortHash(hash, 10)}</span>}
        </TimelineRow>
        <TimelineRow state={found ? "done" : "active"} title="Found on chain">
          {!found && "Looking for your transaction. This can take a minute or two, and we keep checking for you."}
        </TimelineRow>
        <TimelineRow state={verified ? "done" : found ? "active" : "todo"} title={`${Math.min(confirmations, required)} of ${required} confirmations`}>
          {found && <Meter value={pct} tone={verified ? "up" : "brand"} label="Confirmations" className="mt-2" />}
        </TimelineRow>
        <TimelineRow state={verified ? "done" : "todo"} title="Verified" />
      </ol>
      {shortfall && status && (
        <Callout tone="warn" title="Part of the payment has arrived">
          <p>
            We received <span className="num font-semibold">{formatAmount(String(status.paidAmount))} {intent.asset}</span> of <span className="num font-semibold">{formatAmount(intent.amount)} {intent.asset}</span>.
          </p>
          <p className="mt-1.5">To finish, send the remaining <span className="num font-semibold">{formatAmount(shortfall)} {intent.asset}</span> to the same address on {intent.networkLabel}. No need to start over.</p>
        </Callout>
      )}
      {status?.status === "failed" && (
        <Callout tone="error" title="This payment did not complete">
          {status.message ?? "The network could not complete this transfer."} If funds left your wallet, keep your transaction hash and contact support with it so we can sort it out.
        </Callout>
      )}
      {status?.message && status.status !== "failed" && !verified && <p className="text-sm text-soft" role="status" aria-live="polite">{status.message}</p>}
    </div>
  );
}

/** Transaction hash entry, validation and the live status timeline. */
export function ConfirmStep({ intent, status, submittedHash, submitting, rejection, expired, refreshing, onSubmit, onRefresh, onBack, onChangeMethod }: Props) {
  const family = networkFamily(intent.networkId);
  const [value, setValue] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const check = validateTxHash(family, value);
  const detected = status?.status === "confirming" || status?.status === "finished" || (status?.confirmations ?? 0) > 0;
  const showTimeline = submittedHash !== null || detected || status?.status === "failed";
  const locked = submittedHash !== null && !rejection;

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text.trim());
      setPasteNote(null);
    } catch {
      setPasteNote("Your browser blocked pasting. Press and hold in the field, then choose Paste.");
    }
  }

  const placeholder = family === "evm" ? "0x..." : "Transaction signature";

  return (
    <div className="space-y-5">
      <button type="button" className="pay-link" onClick={onBack}>
        <ArrowLeft size={14} /> Back to payment details
      </button>

      {expired && !showTimeline && (
        <Callout tone="error" title="This quote has expired" icon={<RefreshCw size={18} />}>
          <p>If you already sent the funds, paste your hash below and we will still check it. Otherwise get a fresh quote before sending.</p>
          <div className="pay-actions mt-3">
            <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing" : "Refresh quote"}
            </button>
          </div>
        </Callout>
      )}

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (check.ok && !submitting && !locked) onSubmit(value.trim());
        }}
      >
        <label htmlFor="pay-hash" className="block">
          <span className="eyebrow">Transaction hash</span>
          <span className="mt-1.5 block text-sm text-soft">Paste the hash from your wallet after you send. It helps us find your payment faster.</span>
        </label>
        <div className="pay-hash-row">
          <input
            id="pay-hash"
            className="input num pay-hash-input"
            value={locked && submittedHash ? submittedHash : value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            disabled={locked || submitting}
            aria-invalid={Boolean(check.error)}
            aria-describedby="pay-hash-help"
          />
          <button type="button" className="btn pay-paste" onClick={paste} disabled={locked || submitting}>
            <ClipboardPaste size={16} /> Paste
          </button>
        </div>
        <p id="pay-hash-help" className={`text-xs ${check.error ? "text-down" : "text-muted"}`} role={check.error ? "alert" : undefined}>
          {check.error ?? pasteNote ?? (family === "evm" ? "EVM hash: 0x and 64 characters." : "Solana signature: 80 to 90 characters.")}
        </p>
        {rejection && (
          <Callout tone="error" title="We could not match that transaction yet">
            <p>{rejection}</p>
            <p className="mt-1.5">Check that the hash is from the network and address shown above. Nothing is lost: if the transfer is on its way, it will still be found.</p>
          </Callout>
        )}
        {!locked && (
          <button type="submit" className="btn btn-primary btn-lg pay-cta" disabled={!check.ok || submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {submitting ? "Checking" : "Submit hash"}
          </button>
        )}
        {!locked && !showTimeline && <p className="text-center text-xs text-muted">No hash yet? Stay on this page. Many payments are found on their own once the network sees them.</p>}
      </form>

      {showTimeline && <Timeline intent={intent} status={status} hash={submittedHash ?? status?.txHash ?? null} />}

      {showTimeline && status?.status === "expired" && (
        <Callout tone="warn" title="The quote window closed before we found your transaction" icon={<RefreshCw size={18} />}>
          <p>If your transfer is still pending on the network, keep your hash and contact support with it. To pay again, get a fresh quote and send to the new address.</p>
          <div className="pay-actions mt-3">
            <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing" : "Refresh quote"}
            </button>
          </div>
        </Callout>
      )}

      {!showTimeline && status?.status === "waiting" && (
        <p className="flex items-center gap-2 text-sm text-soft" role="status" aria-live="polite">
          <Loader2 size={15} className="animate-spin text-brand" /> Waiting for your transfer to appear on {intent.networkLabel}
        </p>
      )}

      {!(locked && status?.status === "confirming") && (
        <button type="button" className="pay-link" onClick={onChangeMethod}>
          <Shuffle size={14} /> Use a different method
        </button>
      )}
      <TrustLine />
    </div>
  );
}
