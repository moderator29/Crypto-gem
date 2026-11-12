"use client";

import { Activity, Bot, ChevronLeft, ChevronRight, Flame, Link2, Megaphone, Pause, Play, PlusCircle, Rocket, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { RailIcon, RailItem } from "@/lib/rail";

const ICONS: Record<RailIcon, LucideIcon> = { trend: TrendingUp, flame: Flame, spark: Sparkles, chain: Link2, rocket: Rocket, bot: Bot, plus: PlusCircle, megaphone: Megaphone, activity: Activity };
const TONE_TEXT = { up: "text-up", down: "text-down", brand: "text-brand", warm: "text-warm" } as const;
const TONE_BAR = { up: "bg-[var(--up)]", down: "bg-[var(--down)]", brand: "bg-[var(--brand)]", warm: "bg-[var(--warm)]" } as const;

/** Slow on purpose: about one card every 11 seconds. Calm, readable, never frantic. */
const SPEED_PX_PER_SEC = 26;
const IDLE_AFTER_TOUCH_MS = 3200;
const COPIES = 3;

function Icon({ name, size = 16 }: { name: RailIcon; size?: number }) {
  const I = ICONS[name];
  return <I size={size} aria-hidden="true" />;
}

/** Breaking market update: a measured fact with a number. Accent bar shows direction. */
function MarketCard({ item, tab }: { item: RailItem; tab: number }) {
  return (
    <Link href={item.href} tabIndex={tab} className="card hover-lift relative flex h-full flex-col justify-between overflow-hidden p-4">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${TONE_BAR[item.tone]}`} />
      <div className="flex items-center justify-between gap-2">
        <span className={`eyebrow flex items-center gap-1.5 ${TONE_TEXT[item.tone]}`}><Icon name={item.icon} size={13} /> {item.eyebrow}</span>
        <span className="live-dot shrink-0" aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {item.tokenLogo !== undefined ? <TokenLogo src={item.tokenLogo} symbol={item.title} size={32} networkId={item.tokenNetwork} address={item.tokenAddress} /> : <span className="icon-tile h-8 w-8 shrink-0 rounded-full"><Icon name={item.icon} size={15} /></span>}
          <span className="truncate font-semibold tracking-tight">{item.title}</span>
        </span>
        {item.value && <span className={`num shrink-0 text-xl font-bold tracking-tight ${TONE_TEXT[item.tone]}`}>{item.value}</span>}
      </div>
      <p className="truncate text-xs text-muted">{item.sub}</p>
    </Link>
  );
}

/** Paid placement. A sold slot is image-led; an unsold slot is an invitation and never pretends to be an advertiser. */
function SponsoredCard({ item, tab }: { item: RailItem; tab: number }) {
  if (item.available) {
    return (
      <Link href={item.href} tabIndex={tab} className="card hover-lift group relative flex h-full flex-col justify-between overflow-hidden !border-dashed !border-[var(--line-2)] p-4">
        <span className="badge badge-sponsored w-fit">{item.eyebrow}</span>
        <div>
          <p className="font-semibold tracking-tight">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted">{item.sub}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{item.cta} <ChevronRight size={15} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </Link>
    );
  }
  return (
    <a href={item.href} tabIndex={tab} target="_blank" rel="sponsored noopener noreferrer" className="card hover-lift relative block h-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.imageUrl && <img src={item.imageUrl} alt={item.title} loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover" />}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="badge badge-sponsored absolute left-3 top-3 !bg-black/55 backdrop-blur">Sponsored</span>
      <span className="absolute inset-x-3 bottom-3 truncate text-sm font-semibold text-white">{item.title}</span>
    </a>
  );
}

/** Platform announcement: what CryptoGemCN offers. Brand-tinted so it reads as ours, not market data and not an ad. */
function PlatformCard({ item, tab }: { item: RailItem; tab: number }) {
  return (
    <Link href={item.href} tabIndex={tab} className="card card-lit hover-lift group relative flex h-full flex-col justify-between overflow-hidden p-4">
      <span className="flex items-center gap-2.5">
        <span className="icon-tile h-9 w-9 shrink-0 rounded-xl"><Icon name={item.icon} size={17} /></span>
        <span className="eyebrow text-brand">{item.eyebrow}</span>
      </span>
      <div>
        <p className="font-semibold leading-tight tracking-tight">{item.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-soft">{item.sub}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{item.cta} <ChevronRight size={15} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
    </Link>
  );
}

function RailCard({ item, tab }: { item: RailItem; tab: number }) {
  return (
    <li className="h-[132px] w-[270px] shrink-0 sm:w-[306px]">
      {item.kind === "market" ? <MarketCard item={item} tab={tab} /> : item.kind === "sponsored" ? <SponsoredCard item={item} tab={tab} /> : <PlatformCard item={item} tab={tab} />}
    </li>
  );
}

/**
 * Continuous right-to-left feed of market updates, sponsored placements and platform announcements.
 * The track is three identical sets; position stays inside the middle set and wraps by exactly one set
 * width, so there is never a reset or a jump. Drag, swipe, wheel and the arrow buttons all move the same
 * position. Motion pauses on hover, focus, touch, when offscreen, when the tab is hidden, and on request.
 * With reduced motion it becomes a plain horizontally scrollable list.
 */
export function LiveRail({ items }: { items: RailItem[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const pos = useRef(0);
  const setW = useRef(0);
  const vel = useRef(0);
  const idleUntil = useRef(0);
  const hover = useRef(false);
  const focus = useRef(false);
  const offscreen = useRef(false);
  const hidden = useRef(false);
  const anim = useRef<{ from: number; to: number; t0: number } | null>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, lastX: 0, lastT: 0, startPos: 0 });
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const animated = !reduced && items.length >= 3;

  useEffect(() => {
    if (!animated || !track.current || !viewport.current) return;
    const el = track.current;
    const measure = () => {
      const w = el.scrollWidth / COPIES;
      if (!w) return;
      const ratio = setW.current ? pos.current / setW.current : 1;
      setW.current = w;
      pos.current = w * (ratio >= 1 && ratio < 2 ? ratio : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (offscreen.current = !e?.isIntersecting), { threshold: 0.05 });
    io.observe(viewport.current);
    const onVis = () => (hidden.current = document.hidden);
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      const w = setW.current;
      if (w) {
        if (anim.current) {
          const k = Math.min(1, (t - anim.current.t0) / 650);
          const eased = 1 - Math.pow(1 - k, 3);
          pos.current = anim.current.from + (anim.current.to - anim.current.from) * eased;
          if (k >= 1) anim.current = null;
        } else if (!drag.current.down) {
          if (Math.abs(vel.current) > 0.015) {
            pos.current += vel.current * dt;
            vel.current *= Math.pow(0.93, dt / 16);
          } else if (playingRef.current && !hover.current && !focus.current && !offscreen.current && !hidden.current && t > idleUntil.current) {
            pos.current += (SPEED_PX_PER_SEC * dt) / 1000;
          }
        }
        // Wrap by exactly one set so the loop is invisible.
        if (pos.current >= w * 2) pos.current -= w;
        else if (pos.current < w) pos.current += w;
        el.style.transform = `translate3d(${-pos.current}px,0,0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [animated]);

  const onDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    anim.current = null;
    vel.current = 0;
    drag.current = { down: true, moved: false, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), startPos: pos.current };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* capture is an enhancement only */
      }
    }
    if (!d.moved) return;
    const now = performance.now();
    const v = -(e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    vel.current = vel.current * 0.6 + v * 0.4;
    d.lastX = e.clientX;
    d.lastT = now;
    pos.current = d.startPos - dx;
  };
  const onUp = () => {
    const d = drag.current;
    d.down = false;
    if (d.moved) idleUntil.current = performance.now() + IDLE_AFTER_TOUCH_MS;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    // A drag must not count as a click on the card underneath.
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };
  const onWheel = (e: ReactWheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    pos.current += e.deltaX;
    idleUntil.current = performance.now() + IDLE_AFTER_TOUCH_MS;
  };
  const jump = useCallback((dir: 1 | -1) => {
    anim.current = { from: pos.current, to: pos.current + dir * 640, t0: performance.now() };
    idleUntil.current = performance.now() + IDLE_AFTER_TOUCH_MS;
  }, []);

  if (items.length === 0) return null;

  const controls = (
    <div className="flex items-center gap-1.5">
      {animated && (
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-pressed={!playing} aria-label={playing ? "Pause the live feed" : "Play the live feed"} onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      )}
      {animated && (
        <>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Previous cards" onClick={() => jump(-1)}><ChevronLeft size={16} /></button>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Next cards" onClick={() => jump(1)}><ChevronRight size={16} /></button>
        </>
      )}
    </div>
  );

  return (
    <section aria-label="Live feed: market updates, sponsored placements and announcements" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2"><span className="live-dot" aria-hidden="true" /> Live feed</p>
        {controls}
      </div>
      {animated ? (
        <div
          ref={viewport}
          className="relative -mx-4 overflow-hidden px-4 [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)] [touch-action:pan-y] select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerEnter={(e) => (hover.current = e.pointerType === "mouse")}
          onPointerLeave={() => (hover.current = false)}
          onFocusCapture={() => (focus.current = true)}
          onBlurCapture={() => (focus.current = false)}
          onClickCapture={onClickCapture}
          onWheel={onWheel}
        >
          <ul ref={track} className="flex w-max gap-3 will-change-transform">
            {Array.from({ length: COPIES }, (_, c) => items.map((it) => <RailCard key={`${c}-${it.id}`} item={it} tab={c === 1 ? 0 : -1} />)).flat()}
          </ul>
        </div>
      ) : (
        <ul className="scroll-x snap-x">
          {items.map((it) => (
            <RailCard key={it.id} item={it} tab={0} />
          ))}
        </ul>
      )}
    </section>
  );
}
