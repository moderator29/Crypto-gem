"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { isNativeMethod } from "./payHelpers";
import { AssetLogo, Callout } from "./payParts";
import type { PayMethod } from "./types";

interface Props {
  methods: PayMethod[] | null;
  methodsError: string | null;
  pendingId: string | null;
  error: string | null;
  onPick: (method: PayMethod) => void;
  onRetry: () => void;
}

function MethodCard({ m, busy, disabled, onPick }: { m: PayMethod; busy: boolean; disabled: boolean; onPick: (m: PayMethod) => void }) {
  return (
    <button type="button" className="pay-method" disabled={disabled} aria-busy={busy} onClick={() => onPick(m)}>
      <AssetLogo asset={m.asset} networkId={m.networkId} token={m.token} native={isNativeMethod(m)} />
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-bold">{m.asset}</span>
          <span className="chip pay-net-chip">
            <ChainBadge networkId={m.networkId} size={14} />
            {m.networkLabel}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-snug text-muted">{m.note}</span>
      </span>
      {busy ? <Loader2 size={18} className="shrink-0 animate-spin text-brand" aria-label="Preparing" /> : <ChevronRight size={18} className="pay-method-go shrink-0 text-muted" aria-hidden="true" />}
    </button>
  );
}

/** Asset and network choice. Picking an option creates the payment quote straight away. */
export function MethodPicker({ methods, methodsError, pendingId, error, onPick, onRetry }: Props) {
  if (methodsError) {
    return <EmptyState tone="error" title="Payment options could not be loaded" description={methodsError} action={<button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button>} />;
  }
  if (!methods) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading payment options">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[76px] rounded-[var(--r-lg)]" />)}
      </div>
    );
  }
  if (methods.length === 0) return <EmptyState title="No payment options are enabled right now" description="Please check back shortly. Your order is saved." />;

  const stable = methods.filter((m) => !isNativeMethod(m));
  const native = methods.filter(isNativeMethod);
  const groups = [
    { title: "Stablecoins", hint: "Priced 1 to 1 with the dollar", items: stable },
    { title: "Native coins", hint: "Amount follows the live rate", items: native },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {error && <Callout tone="error" title="Could not create the payment">{error}</Callout>}
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="eyebrow">{g.title}</h3>
            <span className="text-xs text-muted">{g.hint}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {g.items.map((m) => (
              <MethodCard key={m.id} m={m} busy={pendingId === m.id} disabled={pendingId !== null} onPick={onPick} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
