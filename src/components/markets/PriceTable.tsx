"use client";

import { ArrowDown, ArrowUp, GitCompareArrows, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SortDir, SortKey } from "@/lib/market-data/lists";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { PoolSummary } from "@/lib/market-data/types";
import { Zap } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isFresh, matchesQuery } from "@/lib/market-data/analytics";
import { normalizeAddress } from "@/lib/market-data/identifiers";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";
import { useDisplayPrefs } from "@/lib/displayPrefs";
import { CompareTray } from "./CompareTray";
import { inTray, toggleTray, useCompareTray } from "./compareTray";
import { useListQuery } from "./listFilter";
import { RowPreview, type PreviewAt } from "./RowPreview";
import { Sparkline } from "./Sparkline";
import { QuickAlert } from "@/components/account/QuickAlert";
import { TokenVote } from "@/components/votes/TokenVote";
import { WatchStar } from "./WatchStar";

const COLS = "grid-cols-[32px_minmax(0,1fr)_auto_84px] md:grid-cols-[108px_32px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_190px]";

/** Price that flashes green or red when a refresh changes it, with the change arrow bouncing in the new direction. */
function LivePrice({ value }: { value: number | null }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (before === null || value === null || before === value) return;
    const on = setTimeout(() => setDir(value > before ? "up" : "down"), 0);
    const off = setTimeout(() => setDir(null), 1100);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [value]);
  return <span className={`rounded text-sm font-semibold ${dir === "up" ? "flash-up" : dir === "down" ? "flash-down" : ""}`}>{priceUsd(value)}</span>;
}

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="num text-xs text-muted">{"—"}</span>;
  const up = v >= 0;
  return (
    <span className={`num inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
      {up ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />}
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

export interface SortProps {
  sort: SortKey | null;
  dir: SortDir;
  /** Link mode (server pages): every header is a real URL. */
  sortHref?: (key: SortKey, next: SortDir | null) => string;
  /** Button mode (client boards). */
  onSort?: (key: SortKey, next: SortDir | null) => void;
}

function Head({ k, label, className = "", sp }: { k: SortKey; label: string; className?: string; sp?: SortProps }) {
  if (!sp || (!sp.sortHref && !sp.onSort)) return <span className={className}>{label}</span>;
  const active = sp.sort === k;
  const next: SortDir | null = !active ? "desc" : sp.dir === "desc" ? "asc" : null;
  const inner = (
    <>
      {label}
      <span className="mk-sort-ico" data-state={active ? sp.dir : "none"} aria-hidden="true"><ArrowDown size={11} /></span>
    </>
  );
  const cls = `mk-sort-btn inline-flex items-center gap-1 uppercase transition hover:text-text ${active ? "text-text" : ""} ${className}`;
  return sp.sortHref ? (
    <Link href={sp.sortHref(k, next)} scroll={false} className={cls} aria-label={`Sort by ${label}`}>{inner}</Link>
  ) : (
    <button type="button" onClick={() => sp.onSort?.(k, next)} className={cls} aria-label={`Sort by ${label}`}>{inner}</button>
  );
}

/** Matches the field the person is typing in, so list shortcuts never fire while typing or on a focused control. */
const typingIn = (el: EventTarget | null): boolean => {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};

const noTick = () => () => undefined;
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

function CompareToggle({ pool }: { pool: PoolSummary }) {
  const toast = useToast();
  const items = useCompareTray();
  const t = pool.baseToken;
  const on = inTray(items, pool.networkId, t.address);
  return (
    <button
      type="button"
      className="mk-cmp"
      aria-pressed={on}
      aria-label={on ? `Remove ${t.symbol} from compare` : `Add ${t.symbol} to compare`}
      title={on ? "Remove from compare" : "Add to compare"}
      onClick={() => { if (!toggleTray({ networkId: pool.networkId, address: t.address, symbol: t.symbol })) toast.info("Compare holds five tokens", "Remove one from the tray to add another."); }}
    >
      <GitCompareArrows size={15} aria-hidden="true" />
    </button>
  );
}

/**
 * Price board: watch star, compare, rank, token, price with 24h change beneath, cap, volume and a real 7 day trend.
 * j and k move a visible cursor, Enter opens the token, c queues it for compare. On desktop, hovering a row for a
 * moment shows a larger trend and liquidity. The find box in the sticky bar filters these rows.
 */
export function PriceTable({ pools, startRank = 1, sorting, boosted }: { pools: PoolSummary[]; startRank?: number; sorting?: SortProps; boosted?: ReadonlySet<string> }) {
  const prefs = useDisplayPrefs();
  const router = useRouter();
  const toast = useToast();
  const query = useListQuery();
  const rows = useMemo(() => pools.map((p, i) => ({ p, rank: startRank + i })).filter(({ p }) => matchesQuery(p, query)), [pools, startRank, query]);
  const [curRaw, setCur] = useState(-1);
  const cur = curRaw < rows.length ? curRaw : -1;
  const [preview, setPreview] = useState<PreviewAt | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const now = useSyncExternalStore(noTick, minuteNow, () => 0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPreview(null);
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target) || rows.length === 0) return;
      const el = e.target as HTMLElement | null;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        hide();
        const next = e.key === "j" ? Math.min(rows.length - 1, cur + 1) : Math.max(0, cur < 0 ? 0 : cur - 1);
        setCur(next);
        list.current?.children[next]?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      } else if (e.key === "Enter" && cur >= 0 && el && el.tagName !== "A" && el.tagName !== "BUTTON") {
        const r = rows[cur];
        if (r) router.push(`/token/${r.p.networkId}/${r.p.baseToken.address}`);
      } else if (e.key === "c" && cur >= 0) {
        const r = rows[cur];
        if (r && !toggleTray({ networkId: r.p.networkId, address: r.p.baseToken.address, symbol: r.p.baseToken.symbol })) toast.info("Compare holds five tokens", "Remove one from the tray to add another.");
      }
    };
    window.addEventListener("keydown", on);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("scroll", hide);
    };
  }, [rows, cur, router, toast, hide]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const arm = (e: React.PointerEvent<HTMLLIElement>, pool: PoolSummary) => {
    if (e.pointerType !== "mouse" || window.innerWidth < 768) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPreview({ pool, x, top: r.top, bottom: r.bottom }), 320);
  };

  return (
    <>
    <div className="card overflow-hidden">
      <div className={`grid items-center gap-x-2 border-b border-line px-2.5 py-2.5 text-[11px] md:gap-x-3 md:px-3 font-semibold uppercase tracking-wider text-muted ${COLS}`}>
        <span />
        <span className="hidden md:block">#</span>
        <span>Name</span>
        <span className="flex items-center justify-end gap-2 md:justify-start"><Head k="price" label="Price" sp={sorting} /><Head k="h24" label="24h" sp={sorting} /></span>
        <span className="hidden md:block"><Head k="cap" label="Cap / FDV" sp={sorting} /></span>
        <span className="hidden md:block"><Head k="volume" label="24h volume" sp={sorting} /></span>
        <span className="text-right">7d trend, votes</span>
      </div>
      {rows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted"><SearchX size={16} aria-hidden="true" /> Nothing on this page matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul ref={list} onPointerLeave={hide} aria-keyshortcuts="j k Enter c">
          {rows.map(({ p, rank }, i) => {
            const t = p.baseToken;
            const cap = p.marketCapUsd && p.marketCapUsd > 0 ? p.marketCapUsd : p.fdvUsd;
            const fresh = now > 0 && isFresh(p, 48, now);
            return (
              <li
                key={p.id}
                style={{ ["--i" as string]: Math.min(i, 24) }}
                data-current={cur === i ? "true" : undefined}
                onPointerEnter={(e) => arm(e, p)}
                onPointerMove={(e) => { if (!preview && e.pointerType === "mouse") arm(e, p); }}
                className={`mk-row row-in relative grid items-center gap-x-2 border-b border-line px-2.5 ${prefs.compact ? "py-1.5" : "py-2.5"} md:gap-x-3 md:px-3 transition last:border-0 hover:bg-[var(--surface-2)] ${cur === i ? "mk-row-cur" : ""} ${COLS}`}
              >
                <span className="flex flex-col items-center md:flex-row"><WatchStar network={p.networkId} address={t.address} symbol={t.symbol} /><span className="hidden md:block"><QuickAlert network={p.networkId} address={t.address} symbol={t.symbol} name={t.name} price={p.priceUsd} compact /></span><CompareToggle pool={p} /></span>
                <span className="num hidden text-sm text-muted md:block">{rank}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <TokenLogo src={t.imageUrl} symbol={t.symbol} size={prefs.compact ? 28 : 34} networkId={p.networkId} address={t.address} />
                  <span className="min-w-0">
                    <Link href={`/token/${p.networkId}/${t.address}`} className="block truncate text-sm font-semibold leading-tight after:absolute after:inset-0 after:content-['']">
                      {t.name || t.symbol}
                      {boosted?.has(`${p.networkId}:${normalizeAddress(t.address)}`) && <Zap size={13} className="ml-1.5 inline text-warm" aria-label="Boosted" />}
                    </Link>
                    <span className="flex items-center gap-1.5 truncate text-xs uppercase text-muted">{t.symbol}{fresh && <span className="mk-new normal-case">New {ageShort(p.createdAt, now)}</span>}</span>
                  </span>
                </span>
                <span className="num flex flex-col items-end md:items-start">
                  <LivePrice value={p.priceUsd} />
                  <Delta v={p.change.h24} />
                </span>
                <span className="num hidden flex-col md:flex">
                  <span className="text-sm font-semibold">{usdCompact(cap)}</span>
                  <span className="text-xs text-muted">{p.fdvUsd && p.fdvUsd !== cap ? usdCompact(p.fdvUsd) : ""}</span>
                </span>
                <span className="num hidden text-sm font-semibold md:block">{usdCompact(p.volumeUsd.h24)}</span>
                <span className="flex items-center justify-end gap-3">{prefs.charts && <span className="hidden md:block"><Sparkline network={p.networkId} pool={p.address} width={68} height={28} /></span>}<TokenVote network={p.networkId} address={t.address} /></span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hidden items-center gap-3 border-t border-line px-3 py-2 text-[11px] text-muted md:flex">
        <span><kbd className="mk-kbd">j</kbd> <kbd className="mk-kbd">k</kbd> move</span>
        <span><kbd className="mk-kbd">Enter</kbd> open</span>
        <span><kbd className="mk-kbd">c</kbd> compare</span>
        <span><kbd className="mk-kbd">/</kbd> find</span>
      </p>
      {preview && <RowPreview at={preview} />}
    </div>
    <CompareTray />
    </>
  );
}
