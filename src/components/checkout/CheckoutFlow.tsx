"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fireConfetti } from "@/components/fx/confetti";
import { playSound } from "@/components/fx/sound";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stepper } from "@/components/ui/Kit";
import { describeItem, parseItem, type CheckoutItem } from "@/lib/checkout/items";
import type { PublicMethod, QuoteResponse, ReceiptData, VerifyResponse } from "@/lib/checkout/types";
import { saveLocalReceipt } from "@/lib/local/receipts";
import { pushLocalNotification } from "@/lib/local/notifications";
import { EXPLORER_TX } from "@/lib/payments/direct/methods";
import { checkoutFetch } from "./api";
import { ConfirmStep } from "./ConfirmStep";
import { DoneStep } from "./DoneStep";
import { formatAmount, receiptHref, remainingSeconds } from "./helpers";
import { MethodPicker } from "./MethodPicker";
import { OrderCard } from "./OrderCard";
import { Callout } from "./parts";
import { SendStep } from "./SendStep";

type Step = "method" | "send" | "confirm" | "done";
const STEPS: Step[] = ["method", "send", "confirm", "done"];
const STEP_LABELS = ["Method", "Send", "Confirm", "Done"];
const STORAGE_KEY = "cg:checkout";
const POLL_MS = 6000;
const RESUME_MAX_MS = 7 * 24 * 60 * 60_000;

type Receipt = ReceiptData & { token: string };

interface Saved {
  v: 1;
  itemKey: string;
  item: CheckoutItem;
  step: Step;
  methodId: string | null;
  quote: QuoteResponse | null;
  submitted: string | null;
  receipt: Receipt | null;
  celebrated: boolean;
  savedAt: number;
}

const keyOf = (item: CheckoutItem): string => JSON.stringify(item);

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    if (s?.v !== 1 || typeof s.savedAt !== "number" || Date.now() - s.savedAt > RESUME_MAX_MS) return null;
    const item = parseItem(s.item);
    if (!item.ok || !s.step || !STEPS.includes(s.step)) return null;
    return { ...(s as Saved), item: item.item, itemKey: keyOf(item.item) };
  } catch {
    return null;
  }
}

function store(s: Saved | null): void {
  try {
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage blocked or full: the checkout still works for this visit, it just will not resume after a reload. */
    return;
  }
}

/**
 * The whole checkout: method, send, confirm, done. State lives in this component and in localStorage so a
 * reload resumes the open checkout. The server signs every quote and receipt; nothing here sets a price.
 */
const noopSubscribe = () => () => undefined;

/** Picks the saved checkout to resume: the one for the same item, or the last one when the URL names no item. */
function resumeFor(initialItem: CheckoutItem | null): Saved | null {
  const saved = loadSaved();
  const target = initialItem ?? saved?.item ?? null;
  return saved && target && saved.itemKey === keyOf(target) ? saved : null;
}

/** Renders the flow only after hydration, so the saved checkout can be read from localStorage in state initialisers. */
export function CheckoutFlow({ initialItem, itemError }: { initialItem: CheckoutItem | null; itemError: string | null }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) {
    return <div className="skeleton h-[28rem] rounded-[var(--r-xl)]" aria-busy="true" aria-label="Loading checkout" />;
  }
  return <Flow initialItem={initialItem} itemError={itemError} />;
}

function Flow({ initialItem, itemError }: { initialItem: CheckoutItem | null; itemError: string | null }) {
  const reduce = useReducedMotion();
  const [resume] = useState(() => resumeFor(initialItem));
  const [item] = useState<CheckoutItem | null>(resume?.item ?? initialItem);
  const [step, setStep] = useState<Step>(resume?.step ?? "method");
  const [methodId, setMethodId] = useState<string | null>(resume?.methodId ?? null);
  const [quote, setQuote] = useState<QuoteResponse | null>(resume?.quote ?? null);
  const [submitted, setSubmitted] = useState<string | null>(resume?.submitted ?? null);
  const [receipt, setReceipt] = useState<Receipt | null>(resume?.receipt ?? null);
  const [celebrated, setCelebrated] = useState(resume?.celebrated ?? false);

  const [methods, setMethods] = useState<PublicMethod[] | null>(null);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [status, setStatus] = useState<VerifyResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    store({ v: 1, itemKey: keyOf(item), item, step, methodId, quote, submitted, receipt, celebrated, savedAt: Date.now() });
  }, [item, step, methodId, quote, submitted, receipt, celebrated]);

  useEffect(() => {
    let live = true;
    checkoutFetch<{ methods: PublicMethod[] }>("/api/checkout/methods").then((r) => {
      if (!live) return;
      if (r.ok) setMethods(r.data.methods);
      else setMethodsError(r.error);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "send") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const go = useCallback((s: Step) => {
    setStep(s);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const requestQuote = useCallback(
    async (id: string) => {
      if (!item) return;
      setQuoting(true);
      setQuoteError(null);
      const r = await checkoutFetch<QuoteResponse>("/api/checkout/quote", { method: "POST", body: { methodId: id, item } });
      setQuoting(false);
      if (!r.ok) {
        setQuoteError(r.error);
        playSound("error");
        return;
      }
      setMethodId(id);
      setQuote(r.data);
      setSubmitted(null);
      setStatus(null);
      setVerifyError(null);
      setNow(Date.now());
      playSound("tap");
      go("send");
    },
    [item, go],
  );

  /* Celebrate once per receipt, and keep a copy of it on this device. */
  const celebratedRef = useRef(celebrated);
  const celebrate = useCallback((r: Receipt) => {
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    setCelebrated(true);
    fireConfetti();
    const href = receiptHref(r.token);
    saveLocalReceipt({ number: r.number, href, title: r.title, amount: r.received, asset: r.asset, at: r.paidAt });
    pushLocalNotification({ kind: "payment", title: "Payment verified", body: `${r.title}. Receipt ${r.number}.`, href });
  }, []);

  const verify = useCallback(
    async (hash: string) => {
      if (!quote || inFlight.current) return;
      inFlight.current = true;
      setChecking(true);
      const r = await checkoutFetch<VerifyResponse>("/api/checkout/verify", { method: "POST", body: { token: quote.token, txHash: hash } });
      inFlight.current = false;
      setChecking(false);
      if (!r.ok) {
        if (r.status === 400) {
          setVerifyError(null);
          setStatus({ status: "rejected", confirmations: 0, required: quote.minConfirmations, message: r.error });
        } else {
          setVerifyError(r.status === 0 || r.status === 429 || r.status >= 500 ? `${r.error} We will keep trying.` : r.error);
        }
        return;
      }
      setVerifyError(null);
      setStatus(r.data);
      if (r.data.status === "paid" && r.data.receipt) {
        celebrate(r.data.receipt);
        setReceipt(r.data.receipt);
        go("done");
      } else if (r.data.status === "rejected") {
        playSound("error");
      }
    },
    [quote, go, celebrate],
  );

  /* Poll every 6 seconds while the page is visible, and right away when it becomes visible again. */
  useEffect(() => {
    if (step !== "confirm" || !submitted) return;
    if (status?.status === "rejected" || status?.status === "paid") return;
    const tick = () => {
      if (document.visibilityState === "visible") void verify(submitted);
    };
    const first = status === null ? setTimeout(tick, 400) : undefined;
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [step, submitted, status, verify]);

  const desc = useMemo(() => {
    if (!item) return null;
    try {
      return describeItem(item);
    } catch {
      return null;
    }
  }, [item]);

  if (!item || !desc) {
    return (
      <EmptyState
        icon={ShoppingBag}
        tone={itemError ? "error" : "neutral"}
        title={itemError ? "This checkout link is not complete" : "Nothing to check out yet"}
        description={itemError ?? "Pick a boost pack, a listing package or a banner placement first. You pay in crypto from your own wallet."}
        action={
          <div className="co-actions co-actions-center">
            <Link className="btn btn-primary" href="/boost">Boost a token</Link>
            <Link className="btn" href="/add-coin">List a token</Link>
            <Link className="btn" href="/promotion">Book a banner</Link>
          </div>
        }
      />
    );
  }

  const method = methods?.find((m) => m.id === (quote?.methodId ?? methodId)) ?? null;
  const span = (quote?.rate !== null && quote?.rate !== undefined ? 20 : 60) * 60;
  const remaining = quote ? remainingSeconds(quote.expiresAt, now) : 0;
  const explorerTx = quote && submitted ? `${EXPLORER_TX[quote.networkId] ?? ""}${submitted}` : null;
  const index = STEPS.indexOf(step);
  const heading = { method: "How would you like to pay?", send: "Send the payment", confirm: "Confirm your payment", done: "All done" }[step];

  return (
    <div className="co-layout" ref={topRef}>
      <aside className="co-side">
        <OrderCard kind={item.kind} title={desc.title} lines={desc.lines} priceUsd={desc.priceUsd} amountLine={quote && step !== "method" ? `Pay ${formatAmount(quote.amount)} ${quote.asset} on ${quote.networkLabel}` : null} />
      </aside>

      <section className="co-glass co-main" aria-labelledby="co-heading">
        <Stepper steps={STEP_LABELS} current={step === "done" ? STEPS.length : index} />
        <h1 id="co-heading" className="co-heading">
          {heading}
        </h1>

        <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="min-w-0">
              {step === "method" &&
                (methods ? (
                  <div className="co-stack">
                    <MethodPicker methods={methods} initialMethodId={methodId} busy={quoting} onPick={requestQuote} />
                    {quoteError && <Callout tone="error" title={quoteError} />}
                  </div>
                ) : methodsError ? (
                  <Callout tone="error" title="Payment methods could not be loaded">
                    {methodsError}
                  </Callout>
                ) : (
                  <div className="skeleton h-64 rounded-[var(--r-lg)]" aria-busy="true" aria-label="Loading payment methods" />
                ))}

              {step === "send" && quote && (
                <SendStep
                  quote={quote}
                  tokenAddress={method?.token ?? null}
                  token={quote.token}
                  remaining={remaining}
                  span={span}
                  refreshing={quoting}
                  refreshError={quoteError}
                  onRefresh={() => void requestQuote(quote.methodId)}
                  onSent={() => go("confirm")}
                  onChangeMethod={() => go("method")}
                />
              )}

              {step === "confirm" && quote && (
                <ConfirmStep
                  quote={quote}
                  explorerTx={explorerTx}
                  submitted={submitted}
                  status={status}
                  checking={checking}
                  error={verifyError}
                  onSubmit={(h) => {
                    setSubmitted(h);
                    setStatus(null);
                    setVerifyError(null);
                    void verify(h);
                  }}
                  onBack={() => go("send")}
                />
              )}

              {step === "done" && receipt && (
                <DoneStep
                  receipt={receipt}
                  token={receipt.token}
                  onNew={() => {
                    store(null);
                    setQuote(null);
                    setSubmitted(null);
                    setReceipt(null);
                    setStatus(null);
                    setCelebrated(false);
                    celebratedRef.current = false;
                    setMethodId(null);
                    go("method");
                  }}
                />
              )}

              {(step === "send" || step === "confirm") && !quote && (
                <Callout tone="info" title="This payment needs a fresh quote">
                  <button type="button" className="btn btn-primary mt-2" onClick={() => go("method")}>
                    Choose a payment method
                  </button>
                </Callout>
              )}
            </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
