import { safeInset } from "@/lib/export/creativeCheck";

interface Size { w: number; h: number }

function Shot({ url, size, alt, safe }: { url: string | null; size: Size; alt: string; safe: boolean }) {
  const inset = safeInset(size);
  return (
    <div className="relative w-full overflow-hidden rounded bg-[var(--surface-3)]" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-2 text-center text-[11px] font-semibold text-muted">{size.w}×{size.h}</span>
      )}
      {safe && url && <span className="safe-area" style={{ inset: `${inset.y}% ${inset.x}%` }} aria-hidden="true" />}
    </div>
  );
}

/** The creative inside a browser frame and a phone frame, each at the placement's recommended shape. */
export function DeviceFrames({ desktop, mobile, desktopUrl, mobileUrl, alt, safe }: { desktop: Size; mobile: Size; desktopUrl: string | null; mobileUrl: string | null; alt: string; safe: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-soft">Desktop · {desktop.w}×{desktop.h}</p>
        <div className="frame-desktop">
          <header aria-hidden="true"><i /><i /><i /></header>
          <div className="p-2"><Shot url={desktopUrl} size={desktop} alt={alt} safe={safe} /></div>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-soft">Mobile · {mobile.w}×{mobile.h}</p>
        <div className="frame-phone" style={{ maxWidth: 250 }}>
          <Shot url={mobileUrl} size={mobile} alt={alt} safe={safe} />
        </div>
      </div>
    </div>
  );
}
