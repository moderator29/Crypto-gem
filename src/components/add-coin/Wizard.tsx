"use client";

import { fireConfetti } from "@/components/fx/confetti";
import { Meter, Stepper } from "@/components/ui/Kit";
import { SummaryPanel } from "./SummaryPanel";
import { TokenFinder } from "./TokenFinder";
import { classifyAddress } from "@/lib/market-data/identifiers";
import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, Globe, Loader2, RefreshCw, Rocket, ScanSearch, Upload, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accessToken } from "@/lib/auth/client";
import { LISTING_PACKAGES } from "@/lib/ads/catalog";
import type { DetectedToken, Sourced } from "@/lib/detect/types";
import { getNetwork, NETWORKS } from "@/lib/market-data/networks";
import { priceUsd, usdCompact } from "@/lib/utils/format";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { LOGO_MAX_BYTES } from "@/lib/logo";
import { useDetect } from "./useDetect";

type Mode = "express" | "standard";
type Step = "mode" | "identify" | "review" | "package" | "summary";
const STEPS: Array<{ id: Step; label: string }> = [
  { id: "identify", label: "Identify" },
  { id: "review", label: "Details" },
  { id: "package", label: "Package" },
  { id: "summary", label: "Review" },
];

interface Form {
  name: string; symbol: string; description: string; descriptionZh: string; website: string; twitter: string; telegram: string;
  discord: string; medium: string; coingecko: string; coinmarketcap: string; zhTelegram: string; btok: string; weibo: string; email: string; logoUrl: string;
}
const EMPTY: Form = { name: "", symbol: "", description: "", descriptionZh: "", website: "", twitter: "", telegram: "", discord: "", medium: "", coingecko: "", coinmarketcap: "", zhTelegram: "", btok: "", weibo: "", email: "", logoUrl: "" };

type LinkKey = "website" | "twitter" | "telegram" | "discord" | "medium" | "coingecko" | "coinmarketcap" | "zhTelegram" | "btok" | "weibo";
const LINKS: Array<[LinkKey, string]> = [
  ["website", "Website"], ["twitter", "X / Twitter"], ["telegram", "Telegram"], ["zhTelegram", "Chinese Telegram"], ["discord", "Discord"], ["medium", "Medium"],
  ["btok", "BTOK"], ["weibo", "Weibo"], ["coingecko", "CoinGecko URL"], ["coinmarketcap", "CoinMarketCap URL"],
];

const SOURCE_LABEL: Record<string, string> = { geckoterminal: "GeckoTerminal", coingecko: "CoinGecko", coinmarketcap: "CoinMarketCap", rpc: "On-chain", user: "You" };
const src = (s: Sourced<unknown> | null) => (s ? SOURCE_LABEL[s.source] ?? s.source : null);

function prefill(t: DetectedToken): Form {
  const v = <T,>(s: Sourced<T> | null) => (s ? String(s.value) : "");
  return { ...EMPTY, name: v(t.name), symbol: v(t.symbol), description: v(t.description), website: v(t.website), twitter: v(t.twitter), telegram: v(t.telegram), discord: v(t.discord), coingecko: v(t.coingeckoUrl), coinmarketcap: v(t.coinmarketcapUrl), logoUrl: v(t.logoUrl) };
}

const urlOk = (s: string) => {
  if (!s) return true;
  if (s.length > 300) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

function StepLabel({ n }: { n: number }) {
  return <p className="num mb-1 text-[11px] font-bold uppercase tracking-widest text-muted">Step {String(n).padStart(2, "0")}</p>;
}

export function Wizard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState<Step>("mode");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());
  const [pkg, setPkg] = useState<string>("pro");
  const [terms, setTerms] = useState(false);
  const [submit, setSubmit] = useState<{ state: "idle" | "busy" | "done" | "setup" | "error"; message?: string }>({ state: "idle" });
  const router = useRouter();
  const [methods, setMethods] = useState<Array<{ id: string; label: string; provider_currency: string; network: string }>>([]);
  const [payCurrency, setPayCurrency] = useState("");
  const [needSignin, setNeedSignin] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { state, retry } = useDetect(step === "identify" ? address : "", network);

  useEffect(() => {
    if (step !== "summary") return;
    fetch("/api/payment-methods").then((r) => r.json()).then((j: { methods?: typeof methods }) => setMethods(j.methods ?? []), () => setMethods([]));
  }, [step]);

  const token = state.token;
  const chosenPkg = LISTING_PACKAGES.find((p) => p.id === pkg)!;
  const net = getNetwork(token?.networkId ?? network ?? "");

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) e.name = "Project name is required";
    if (!form.symbol.trim()) e.symbol = "Ticker is required";
    if (!form.description.trim() || form.description.trim().length < 30) e.description = "Describe the project in at least 30 characters";
    for (const [k] of LINKS) if (!urlOk(form[k])) e[k] = "Enter a valid http(s) URL";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "A valid contact email is required";
    return e;
  }, [form]);

  const detectedBy = (k: keyof Form): Sourced<unknown> | null =>
    token ? (({ name: token.name, symbol: token.symbol, website: token.website, twitter: token.twitter, telegram: token.telegram, discord: token.discord, coingecko: token.coingeckoUrl, coinmarketcap: token.coinmarketcapUrl } as Record<string, Sourced<unknown> | null>)[k] ?? null) : null;
  const badge = (k: keyof Form) => {
    const d = detectedBy(k);
    if (touched.has(k)) return <span className="text-[11px] font-medium text-muted">Edited by you</span>;
    return d ? <span className="text-[11px] font-medium text-up">Detected via {src(d)}</span> : null;
  };

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };

  const useDetected = () => {
    if (!token) return;
    const pre = prefill(token);
    setForm((f) => {
      const next = { ...pre };
      for (const k of touched) next[k] = f[k]; // never overwrite what the owner already typed
      return next;
    });
    setStep("review");
  };

  async function uploadLogo(file: File) {
    setLogoError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setLogoError("Use a JPG, PNG or WebP image");
    if (file.size > LOGO_MAX_BYTES) return setLogoError("Image must be 1 MB or smaller");
    setLogoBusy(true);
    try {
      const jwt = await accessToken();
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads/logo", { method: "POST", headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}, body });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401) return setLogoError("Sign in to upload a logo.");
      if (!res.ok || !j.url) return setLogoError(j.error ?? "Upload failed");
      set("logoUrl", j.url);
    } catch {
      setLogoError("Network error. Try the upload again.");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const goBack = () => setStep(({ identify: "mode", review: "identify", package: "review", summary: "package", mode: "mode" } as Record<Step, Step>)[step]);

  async function placeOrder() {
    setSubmit({ state: "busy" });
    try {
      const jwt = await accessToken();
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify({ mode, network: token?.networkId ?? network, address: token?.address ?? (address.trim() || null), package: pkg, payCurrency, form }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 503) return setSubmit({ state: "setup", message: j.error });
      if (res.status === 401) {
        setNeedSignin(true);
        return setSubmit({ state: "idle" });
      }
      if (!res.ok) return setSubmit({ state: "error", message: j.error ?? "Submission failed" });
      setSubmit({ state: "done" });
      fireConfetti();
      setTimeout(() => router.push(`/pay/${j.orderId}`), 1100);
    } catch {
      setSubmit({ state: "error", message: "Network error. Your details are still here, try again." });
    }
  }

  if (step === "mode") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {([
          ["express", "Express Listing", "Paste your contract. We detect the chain and pre-fill everything we can find. Faster review and visibility packages.", Zap],
          ["standard", "Standard Listing", "Submit your project through the normal review process. Best when the token has no pool yet or sits on an unsupported chain.", ScanSearch],
        ] as const).map(([id, title, text, Icon]) => (
          <button key={id} type="button" onClick={() => { setMode(id); setStep(id === "express" ? "identify" : "review"); }} className="card hover-lift flex flex-col items-start gap-3 p-6 text-left">
            <span className="grid h-11 w-11 place-items-center rounded-2xl icon-tile"><Icon size={22} /></span>
            <span className="flex items-center gap-2 font-display text-xl font-bold">{title}{id === "express" && <span className="badge badge-warn">Fastest</span>}</span>
            <span className="text-sm text-soft">{text}</span>
          </button>
        ))}
      </div>
    );
  }

  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="btn btn-icon" aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1"><Stepper steps={STEPS.map((x) => x.label)} current={idx} /></div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
      {step === "identify" && (
        <section className="card step-swap space-y-4 p-5 md:p-7" aria-label="Identify your token">
          <div>
            <StepLabel n={idx + 1} />
            <h2 className="font-display text-2xl font-bold">Paste your contract address or search by name</h2>
            <p className="mt-1 text-sm text-soft">We detect the chain and pre-fill the token details from several data sources, so one provider being down never blocks you.</p>
          </div>
          <input className="input num" value={address} onChange={(e) => { setAddress(e.target.value); setNetwork(null); }} onPaste={() => setNetwork(null)} placeholder="Contract address, mint, or token name" spellCheck={false} autoComplete="off" autoCapitalize="off" aria-label="Contract address" inputMode="text" />
          {classifyAddress(address.trim()) === "unknown" && address.trim().length >= 2 && <TokenFinder query={address} onPick={(a, n) => { setAddress(a); setNetwork(n); }} />}
          <div className="scroll-x" aria-label="Supported chains">
            {NETWORKS.filter((n) => n.contractLookup).slice(0, 14).map((n) => <span key={n.id} className="badge shrink-0">{n.name}</span>)}
          </div>

          {state.phase === "detecting" && (
            <ul className="space-y-2" aria-live="polite" aria-label="Detection progress">
              {state.stages.length === 0 && <li className="flex items-center gap-2 text-sm text-soft"><Loader2 size={15} className="animate-spin" /> Detecting token and blockchain…</li>}
              {state.stages.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm text-soft">
                  {s.state === "running" ? <Loader2 size={15} className="animate-spin text-brand" /> : s.state === "done" ? <CheckCircle2 size={15} className="text-up" /> : s.state === "skipped" ? <span className="h-[15px] w-[15px] text-center text-muted">–</span> : <AlertTriangle size={15} className="text-warm" />}
                  {s.label}{s.state === "skipped" ? " (no RPC configured)" : ""}
                </li>
              ))}
            </ul>
          )}

          {state.phase === "done" && state.status === "multiple" && state.matches && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{state.message}</p>
              {state.matches.map((m) => (
                <button key={m.networkId} type="button" onClick={() => setNetwork(m.networkId)} className="card-flat hover-lift flex w-full items-center gap-3 p-3 text-left">
                  <TokenLogo src={m.token.imageUrl} symbol={m.token.symbol} size={36} />
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{m.token.name} <span className="text-muted">{m.token.symbol}</span></span><span className="block text-xs text-muted">{m.networkName}</span></span>
                  <span className="num text-right text-xs text-muted">{usdCompact(m.topPool?.liquidityUsd)} liq</span>
                </button>
              ))}
            </div>
          )}

          {state.phase === "done" && (state.status === "found" || state.status === "partial") && token && (
            <div className="card-flat space-y-3 p-4">
              <div className="flex items-center gap-3">
                <TokenLogo src={token.logoUrl?.value} symbol={token.symbol?.value ?? "?"} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-lg font-bold">{token.name?.value ?? "Unnamed"} <span className="text-muted">{token.symbol?.value}</span></div>
                  <div className="text-xs text-muted">{token.networkName} · <span className="num break-all">{token.address}</span></div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${state.status === "found" ? "text-up" : "text-warm"}`}><BadgeCheck size={15} />{state.status === "found" ? "Detected" : "Partly detected"}</span>
              </div>
              <button type="button" className="btn" onClick={() => { setAddress(""); setNetwork(null); }}><RefreshCw size={15} /> Change</button>
              <dl className="num grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                {([["Price", priceUsd(token.priceUsd?.value)], ["Liquidity", usdCompact(token.liquidityUsd?.value)], ["24h volume", usdCompact(token.volume24hUsd?.value)], ["Pools", String(token.pools.length)]] as const).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
              <div className="space-y-1.5" aria-label="Detection coverage">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-soft">Detection coverage</span><span className="num font-semibold">{Math.round(((13 - token.missing.length) / 13) * 100)}%</span></div>
                <Meter value={((13 - token.missing.length) / 13) * 100} tone={token.missing.length <= 3 ? "up" : token.missing.length <= 7 ? "warm" : "down"} label="Detection coverage" />
                <p className="text-[11px] text-muted">{token.providerNotes.filter((n) => n.status === "ok").length} of {token.providerNotes.length} data sources answered.</p>
              </div>
              {token.missing.length > 0 && <p className="text-xs text-warm">Not found by any provider: {token.missing.join(", ")}. You will complete these next.</p>}
              <p className="text-[11px] text-muted">Sources: {token.providerNotes.map((n) => `${SOURCE_LABEL[n.provider] ?? n.provider} ${n.status === "ok" ? "ok" : n.status === "not_configured" ? "not configured" : n.status === "no_match" ? "no match" : "unavailable"}`).join(" · ")}</p>
              <button type="button" className="btn btn-primary w-full md:w-auto" onClick={useDetected}>Use these details</button>
            </div>
          )}

          {state.phase === "done" && ["not_found", "invalid", "unsupported", "unavailable"].includes(state.status ?? "") && (
            <div className="card-flat space-y-3 p-4" role="alert">
              <p className="flex items-start gap-2 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-warm" />{state.message}</p>
              {state.status !== "invalid" && state.status !== "unsupported" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select className="input !min-h-11 !w-auto" value={network ?? ""} onChange={(e) => setNetwork(e.target.value || null)} aria-label="Select network manually">
                    <option value="">Auto-detect network</option>
                    {NETWORKS.filter((n) => n.contractLookup).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <button type="button" className="btn" onClick={retry}><RefreshCw size={15} /> Retry</button>
                </div>
              )}
              <button type="button" className="btn" onClick={() => setStep("review")}>Continue and enter details manually</button>
            </div>
          )}
        </section>
      )}

      {step === "review" && (
        <section className="card step-swap space-y-5 p-5 md:p-7" aria-label="Project details">
          <div><StepLabel n={idx + 1} /><h2 className="font-display text-2xl font-bold">Project details</h2></div>
          {token && (
            <div className="card-flat p-3 text-sm">
              <span className="font-semibold">On-chain facts</span> are shown from providers and cannot be edited: {token.networkName}, <span className="num break-all">{token.address}</span>
              {token.decimals ? `, ${token.decimals.value} decimals` : ""}{token.totalSupply ? `, supply ${Number(token.totalSupply.value).toLocaleString("en-US")}` : ""}.
            </div>
          )}
          {!token && mode === "standard" && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Network (optional)</span>
              <select className="input" value={network ?? ""} onChange={(e) => setNetwork(e.target.value || null)}>
                <option value="">Not on a supported chain yet</option>
                {NETWORKS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </label>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {([["name", "Project name", "text"], ["symbol", "Ticker", "text"], ["email", "Contact email", "email"]] as const).map(([k, label, type]) => (
              <label key={k} className="block">
                <span className="mb-1 flex items-center justify-between text-sm font-semibold">{label}
                  {badge(k)}
                </span>
                <input className="input" type={type} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[k])} />
                {errors[k] && touched.has(k) && <span className="mt-1 block text-xs text-down">{errors[k]}</span>}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-semibold">Logo</span>
            <div className="card-flat flex flex-col items-center gap-3 p-4 text-center sm:flex-row sm:text-left" style={{ borderStyle: "dashed" }}>
              <div className="relative">
                <TokenLogo src={form.logoUrl || null} symbol={form.symbol || "?"} size={72} />
                {form.logoUrl && (
                  <button type="button" onClick={() => set("logoUrl", "")} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--border-strong)]" aria-label="Remove logo"><X size={14} /></button>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-soft">{form.logoUrl ? (touched.has("logoUrl") ? "Uploaded by you" : `Detected via ${src(token?.logoUrl ?? null) ?? "provider"}`) : "No logo yet. Upload one or continue without."}</p>
                <p className="text-xs text-muted">JPG, PNG or WebP. Up to 1 MB, roughly square, at least 128px.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="logo-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }} />
              <label htmlFor="logo-file" className="btn cursor-pointer">{logoBusy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload</label>
            </div>
            {logoError && <p className="text-xs text-down" role="alert">{logoError}</p>}
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold">Links</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {LINKS.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 flex items-center justify-between text-sm font-semibold">{label}
                    {badge(k)}
                  </span>
                  <span className="relative block">
                    <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input className="input !pl-10" type="url" inputMode="url" value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[k])} placeholder="https://" maxLength={300} />
                  </span>
                  {errors[k] && form[k] && touched.has(k) && <span className="mt-1 block text-xs text-down">{errors[k]}</span>}
                </label>
              ))}
            </div>
          </div>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Description</span>
            <textarea className="input !min-h-28 py-3" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
            <span className="mt-1 flex items-center gap-2"><Meter className="flex-1" value={Math.min(100, (form.description.trim().length / 30) * 100)} tone={form.description.trim().length >= 30 ? "up" : "warm"} label="Description length" /><span className="num text-[11px] text-muted">{form.description.trim().length}/2000 · min 30</span></span>
            {touched.has("description") && errors.description && <span className="mt-1 block text-xs text-down">{errors.description}</span>}
          </label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Chinese description (optional)</span>
            <textarea className="input !min-h-20 py-3" value={form.descriptionZh} onChange={(e) => set("descriptionZh", e.target.value)} maxLength={2000} lang="zh" />
          </label>
          <p className="text-xs text-muted">Descriptions and links are submitted by you and are shown to visitors as owner-provided. They are not verified.</p>
          <button type="button" className="btn btn-primary w-full md:w-auto" disabled={Object.keys(errors).length > 0} onClick={() => setStep("package")}>Continue to packages</button>
          {Object.keys(errors).length > 0 && <p className="text-xs text-muted">Complete the required fields to continue.</p>}
        </section>
      )}

      {step === "package" && (
        <section className="step-swap space-y-4" aria-label="Choose a package">
          <div><StepLabel n={idx + 1} /><h2 className="font-display text-2xl font-bold">Choose your package</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            {LISTING_PACKAGES.map((p) => (
              <button key={p.id} type="button" onClick={() => setPkg(p.id)} aria-pressed={pkg === p.id} className={`card hover-lift flex flex-col gap-3 p-5 text-left ${pkg === p.id ? "!border-[var(--brand)]" : ""}`}>
                <span className="flex items-center justify-between"><span className="font-display text-lg font-bold">{p.name}</span>{pkg === p.id && <CheckCircle2 size={18} className="text-brand" />}</span>
                <span className="num font-display text-3xl font-bold">${p.priceUsd.toLocaleString("en-US")}</span>
                <ul className="space-y-1.5 text-sm text-soft">{p.perks.map((x) => <li key={x} className="flex gap-2"><span className="text-up">✓</span>{x}</li>)}</ul>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Paying for a package does not verify a project or guarantee approval, and never changes organic rankings. Prices are set by Crypto Gems and can change.</p>
          <button type="button" className="btn btn-primary" onClick={() => setStep("summary")}>Review order</button>
        </section>
      )}

      {step === "summary" && (
        <section className="card step-swap space-y-4 p-5 md:p-7" aria-label="Order summary">
          <div><StepLabel n={idx + 1} /><h2 className="font-display text-2xl font-bold">Order summary</h2></div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            {([["Project", form.name], ["Ticker", form.symbol], ["Network", net?.name ?? "Not specified"], ["Contract", token?.address ?? (address.trim() || "Not provided")], ["Package", `${chosenPkg.name}`], ["Contact", form.email]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="num break-all font-semibold">{v}</dd></div>
            ))}
          </dl>
          {LINKS.some(([k]) => form[k]) && (
            <dl className="grid gap-3 text-sm md:grid-cols-2" aria-label="Links">
              {LINKS.filter(([k]) => form[k]).map(([k, label]) => (
                <div key={k}><dt className="text-xs text-muted">{label}</dt><dd className="break-all font-semibold">{form[k]}</dd></div>
              ))}
            </dl>
          )}
          <ul className="space-y-1 text-sm text-soft">{chosenPkg.perks.map((x) => <li key={x}>✓ {x}</li>)}</ul>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I confirm the information is accurate and accept the listing terms.</label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Pay with</span>
            <select className="input" value={payCurrency} onChange={(e) => setPayCurrency(e.target.value)}>
              <option value="">{methods.length ? "Select currency and network" : "No payment options available yet"}</option>
              {methods.map((m) => <option key={m.id} value={m.provider_currency}>{m.label} ({m.network})</option>)}
            </select>
          </label>
          {needSignin && <p className="card-flat p-3 text-sm" role="status">Sign in first so the order is tied to your account. <Link href="/login?next=/add-coin" className="font-semibold text-brand">Sign in</Link>. Your details here are kept only until you leave this page.</p>}
          <button type="button" className="btn btn-primary w-full md:w-auto" disabled={!terms || !payCurrency || submit.state === "busy" || submit.state === "done"} onClick={placeOrder}>
            {submit.state === "busy" ? <Loader2 size={16} className="animate-spin" /> : submit.state === "done" ? <CheckCircle2 size={16} /> : <Rocket size={16} />} {submit.state === "done" ? "Order created" : "Continue to Secure Payment"} · ${chosenPkg.priceUsd.toLocaleString("en-US")}
          </button>
          {submit.state === "done" && <p className="text-sm text-up" role="status">Order created. Taking you to payment.</p>}
          {submit.state === "setup" && <p className="card-flat p-3 text-sm text-warm" role="status">{submit.message}</p>}
          {submit.state === "error" && <p className="text-sm text-down" role="alert">{submit.message}</p>}
        </section>
      )}
      </div>
      <SummaryPanel
        logo={form.logoUrl || null}
        symbol={form.symbol}
        name={form.name}
        fields={[
          { label: "Name", value: form.name.trim() || null },
          { label: "Ticker", value: form.symbol.trim() || null },
          { label: "Network", value: net?.name ?? null },
          { label: "Contract", value: token?.address ? `${token.address.slice(0, 6)}…${token.address.slice(-4)}` : null },
          { label: "Logo", value: form.logoUrl ? "Added" : null },
          { label: "Website", value: form.website.trim() || null },
          { label: "X / Twitter", value: form.twitter.trim() || null },
          { label: "Telegram", value: form.telegram.trim() || null },
        ]}
      />
      </div>
    </div>
  );
}
