"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, ImagePlus, Loader2, ScanLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CountUp } from "@/components/fx/CountUp";
import { AcceptedAssets } from "@/components/boost/AcceptedAssets";
import { ContactCard } from "@/components/ui/ContactCard";
import { Stepper } from "@/components/ui/Kit";
import { discount, PLACEMENTS, type Placement, type PlacementId } from "@/lib/ads/catalog";
import { inspectImage } from "@/lib/ads/image";
import { accessToken } from "@/lib/auth/client";
import { evaluateCreative, type CreativeReport } from "@/lib/export/creativeCheck";
import { CreativeChecklist } from "./CreativeChecklist";
import { DeviceFrames } from "./DeviceFrames";
import { PlacementPreview } from "./PlacementPreview";

interface Avail { configured?: boolean; available?: boolean; reason?: string | null; price?: number | null }
interface Pick { file: File; url: string }

const today = () => new Date().toISOString().slice(0, 10);
const STRIP_DAYS = 10;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
type Cell = "free" | "booked" | "unknown";

export function BookingWizard({ initial }: { initial: PlacementId }) {
  const router = useRouter();
  const [placement, setPlacement] = useState<Placement>(PLACEMENTS.find((p) => p.id === initial) ?? PLACEMENTS[0]!);
  const [days, setDays] = useState<number>(1);
  const [start, setStart] = useState(today());
  const [destination, setDestination] = useState("https://");
  const [headline, setHeadline] = useState("");
  const [desktop, setDesktop] = useState<Pick | null>(null);
  const [mobile, setMobile] = useState<Pick | null>(null);
  const [checks, setChecks] = useState<{ desktop?: { name: string; report: CreativeReport }; mobile?: { name: string; report: CreativeReport } }>({});
  const [safe, setSafe] = useState(false);
  const [strip, setStrip] = useState<Cell[] | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [avail, setAvail] = useState<Avail | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "signin"; text: string } | null>(null);

  const durations = useMemo(() => ([1, 3, 7, 14, 30] as const).filter((d) => placement.prices[d] !== undefined), [placement]);
  const effDays = durations.includes(days as 1) ? days : durations[0] ?? 1;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/ads/availability?placement=${placement.id}&days=${effDays}&start=${start}`, { signal: ctrl.signal }).then((r) => r.json()).then(setAvail, () => undefined);
    return () => ctrl.abort();
  }, [placement.id, effDays, start]);

  const stripOn = avail?.configured === true;
  useEffect(() => {
    if (!stripOn) return;
    const ctrl = new AbortController();
    const base = today();
    void Promise.all(Array.from({ length: STRIP_DAYS }, (_, i) =>
      fetch(`/api/ads/availability?placement=${placement.id}&days=${effDays}&start=${addDays(base, i)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<Avail>)
        .then((j): Cell => (j.available === true ? "free" : j.available === false ? "booked" : "unknown"), (): Cell => "unknown"),
    )).then((cells) => { if (!ctrl.signal.aborted) setStrip(cells); });
    return () => ctrl.abort();
  }, [stripOn, placement.id, effDays]);

  /** Reads the chosen image, grades it against the slot, and keeps it only when nothing failed. */
  async function pickFile(variant: "desktop" | "mobile", f: File | undefined) {
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const rec = variant === "desktop" ? placement.desktop : placement.mobile;
    const info = inspectImage(bytes);
    const report = evaluateCreative({ kind: info?.kind ?? null, bytes: bytes.length, width: info?.width ?? 0, height: info?.height ?? 0 }, rec);
    setChecks((c) => ({ ...c, [variant]: { name: f.name, report } }));
    if (!report.ok) return;
    const next = { file: f, url: URL.createObjectURL(f) };
    (variant === "desktop" ? setDesktop : setMobile)((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return next;
    });
  }

  const dc = discount(placement, effDays as 1);
  const price = placement.prices[effDays as 1] ?? null;
  const destOk = /^https:\/\/.+\..+/.test(destination);
  const destBad = destination.trim() !== "" && destination.trim() !== "https://" && !destOk;
  const ready = desktop && destOk && terms && avail?.available !== false && !busy;

  async function submit() {
    if (!desktop) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("placement", placement.id); fd.set("days", String(effDays)); fd.set("start", start); fd.set("destination", destination); fd.set("headline", headline);
    fd.set("desktop", desktop.file);
    if (mobile) fd.set("mobile", mobile.file);
    try {
      const jwt = await accessToken();
      const res = await fetch("/api/ads/book", { method: "POST", body: fd, headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} });
      const j = (await res.json().catch(() => ({}))) as { orderId?: string; error?: string };
      if (res.status === 401) {
        setMsg({ kind: "signin", text: "Sign in so the campaign is tied to your account." });
      } else if (!res.ok || !j.orderId) {
        setMsg({ kind: "error", text: j.error ?? "Booking failed. Try again." });
      } else {
        router.push(`/pay/${j.orderId}`);
        return;
      }
    } catch {
      setMsg({ kind: "error", text: "Network error. Check your connection and try again." });
    }
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <ContactCard variant="inline" title="Banner listings or a custom campaign? Message an admin" />
        <Stepper steps={["Placement", "Creative", "Review and pay"]} current={!desktop || !destOk ? 1 : 2} />
        <section className="card step-swap min-w-0 space-y-4 p-4 sm:p-5" aria-label="Placement and dates">
          <h2 className="font-display text-lg font-bold">1. Placement and dates</h2>
          <div className="scroll-x" role="group" aria-label="Placement">
            {PLACEMENTS.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={placement.id === p.id} onClick={() => { setPlacement(p); setDesktop(null); setMobile(null); setChecks({}); }}>{p.name}</button>)}
          </div>
          <p className="text-sm text-soft">{placement.blurb}</p>
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2" role="group" aria-label="Duration">
            {durations.map((d) => {
              const x = discount(placement, d);
              return (
                <button key={d} type="button" aria-pressed={effDays === d} onClick={() => setDays(d)} className={`card-flat p-3 text-center ${effDays === d ? "!border-[var(--brand)]" : ""}`}>
                  <div className="text-xs text-muted">{d} day{d > 1 ? "s" : ""}</div>
                  <div className="num font-bold">${placement.prices[d]?.toLocaleString("en-US")}</div>
                  {x && x.pct > 0 && <div className="num text-[11px] text-up">save {x.pct}%</div>}
                </button>
              );
            })}
          </div>
          <label className="block min-w-0"><span className="mb-1 block text-sm font-semibold">Start date (UTC)</span><input type="date" className="input w-full min-w-0 max-w-full" min={today()} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          {avail?.configured && avail.available === true && <p className="flex items-center gap-2 text-sm text-up"><CheckCircle2 size={15} /> Available for these dates</p>}
          {avail?.available === false && <p className="flex items-center gap-2 text-sm text-down" role="alert"><AlertTriangle size={15} /> {avail.reason}</p>}
          {stripOn && strip && (
            <div className="space-y-1.5" aria-label={`Availability for the next ${STRIP_DAYS} start dates`}>
              <p className="text-xs font-semibold text-soft">Start dates for {effDays} day{effDays > 1 ? "s" : ""}</p>
              <div className="scroll-x">
                {strip.map((c, i) => {
                  const d = addDays(today(), i);
                  const [, m, dd] = d.split("-");
                  return (
                    <button key={d} type="button" disabled={c === "booked"} aria-pressed={start === d} onClick={() => setStart(d)} className={`card-flat flex w-14 shrink-0 flex-col items-center gap-1 p-2 text-center ${start === d ? "!border-[var(--brand)]" : ""} ${c === "booked" ? "opacity-50" : ""}`} title={c === "free" ? "Available" : c === "booked" ? "Booked" : "Unknown"}>
                      <span className="num text-[10px] text-muted">{m}/{dd}</span>
                      <span className="status-dot" style={{ background: c === "free" ? "var(--up)" : c === "booked" ? "var(--down)" : "var(--line-2)", boxShadow: "none" }} aria-hidden="true" />
                      <span className="text-[10px] font-semibold">{c === "free" ? "Free" : c === "booked" ? "Full" : "n/a"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {avail?.configured === false && <p className="text-xs text-muted">Live availability needs the database. It is checked again on submit.</p>}
        </section>

        <section className="card step-swap min-w-0 space-y-4 p-4 sm:p-5 [animation-delay:80ms]" aria-label="Creative">
          <h2 className="font-display text-lg font-bold">2. Creative and destination</h2>
          {(["desktop", "mobile"] as const).map((v) => {
            const rec = v === "desktop" ? placement.desktop : placement.mobile;
            const pick = v === "desktop" ? desktop : mobile;
            return (
              <div key={v} className="space-y-1.5">
                <span className="text-sm font-semibold capitalize">{v} image {v === "mobile" && <span className="font-normal normal-case text-muted">(optional, falls back to desktop)</span>}</span>
                <label className="card-flat flex cursor-pointer items-center gap-3 p-3 text-sm">
                  <ImagePlus size={18} className="text-brand" />
                  <span className="min-w-0 flex-1 truncate">{pick ? pick.file.name : `Upload JPG, PNG or WebP, about ${rec.w}×${rec.h}, up to 2 MB`}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(v, e.target.files?.[0])} />
                </label>
                {checks[v] && <CreativeChecklist report={checks[v].report} name={checks[v].name} />}
              </div>
            );
          })}
          <label className="block min-w-0"><span className="mb-1 block text-sm font-semibold">Destination URL (https)</span><input className="input w-full min-w-0" inputMode="url" autoComplete="url" value={destination} aria-invalid={destBad} aria-describedby="dest-hint" onChange={(e) => setDestination(e.target.value)} />
            <span id="dest-hint" className={`mt-1 block text-xs ${destBad ? "text-down" : destOk ? "text-up" : "text-muted"}`}>{destBad ? "Use a full link that starts with https:// and has a domain." : destOk ? "Looks good." : "Where visitors land when they click."}</span></label>
          <label className="block"><span className="mb-1 flex items-center justify-between text-sm font-semibold">Headline (optional, used as image description)<span className="num text-xs font-normal text-muted">{headline.length}/80</span></span><input className="input w-full min-w-0" maxLength={80} value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
          <p className="text-xs text-muted">Creatives are reviewed before going live. Misleading claims, unsafe links and impersonation are rejected without refund of the review.</p>
        </section>

        <section className="card step-swap min-w-0 space-y-4 p-4 sm:p-5 [animation-delay:160ms]" aria-label="Review and pay">
          <h2 className="font-display text-lg font-bold">3. Review and pay</h2>
          <dl key={`${placement.id}-${effDays}`} className="fx-pop grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm">
            <div><dt className="text-xs text-muted">Placement</dt><dd className="font-semibold">{placement.name}</dd></div>
            <div><dt className="text-xs text-muted">Length</dt><dd className="font-semibold">{effDays} day{effDays > 1 ? "s" : ""} from {start}</dd></div>
            {dc && dc.pct > 0 && <div><dt className="text-xs text-muted">Savings</dt><dd className="num font-semibold text-up">$<CountUp value={dc.original - dc.final} /> ({dc.pct}%)</dd></div>}
            <div><dt className="text-xs text-muted">Total</dt><dd className="num font-display text-xl font-bold">{price === null ? "—" : <>$<CountUp value={price} /></>}</dd></div>
          </dl>
          <div className="space-y-3 border-t border-line pt-4">
            <h3 className="eyebrow">Pay with crypto</h3>
            <AcceptedAssets />
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I accept the advertising terms. The campaign starts only after payment is verified and the creative is approved.</label>
          <button type="button" className="btn btn-primary btn-lg pay-cta w-full" disabled={!ready} onClick={submit}>{busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />} Continue to payment{price === null ? "" : ` · $${price.toLocaleString("en-US")}`}</button>
          <ContactCard variant="inline" title="Custom campaign?" />
          {msg && <p className="card-flat p-3 text-sm" role={msg.kind === "error" ? "alert" : "status"}>{msg.text} {msg.kind === "signin" && <Link href="/login?next=/promotion/book" className="font-semibold text-brand">Sign in</Link>}</p>}
        </section>
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Live preview</h2>
            <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Preview device">
              {(["desktop", "mobile"] as const).map((d) => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${device === d ? "bg-[var(--bg-elev)] text-text" : "text-muted"}`}>{d}</button>)}
            </div>
          </div>
          <PlacementPreview placement={placement.id} device={device} creative={device === "mobile" ? (mobile ?? desktop)?.url : desktop?.url} safeArea={safe} />
          <p className="text-xs text-muted">Recommended {device === "desktop" ? `${placement.desktop.w}×${placement.desktop.h}` : `${placement.mobile.w}×${placement.mobile.h}`}. Where: {placement.where}.</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> <ScanLine size={15} aria-hidden="true" /> Show safe area</label>
        </div>
        <div className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-bold">Your creative on each device</h2>
          {desktop || mobile ? <DeviceFrames desktop={placement.desktop} mobile={placement.mobile} desktopUrl={desktop?.url ?? null} mobileUrl={(mobile ?? desktop)?.url ?? null} alt={headline || "Your creative"} safe={safe} /> : <p className="text-sm text-muted">Add an image to see it in a browser and phone frame at the recommended sizes.</p>}
          <p className="text-xs text-muted">The safe area marks where text and logos stay clear of edge trimming.</p>
        </div>
      </aside>
    </div>
  );
}
