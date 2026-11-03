import type { PlacementId } from "@/lib/ads/catalog";

const bar = "rounded bg-[var(--border)]";

/** Zone that holds the advertiser's creative inside the wireframe. */
function Zone({ on, label, creative, className }: { on: boolean; label: string; creative?: string | null; className: string }) {
  if (!on) return <div className={`${bar} ${className}`} />;
  return (
    <div className={`relative overflow-hidden rounded ring-2 ring-[var(--brand)] shadow-[0_0_24px_color-mix(in_srgb,var(--brand)_45%,transparent)] ${className}`}>
      {creative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creative} alt="Your creative" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--brand)_18%,transparent)] text-[10px] font-bold uppercase tracking-widest text-brand">{label}</span>
      )}
      <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">Sponsored</span>
    </div>
  );
}

function Row({ on, creative }: { on: boolean; creative?: string | null }) {
  return on ? (
    <Zone on label="Your ad" creative={creative} className="h-6" />
  ) : (
    <div className="flex items-center gap-1.5">
      <div className={`${bar} h-4 w-4 rounded-full`} />
      <div className={`${bar} h-2 flex-1`} />
      <div className={`${bar} h-2 w-8`} />
    </div>
  );
}

/**
 * Wireframe of the real page layout with the chosen placement highlighted.
 * Mirrors the structure of Discover (and the token page) so advertisers see
 * exactly where the creative will sit on desktop and mobile.
 */
export function PlacementPreview({ placement, device, creative }: { placement: PlacementId; device: "desktop" | "mobile"; creative?: string | null }) {
  const is = (...ids: PlacementId[]) => ids.includes(placement);
  const frame = device === "mobile" ? "mx-auto w-[210px]" : "w-full";

  if (placement === "token-page") {
    return (
      <div className={`${frame} glass-flat space-y-2 p-3`} aria-label="Token page preview">
        <div className="flex items-center gap-2"><div className={`${bar} h-6 w-6 rounded-full`} /><div className={`${bar} h-3 w-24`} /><div className={`${bar} ml-auto h-3 w-12`} /></div>
        <div className={`${bar} h-24`} />
        <div className={device === "mobile" ? "space-y-2" : "grid grid-cols-[1fr_30%] gap-2"}>
          <div className="space-y-1.5"><div className={`${bar} h-2.5`} /><div className={`${bar} h-2.5`} /><div className={`${bar} h-2.5 w-2/3`} /></div>
          <Zone on label="Your ad" creative={creative} className={device === "mobile" ? "h-14" : "h-20"} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${frame} glass-flat space-y-2 p-3`} aria-label="Discover page preview">
      <div className="flex items-center gap-2"><div className={`${bar} h-4 w-4`} /><div className={`${bar} h-2.5 w-16`} /><div className={`${bar} ml-auto h-4 w-10 rounded-full`} /></div>
      <div className={`${bar} h-4`} />
      <Zone on={is("hero")} label="Hero" creative={is("hero") ? creative : null} className={device === "mobile" ? "h-20" : "h-24"} />
      <Zone on={is("featured")} label="Featured" creative={is("featured") ? creative : null} className="h-9" />
      <Zone on={is("ecosystem")} label="Ecosystem" creative={is("ecosystem") ? creative : null} className="h-7" />
      <div className="flex gap-1">{Array.from({ length: 4 }, (_, i) => <div key={i} className={`${bar} h-4 w-10 rounded-full`} />)}</div>
      <div className={device === "mobile" ? "space-y-1.5" : "grid grid-cols-[1fr_28%] gap-2"}>
        <div className="space-y-1.5">
          <Row on={is("trending")} creative={creative} />
          <Row on={false} />
          <Row on={is("new-listings", "hot-pairs")} creative={creative} />
          <Row on={false} />
        </div>
        <Zone on={is("side")} label="Side" creative={is("side") ? creative : null} className={device === "mobile" ? "h-12" : "h-full min-h-[64px]"} />
      </div>
    </div>
  );
}
