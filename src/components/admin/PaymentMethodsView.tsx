"use client";

import { useState } from "react";
import { adminFetch, useAdminQuery } from "./api";
import { ConfirmDialog, Empty, Loading, Notice, PageTitle } from "./ui";

interface Method {
  id: string;
  label: string;
  provider_currency: string;
  network: string;
  enabled: boolean;
  providerListed: boolean | null;
}

const PROVIDER_NOTE = {
  unconfigured: "NOWPayments is not configured on the server, so no currency can be enabled.",
  unavailable: "NOWPayments did not answer. Existing settings are shown, but a currency cannot be enabled until the provider responds.",
} as const;

export function PaymentMethodsView() {
  const { data, error, loading, reload } = useAdminQuery<{ providerStatus: "ok" | "unconfigured" | "unavailable"; methods: Method[] }>("/api/admin/payment-methods");
  const [target, setTarget] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function apply(m: Method) {
    setBusy(true);
    setProblem(null);
    const res = await adminFetch("/api/admin/payment-methods", { method: "PUT", body: { id: m.id, enabled: !m.enabled } });
    setBusy(false);
    if (!res.ok) return setProblem(res.error);
    setTarget(null);
    reload();
  }

  return (
    <>
      <PageTitle title="Payment methods" hint="A currency can only be switched on while the provider lists it. Customers see a method only when it is enabled here and still listed." />
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.providerStatus !== "ok" && <div className="mb-3"><Notice>{PROVIDER_NOTE[data.providerStatus]}</Notice></div>}
      {data && data.methods.length === 0 && <Empty title="No payment methods" hint="The catalog migration has not been applied." />}
      {data && data.methods.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.methods.map((m) => (
            <li key={m.id} className="glass-flat flex min-w-0 items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="break-words font-semibold">{m.label} <span className="font-normal text-soft">on {m.network}</span></p>
                <p className="break-all text-xs text-muted">{m.provider_currency}</p>
                <p className={`mt-1 text-xs font-semibold ${m.providerListed === null ? "text-muted" : m.providerListed ? "text-up" : "text-down"}`}>
                  {m.providerListed === null ? "Provider status unknown" : m.providerListed ? "Listed by provider" : "Not listed by provider"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={m.enabled}
                aria-label={`${m.enabled ? "Disable" : "Enable"} ${m.label} on ${m.network}`}
                className={`relative h-8 w-14 shrink-0 rounded-full border border-[var(--border-strong)] transition ${m.enabled ? "bg-[var(--up)]" : "bg-[var(--surface)]"}`}
                onClick={() => { setProblem(null); setTarget(m); }}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${m.enabled ? "left-7" : "left-0.5"}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={target !== null}
        title={target ? `${target.enabled ? "Disable" : "Enable"} ${target.label} on ${target.network}` : ""}
        body={target?.enabled ? "Customers will stop seeing this option at checkout. Open payments are not affected." : "Customers will be able to pay with this currency. The provider must list it right now."}
        confirmLabel={target?.enabled ? "Disable" : "Enable"}
        danger={target?.enabled}
        busy={busy}
        error={problem}
        onConfirm={() => target && void apply(target)}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
