"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fireConfetti } from "@/components/fx/confetti";
import { playSound } from "@/components/fx/sound";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stepper } from "@/components/ui/Kit";
import { ConfirmStep } from "./ConfirmStep";
import { DoneState } from "./DoneState";
import { MethodPicker } from "./MethodPicker";
import { OrderSummary } from "./OrderSummary";
import { payFetch } from "./payApi";
import { remainingSeconds } from "./payHelpers";
import { TrustLine } from "./payParts";
import { SendStep } from "./SendStep";
import type { OrderPayload, PayIntent, PayMethod, PayPhase, PayStatus, Receipt, SubmitResult } from "./types";

type Load = "loading" | "ok" | "signin" | "error" | "notfound";
interface Stored { intent: PayIntent; submittedHash: string | null }

const STEPS = ["Choose", "Send", "Confirm", "Done"];
const FINAL = ["finished", "failed", "expired"];
const storeKey = (orderId: string) => `cg-pay:${orderId}`;

function readStored(orderId: string): Stored | null {
  try {
    const raw = localStorage.getItem(storeKey(orderId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    if (!v.intent || typeof v.intent.paymentId !== "string" || typeof v.intent.address !== "string" || typeof v.intent.amount !== "string") return null;
    return { intent: v.intent, submittedHash: typeof v.submittedHash === "string" ? v.submittedHash : null };
  } catch {
    return null;
  }
}

function writeStored(orderId: string, value: Stored | null): void {
  try {
    if (value) localStorage.setItem(storeKey(orderId), JSON.stringify(value));
    else localStorage.removeItem(storeKey(orderId));
  } catch {
    return;
  }
}

function toStatus(intent: PayIntent, r: SubmitResult): PayStatus {
  return { paymentId: intent.paymentId, orderId: r.orderId, status: r.status, message: null, txHash: r.txHash, confirmations: r.confirmations, required: r.required, paidAmount: r.paidAmount, receiptNo: r.receiptNo };
}

/**
 * Whole payment flow for one order: choose an asset, send, confirm with a hash, and the success state.
 * Quote, status and receipt always come from the server. The browser only remembers the open quote so a reload resumes it.
 */
export function PaymentPanel({ orderId }: { orderId: string }) {
  const reduce = useReducedMotion();
  const [load, setLoad] = useState<Load>("loading");
  const [data, setData] = useState<OrderPayload | null>(null);
  const [methods, setMethods] = useState<PayMethod[] | null>(null);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PayPhase>("choose");
  const [intent, setIntent] = useState<PayIntent | null>(null);
  const [status, setStatus] = useState<PayStatus | null>(null);
  const [span, setSpan] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const submitLock = useRef(false);
  const confettiDone = useRef(false);
  const intentId = useRef<string | null>(null);

  const finish = useCallback(
    async (live: boolean) => {
      setPhase("done");
      writeStored(orderId, null);
      if (live && !confettiDone.current) {
        confettiDone.current = true;
        fireConfetti({ sound: false });
        playSound("success");
      }
      const res = await payFetch<Receipt>(`/api/pay/receipt?orderId=${encodeURIComponent(orderId)}`);
      if (res.ok) setReceipt(res.data);
    },
    [orderId],
  );

  const applyStatus = useCallback(
    (s: PayStatus) => {
      if (intentId.current && s.paymentId !== intentId.current) return;
      setStatus(s);
      if (s.status === "finished") void finish(true);
      else if (s.status === "confirming") setPhase((p) => (p === "send" ? "confirm" : p));
    },
    [finish],
  );

  const loadMethods = useCallback(async () => {
    setMethodsError(null);
    const res = await payFetch<{ methods: PayMethod[] }>(`/api/pay/methods?orderId=${encodeURIComponent(orderId)}`);
    if (res.ok) setMethods(res.data.methods);
    else setMethodsError(res.error);
  }, [orderId]);

  useEffect(() => {
    let live = true;
    async function init() {
      const res = await payFetch<OrderPayload>(`/api/payments/${orderId}`);
      if (!live) return;
      if (!res.ok) return setLoad(res.status === 401 ? "signin" : res.status === 404 ? "notfound" : "error");
      setData(res.data);
      setLoad("ok");
      if (res.data.order.status === "paid" || res.data.payment?.status === "finished") {
        confettiDone.current = true;
        void finish(false);
        return;
      }
      void loadMethods();
      const saved = readStored(orderId);
      if (!saved) return;
      const st = await payFetch<PayStatus>(`/api/pay/status?paymentId=${encodeURIComponent(saved.intent.paymentId)}`);
      if (!live) return;
      if (!st.ok || st.data.status === "failed" || st.data.status === "expired") {
        writeStored(orderId, null);
        return;
      }
      intentId.current = saved.intent.paymentId;
      setIntent(saved.intent);
      setSpan(Math.max(remainingSeconds(saved.intent.expiresAt, Date.now()), 1));
      setSubmittedHash(saved.submittedHash);
      setStatus(st.data);
      if (st.data.status === "finished") {
        confettiDone.current = true;
        void finish(false);
      } else setPhase(saved.submittedHash || st.data.status === "confirming" ? "confirm" : "send");
    }
    void init();
    return () => {
      live = false;
    };
  }, [orderId, finish, loadMethods]);

  const isFinal = status ? FINAL.includes(status.status) : false;
  const polling = Boolean(intent) && (phase === "send" || phase === "confirm") && !isFinal;

  useEffect(() => {
    if (!intent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [intent]);

  useEffect(() => {
    if (!polling || !intent) return;
    const pid = intent.paymentId;
    const run = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await payFetch<PayStatus>(`/api/pay/status?paymentId=${encodeURIComponent(pid)}`);
      if (res.ok) applyStatus(res.data);
    };
    const t = setInterval(run, 5000);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", run);
    };
  }, [polling, intent, applyStatus]);

  const startIntent = useCallback(
    async (methodId: string) => {
      const res = await payFetch<PayIntent>("/api/pay/intent", { orderId, methodId });
      if (!res.ok) return res.error;
      intentId.current = res.data.paymentId;
      setIntent(res.data);
      setSpan(Math.max(remainingSeconds(res.data.expiresAt, Date.now()), 1));
      setNow(Date.now());
      setStatus(null);
      setSubmittedHash(null);
      setRejection(null);
      setPhase("send");
      writeStored(orderId, { intent: res.data, submittedHash: null });
      return null;
    },
    [orderId],
  );

  async function pick(m: PayMethod) {
    if (pendingId) return;
    setPendingId(m.id);
    setPickError(null);
    const err = await startIntent(m.id);
    setPickError(err);
    setPendingId(null);
  }

  async function refreshQuote() {
    if (!intent || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    const err = await startIntent(intent.methodId);
    setRefreshError(err);
    setRefreshing(false);
  }

  async function submit(hash: string) {
    if (!intent || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setRejection(null);
    const res = await payFetch<SubmitResult>("/api/pay/submit", { paymentId: intent.paymentId, txHash: hash });
    if (!res.ok) {
      setRejection(res.error);
    } else if (!res.data.accepted) {
      setRejection(res.data.reason ?? "We could not match that hash to this payment.");
      setStatus(toStatus(intent, res.data));
    } else {
      const sent = res.data.txHash ?? hash;
      setSubmittedHash(sent);
      writeStored(orderId, { intent, submittedHash: sent });
      applyStatus(toStatus(intent, res.data));
    }
    setSubmitting(false);
    submitLock.current = false;
  }

  function changeMethod() {
    intentId.current = null;
    writeStored(orderId, null);
    setIntent(null);
    setStatus(null);
    setSubmittedHash(null);
    setRejection(null);
    setPickError(null);
    setPhase("choose");
  }

  const method = useMemo(() => methods?.find((m) => m.id === intent?.methodId) ?? null, [methods, intent]);
  const remaining = intent ? remainingSeconds(intent.expiresAt, now) : null;
  const expired = Boolean(intent) && phase !== "done" && (status?.status === "expired" || (remaining === 0 && !submittedHash && (!status || status.status === "waiting")));
  const stepIndex = phase === "choose" ? 0 : phase === "send" ? 1 : phase === "confirm" ? 2 : STEPS.length;

  if (load === "loading") {
    return (
      <div className="pay-layout" aria-busy="true" aria-label="Loading payment">
        <div className="pay-side"><div className="skeleton h-20 rounded-[var(--r-lg)] md:h-72" /></div>
        <div className="pay-main"><div className="skeleton h-[28rem] rounded-[var(--r-lg)]" /></div>
      </div>
    );
  }
  if (load === "signin") {
    return (
      <EmptyState
        icon={Lock}
        title="Sign in to pay for this order"
        description="Payments are tied to your account so only you can see them."
        action={<Link className="btn btn-primary" href={`/login?next=/pay/${orderId}`}>Sign in</Link>}
      />
    );
  }
  if (load === "notfound") return <EmptyState tone="error" title="Order not found" description="This order does not exist or belongs to another account." action={<Link className="btn" href="/dashboard">Go to dashboard</Link>} />;
  if (load === "error" || !data) return <EmptyState tone="error" title="This order could not be loaded" description="Check your connection and refresh the page." action={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Refresh</button>} />;

  const order = data.order;
  const paid = phase === "done";
  if (!paid && order.status !== "pending") {
    return <EmptyState title={`This order is ${order.status}`} description="It can no longer be paid. Start a new order from your dashboard." action={<Link className="btn" href="/dashboard">Go to dashboard</Link>} />;
  }

  const anim = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.22 } };

  return (
    <div className="pay-layout">
      <div className="pay-side">
        <OrderSummary order={order} remaining={intent && !paid ? remaining : null} paid={paid} />
      </div>
      <div className="pay-main">
        <section className="card pay-card" aria-label="Payment">
          {!paid && (
            <header className="space-y-4">
              <div>
                <p className="eyebrow">Secure checkout</p>
                <h1 className="font-display mt-2 text-2xl font-bold sm:text-3xl">{phase === "choose" ? "Choose how to pay" : phase === "send" ? "Send your payment" : "Confirm your payment"}</h1>
              </div>
              <Stepper steps={STEPS} current={stepIndex} />
              <p className="text-xs text-muted sm:hidden">Step {Math.min(stepIndex + 1, 4)} of 4: {STEPS[Math.min(stepIndex, 3)]}</p>
            </header>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={phase} {...anim} className="pay-phase">
              {phase === "choose" && (
                <>
                  <MethodPicker methods={methods} methodsError={methodsError} pendingId={pendingId} error={pickError} onPick={pick} onRetry={loadMethods} />
                  <TrustLine />
                </>
              )}
              {phase === "send" && intent && (
                <SendStep intent={intent} method={method} remaining={remaining ?? 0} span={span} expired={expired} refreshing={refreshing} refreshError={refreshError} onRefresh={refreshQuote} onSent={() => setPhase("confirm")} onChangeMethod={changeMethod} />
              )}
              {phase === "confirm" && intent && (
                <ConfirmStep intent={intent} status={status} submittedHash={submittedHash} submitting={submitting} rejection={rejection} expired={expired} refreshing={refreshing} onSubmit={submit} onRefresh={refreshQuote} onBack={() => setPhase("send")} onChangeMethod={changeMethod} />
              )}
              {phase === "done" && <DoneState orderId={orderId} kind={order.kind} receipt={receipt} receiptNo={status?.receiptNo ?? null} intent={intent} txHash={submittedHash ?? status?.txHash ?? data.payment?.tx_hash ?? null} priceUsd={Number(order.price_usd)} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
