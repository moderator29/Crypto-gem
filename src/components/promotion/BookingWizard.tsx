"use client";

import { ArrowRight, Eye, ImagePlus, Loader2, ScanLine, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountUp } from "@/components/fx/CountUp";
import { AcceptedAssets } from "@/components/boost/AcceptedAssets";
import { ContactCard } from "@/components/ui/ContactCard";
import { Stepper } from "@/components/ui/Kit";
import { discount, PLACEMENTS, type Placement, type PlacementId } from "@/lib/ads/catalog";
import { inspectImage } from "@/lib/ads/image";
import { evaluateCreative, type CreativeReport } from "@/lib/export/creativeCheck";
import { bannerCheckoutHref } from "@/lib/local/checkout";
import { CreativeChecklist } from "./CreativeChecklist";
import { DeviceFrames } from "./DeviceFrames";
import { PlacementPreview } from "./PlacementPreview";

interface Pick { name: string; url: string }
type Days = 1 | 3 | 7;
const DAY_OPTIONS: readonly Days[] = [1, 3, 7];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Banner booking without an account or upload: placement, length, start date, project
 * name and destination link go to the stateless checkout. A local image can be previewed
 * in place and graded against the slot, but it never leaves the browser. The creative is
 * sent to an admin on Telegram after payment.
 */
export function BookingWizard({ initial }: { initial: PlacementId }) {
  const router = useRouter();
  const [placement, setPlacement] = useState<Placement>(PLACEMENTS.find((p) => p.id === initial) ?? PLACEMENTS[0]!);
  const [days, setDays] = useState<Days>(1);
  const [start, setStart] = useState(today());
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("https://");
  const [desktop, setDesktop] = useState<Pick | null>(null);
  const [mobile, setMobile] = useState<Pick | null>(null);
  const [checks, setChecks] = useState<{ desktop?: { name: string; report: CreativeReport }; mobile?: { name: string; report: CreativeReport } }>({});
  const [safe, setSafe] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [terms, setTerms] = useState(false);
  const [going, setGoing] = useState(false);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const durations = useMemo(() => DAY_OPTIONS.filter((d) => placement.prices[d] !== undefined), [placement]);
  const effDays: Days = durations.includes(days) ? days : durations[0] ?? 1;

  /** Reads a local image, grades it against the slot and shows it in the preview. Nothing is uploaded. */
  async function pickFile(variant: "desktop" | "mobile", f: File | undefined) {
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const rec = variant === "desktop" ? placement.desktop : placement.mobile;
    const info = inspectImage(bytes);
    const report = evaluateCreative({ kind: info?.kind ?? null, bytes: bytes.length, width: info?.width ?? 0, height: info?.height ?? 0 }, rec);
    setChecks((c) => ({ ...c, [variant]: { name: f.name, report } }));
    if (!info) return;
    const url = URL.createObjectURL(f);
    urls.current.push(url);
    (variant === "desktop" ? setDesktop : setMobile)({ name: f.name, url });
  }

  const dc = discount(placement, effDays);
  const price = placement.prices[effDays] ?? null;
  const nameOk = name.trim().length >= 2;
  const destOk = /^https:\/\/[^\s/]+\.[^\s]+$/.test(destination.trim());
  const destBad = destination.trim() !== "" && destination.trim() !== "https://" && !destOk;
  const startOk = /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= today();
  const ready = nameOk && destOk && startOk && terms && price !== null && !going;

  function submit() {
    if (!ready) return;
    setGoing(true);
    router.push(bannerCheckoutHref({ placement: placement.id, days: effDays, start, name: name.trim(), url: destination.trim() }));
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <ContactCard variant="inline" title="Banner listings or a custom campaign? Message an admin" />
        <Stepper steps={["Placement", "Details", "Review and pay"]} current={!nameOk || !destOk ? 1 : 2} />
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
          <label className="block min-w-0"><span className="mb-1 block text-sm font-semibold">Start date (UTC)</span><input type="date" className="input w-full min-w-0 max-w-full" min={today()} value={start} aria-invalid={!startOk} onChange={(e) => setStart(e.target.value)} /></label>
          {!startOk && <p className="text-xs text-down" role="alert">Pick today or a later date.</p>}
          <p className="text-xs text-muted">An admin confirms the slot for your dates after payment. If it is taken, you choose another start date or a full refund.</p>
        </section>

        <section className="card step-swap min-w-0 space-y-4 p-4 sm:p-5 [animation-delay:80ms]" aria-label="Project and destination">
          <h2 className="font-display text-lg font-bold">2. Project and destination</h2>
          <label className="block min-w-0"><span className="mb-1 flex items-center justify-between text-sm font-semibold">Project name<span className="num text-xs font-normal text-muted">{name.length}/60</span></span><input className="input w-full min-w-0" maxLength={60} value={name} autoComplete="organization" onChange={(e) => setName(e.target.value)} placeholder="Your project" /></label>
          <label className="block min-w-0"><span className="mb-1 block text-sm font-semibold">Destination URL (https)</span><input className="input w-full min-w-0" inputMode="url" autoComplete="url" value={destination} aria-invalid={destBad} aria-describedby="dest-hint" onChange={(e) => setDestination(e.target.value)} />
            <span id="dest-hint" className={`mt-1 block text-xs ${destBad ? "text-down" : destOk ? "text-up" : "text-muted"}`}>{destBad ? "Use a full link that starts with https:// and has a domain." : destOk ? "Looks good." : "Where visitors land when they click."}</span></label>

          <div className="card-lit flex items-start gap-3 rounded-2xl p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-brand"><Send size={18} aria-hidden="true" /></span>
            <span className="min-w-0 text-sm"><span className="block font-semibold">After payment, send your banner image to an admin on Telegram</span><span className="mt-0.5 block text-soft">Desktop {placement.desktop.w}×{placement.desktop.h} and mobile {placement.mobile.w}×{placement.mobile.h}, JPG, PNG or WebP, up to 2 MB. Creatives are reviewed before going live.</span></span>
          </div>

          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><Eye size={15} aria-hidden="true" /> Preview your banner (optional)</p>
            {(["desktop", "mobile"] as const).map((v) => {
              const rec = v === "desktop" ? placement.desktop : placement.mobile;
              const pick = v === "desktop" ? desktop : mobile;
              return (
                <div key={v} className="space-y-1.5">
                  <label className="card-flat flex cursor-pointer items-center gap-3 p-3 text-sm">
                    <ImagePlus size={18} className="shrink-0 text-brand" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate"><span className="font-semibold capitalize">{v}</span> · {pick ? pick.name : `choose a file, about ${rec.w}×${rec.h}`}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void pickFile(v, e.target.files?.[0])} />
                  </label>
                  {checks[v] && <CreativeChecklist report={checks[v].report} name={checks[v].name} />}
                </div>
              );
            })}
            <p className="text-xs text-muted">Preview only. The image stays in your browser and is never uploaded.</p>
          </div>
        </section>

        <section className="card step-swap min-w-0 space-y-4 p-4 sm:p-5 [animation-delay:160ms]" aria-label="Review and pay">
          <h2 className="font-display text-lg font-bold">3. Review and pay</h2>
          <dl key={`${placement.id}-${effDays}`} className="fx-pop grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm">
            <div className="min-w-0"><dt className="text-xs text-muted">Placement</dt><dd className="font-semibold">{placement.name}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted">Length</dt><dd className="font-semibold">{effDays} day{effDays > 1 ? "s" : ""} from {start}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted">Project</dt><dd className="truncate font-semibold">{name.trim() || "Not set"}</dd></div>
            {dc && dc.pct > 0 && <div className="min-w-0"><dt className="text-xs text-muted">Savings</dt><dd className="num font-semibold text-up">$<CountUp value={dc.original - dc.final} /> ({dc.pct}%)</dd></div>}
            <div className="min-w-0"><dt className="text-xs text-muted">Total</dt><dd className="num font-display text-xl font-bold">{price === null ? "—" : <>$<CountUp value={price} /></>}</dd></div>
          </dl>
          <div className="space-y-3 border-t border-line pt-4">
            <h3 className="eyebrow">Pay with crypto</h3>
            <AcceptedAssets />
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I accept the advertising terms. The campaign starts only after payment is verified and the creative is approved.</label>
          <button type="button" className="btn btn-primary btn-lg pay-cta w-full" disabled={!ready} onClick={submit}>{going ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />} Continue to payment{price === null ? "" : ` · $${price.toLocaleString("en-US")}`}</button>
          {!ready && !going && <p className="text-xs text-muted">{!nameOk ? "Add your project name." : !destOk ? "Add a destination link that starts with https://." : !terms ? "Accept the advertising terms to continue." : ""}</p>}
          <ContactCard title="Message admin" note="Send your banner image and any campaign questions to an admin on Telegram." />
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
          {desktop || mobile ? <DeviceFrames desktop={placement.desktop} mobile={placement.mobile} desktopUrl={desktop?.url ?? null} mobileUrl={(mobile ?? desktop)?.url ?? null} alt={name.trim() || "Your creative"} safe={safe} /> : <p className="text-sm text-muted">Choose an image above to see it in a browser and phone frame at the recommended sizes.</p>}
          <p className="text-xs text-muted">The safe area marks where text and logos stay clear of edge trimming.</p>
        </div>
      </aside>
    </div>
  );
}
