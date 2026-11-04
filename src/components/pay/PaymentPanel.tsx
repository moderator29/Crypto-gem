"use client";

/* eslint-disable @next/next/no-img-element */

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { fireConfetti } from "@/components/fx/confetti";
import { playSound } from "@/components/fx/sound";
import { CopyButton } from "@/components/ui/CopyButton";
import { Stepper } from "@/components/ui/Kit";
import { accessToken } from "@/lib/auth/client";

interface Payment { id: string; provider_payment_id: string; pay_currency: string; pay_network: string | null; pay_amount: number; pay_address: string; actually_paid: number | null; status: string; expires_at: string | null }
interface Method { id: string; label: string; provider_currency: string; network: string }
interface Data { order: { id: string; kind: string; price_usd: number; status: string }; payment: Payment | null; methods: Method[] }

const STATUS_TEXT: Record<string, string> = {
  created: "Preparing payment", waiting: "Waiting for payment", confirming: "Payment detected, confirming on the network", confirmed: "Confirmed on the network, finalising",
  sending: "Finalising with the payment provider", partially_paid: "Partial payment received. Send the remaining amount to the same address.",
  finished: "Payment complete", failed: "Payment failed", expired: "Payment expired", refunded: "Payment refunded",
};

const STEPS = ["Pay", "Confirm", "Live"];
const CONFIRMING = ["confirming", "confirmed", "sending"];

/** Ring that drains as the payment window closes. */
function CountdownRing({ remaining, span }: { remaining: number; span: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = span > 0 ? Math.min(1, remaining / span) : 0;
  const low = remaining < 120;
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center" role="timer" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds left`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={low ? "var(--down)" : "var(--brand)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear, stroke 300ms ease" }} />
      </svg>
      <span className="num text-[11px] font-bold">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
    </div>
  );
}

export function PaymentPanel({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "signin" | "error">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState("");
  const [span, setSpan] = useState<{ id: string; secs: number } | null>(null);
  const wasDone = useRef<boolean | null>(null);

  const load = useCallback(async () => {
    const token = await accessToken();
    if (!token) return setState("signin");
    const res = await fetch(`/api/payments/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return setState("signin");
    if (!res.ok) return setState("error");
    const next = (await res.json()) as Data;
    setData(next);
    const pay = next.payment;
    if (pay?.expires_at) {
      const secs = Math.max(0, Math.floor((Date.parse(pay.expires_at) - Date.now()) / 1000));
      setSpan((prev) => (prev?.id === pay.id ? prev : { id: pay.id, secs }));
    }
    setState("ok");
  }, [orderId]);

  useEffect(() => {
    // Initial fetch from an external system; state is set after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => clearInterval(t);
  }, [load]);

  const status = data?.payment?.status;
  const active = data?.order.status === "pending" && status && !["finished", "failed", "expired", "refunded"].includes(status);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [active, load]);

  const isDone = status === "finished" || data?.order.status === "paid";
  useEffect(() => {
    if (!data) return;
    if (wasDone.current === false && isDone) {
      fireConfetti({ sound: false });
      playSound("success");
    }
    wasDone.current = isDone;
  }, [data, isDone]);

  const addr = data?.payment?.pay_address;
  useEffect(() => {
    if (!addr) return;
    QRCode.toDataURL(addr, { margin: 1, width: 220 }).then(setQr, () => setQr(null));
  }, [addr]);

  async function create() {
    const token = await accessToken();
    if (!token || !currency) return;
    setBusy(true);
    await fetch("/api/payments/create", { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ orderId, payCurrency: currency }) });
    setBusy(false);
    load();
  }

  if (state === "loading") return <div className="skeleton h-72" aria-busy="true" />;
  if (state === "signin") return <div className="card p-6"><p className="mb-3">Sign in to view this payment.</p><Link className="btn btn-primary" href={`/login?next=/pay/${orderId}`}>Sign in</Link></div>;
  if (state === "error" || !data) return <div className="card p-6 text-down" role="alert">This order could not be loaded.</div>;

  const p = data.payment;
  const remaining = p?.expires_at ? Math.max(0, Math.floor((Date.parse(p.expires_at) - now) / 1000)) : null;
  const done = isDone;
  const needsNew = !p || ["expired", "failed"].includes(p.status);
  const step = done ? 2 : p && !needsNew && status && CONFIRMING.includes(status) ? 1 : 0;

  return (
    <section className="card space-y-5 p-5 md:p-7" aria-label="Payment details">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Payment</h1>
        <span className="num text-lg font-bold">${Number(data.order.price_usd).toLocaleString("en-US")}</span>
      </div>

      <Stepper steps={STEPS} current={done ? 3 : step} />

      {done && (
        <div className="card-flat fx-pop flex items-start gap-3 p-4" role="status">
          <CheckCircle2 className="mt-0.5 text-up" /> <div><p className="font-semibold">Payment confirmed</p><p className="text-sm text-soft">Your listing is now in review. We will notify you of the decision.</p></div>
        </div>
      )}

      {!done && needsNew && (
        <div className="space-y-3">
          {p && <p className="flex items-center gap-2 text-sm text-warm"><AlertTriangle size={15} /> {STATUS_TEXT[p.status]}. Start a new payment below. Do not send funds to the old address.</p>}
          <label className="block"><span className="mb-1 block text-sm font-semibold">Pay with</span>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">Select currency and network</option>
              {data.methods.map((m) => <option key={m.id} value={m.provider_currency}>{m.label} ({m.network})</option>)}
            </select>
          </label>
          {data.methods.length === 0 && <p className="text-sm text-muted">No payment options are enabled right now.</p>}
          <button className="btn btn-primary" disabled={!currency || busy} onClick={create}>{busy && <Loader2 size={16} className="animate-spin" />} Create payment</button>
        </div>
      )}

      {!done && p && !needsNew && (
        <>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-muted">Payment ID</dt><dd className="num break-all font-semibold">{p.provider_payment_id}</dd></div>
            <div><dt className="text-xs text-muted">Amount due</dt><dd className="flex flex-wrap items-center gap-3"><span className="num text-xl font-bold">{p.pay_amount} <span className="uppercase">{p.pay_currency}</span></span><CopyButton value={String(p.pay_amount)} label="Copy amount" what="Amount copied" /></dd></div>
            <div><dt className="text-xs text-muted">Network</dt><dd className="font-semibold">{p.pay_network ?? p.pay_currency.toUpperCase()}</dd></div>
            <div><dt className="text-xs text-muted">Deposit address</dt><dd className="num break-all font-semibold">{p.pay_address}</dd></div>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value={p.pay_address} label="Copy address" />
            {remaining !== null && span?.id === p.id && <span className="ml-auto inline-flex items-center gap-2 text-sm text-soft"><CountdownRing remaining={remaining} span={span.secs} /> left</span>}
          </div>
          {qr && <img src={qr} alt="Deposit address QR code" width={220} height={220} className="rounded-xl bg-white p-2" />}
          <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite">{status === "waiting" || status === "created" ? <Loader2 size={15} className="animate-spin text-brand" /> : <RefreshCw size={15} />} {STATUS_TEXT[status ?? "created"]}</p>
          <ul className="space-y-1 text-xs text-muted">
            <li>Send exactly the amount above, in this currency, on this network. Other networks can lose funds.</li>
            <li>Sending a transaction does not complete the order. We wait for network and provider confirmation.</li>
            <li>Keep this page open or return later; status updates automatically.</li>
          </ul>
        </>
      )}
    </section>
  );
}
