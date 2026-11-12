"use client";

import { ArrowLeft, Check, ClipboardPaste, ExternalLink, Loader2, Search, Send, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Meter } from "@/components/ui/Kit";
import type { QuoteResponse, VerifyResponse } from "@/lib/checkout/types";
import { hashFamily, shortHash, validateTxHash } from "./helpers";
import { Callout, TrustLine } from "./parts";

interface Props {
  quote: QuoteResponse;
  explorerTx: string | null;
  submitted: string | null;
  status: VerifyResponse | null;
  checking: boolean;
  error: string | null;
  onSubmit: (hash: string) => void;
  onBack: () => void;
}

type Stage = "todo" | "active" | "done";

function Row({ stage, icon, title, body }: { stage: Stage; icon: ReactNode; title: string; body?: ReactNode }) {
  return (
    <li className={`co-tl-row co-tl-${stage}`}>
      <span className="co-tl-dot" aria-hidden="true">
        {stage === "done" ? <Check size={14} /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="co-tl-title">{title}</p>
        {body && <div className="co-tl-body">{body}</div>}
      </div>
    </li>
  );
}

/** Paste the transaction hash, then watch it go from submitted to verified. */
export function ConfirmStep({ quote, explorerTx, submitted, status, checking, error, onSubmit, onBack }: Props) {
  const family = hashFamily(quote.networkId);
  const [value, setValue] = useState(submitted ?? "");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const check = validateTxHash(family, value);
  const rejected = status?.status === "rejected";
  const editing = !submitted || rejected;

  async function paste() {
    setPasteError(null);
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) setValue(t);
    } catch {
      setPasteError("Your browser blocked pasting. Long press the field and paste.");
    }
  }

  const found = status?.status === "confirming" || status?.status === "paid";
  const conf = status?.confirmations ?? 0;
  const req = status?.required ?? quote.minConfirmations;
  const paid = status?.status === "paid";

  return (
    <div className="co-stack">
      {editing && (
        <form
          className="co-stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (check.ok) onSubmit(value.trim());
          }}
        >
          <label htmlFor="co-hash" className="co-label">
            {family === "solana" ? "Transaction signature" : "Transaction hash"}
          </label>
          <p className="co-muted text-sm">Find it in your wallet&apos;s activity, under the {quote.asset} transfer you just sent.</p>
          <div className="co-hash-row">
            <input
              id="co-hash"
              className="input co-hash-input num"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={family === "solana" ? "5h3k...signature" : "0x..."}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              aria-invalid={!!check.error}
              aria-describedby="co-hash-help"
            />
            <button type="button" className="btn co-nowrap" onClick={paste}>
              <ClipboardPaste size={16} /> Paste
            </button>
          </div>
          <p id="co-hash-help" className={`text-xs ${check.error || pasteError ? "co-err" : "co-muted"}`} aria-live="polite">
            {check.error ?? pasteError ?? (check.ok ? "Looks right." : family === "solana" ? "80 to 90 letters and numbers." : "0x followed by 64 characters.")}
          </p>
          <button type="submit" className="btn btn-primary btn-lg co-cta" disabled={!check.ok || checking} aria-busy={checking}>
            {checking ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {checking ? "Checking" : "Check my payment"}
          </button>
        </form>
      )}

      {rejected && status && (
        <Callout tone="error" title="We could not accept that transaction">
          {status.message}
        </Callout>
      )}
      {error && <Callout tone="error" title={error} />}

      {submitted && !rejected && (
        <div className="co-glass-inner">
          <ol className="co-timeline" aria-live="polite">
            <Row
              stage="done"
              icon={<Send size={14} />}
              title="Submitted"
              body={
                <span className="num">
                  {shortHash(submitted, 10)}
                  {explorerTx && (
                    <>
                      {" "}
                      <a className="co-inline-link" href={explorerTx} target="_blank" rel="noopener noreferrer">
                        View <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </span>
              }
            />
            <Row stage={found ? "done" : "active"} icon={<Search size={14} />} title={found ? "Found on chain" : "Looking for it on chain"} body={!found ? status?.message ?? "This can take a minute after you send." : undefined} />
            <Row
              stage={paid ? "done" : found ? "active" : "todo"}
              icon={<Loader2 size={14} className={found && !paid ? "animate-spin" : ""} />}
              title={`${Math.min(conf, req)} of ${req} confirmations`}
              body={found && !paid ? <Meter value={(Math.min(conf, req) / Math.max(1, req)) * 100} label="Confirmations" tone="up" className="mt-2" /> : undefined}
            />
            <Row stage={paid ? "done" : "todo"} icon={<ShieldCheck size={14} />} title="Verified" body={paid ? "Payment verified." : undefined} />
          </ol>
          <p className="co-muted mt-4 text-xs">We check every few seconds while this page is open. You can leave and come back: this checkout is saved on this device.</p>
        </div>
      )}

      <button type="button" className="co-link" onClick={onBack}>
        <ArrowLeft size={14} /> Back to payment details
      </button>
      <TrustLine />
    </div>
  );
}
