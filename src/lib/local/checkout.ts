/** Links into the stateless /checkout page. Every value is URL-encoded and empty optional values are left out. */

const href = (params: Record<string, string | number | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && String(v).trim() !== "") q.set(k, String(v).trim());
  return `/checkout?${q.toString()}`;
};

export function boostCheckoutHref(o: { pack: string; network: string; address: string; name: string; symbol: string }): string {
  return href({ kind: "boost", pack: o.pack, network: o.network, address: o.address, name: o.name, symbol: o.symbol });
}

export function listingCheckoutHref(o: { pkg: string; name: string; symbol: string; network?: string | null; address?: string | null; telegram?: string | null }): string {
  return href({ kind: "listing", package: o.pkg, name: o.name, symbol: o.symbol, network: o.network, address: o.address, telegram: o.telegram });
}

export function bannerCheckoutHref(o: { placement: string; days: 1 | 3 | 7; start: string; name: string; url: string }): string {
  return href({ kind: "banner", placement: o.placement, days: o.days, start: o.start, name: o.name, url: o.url });
}

/**
 * Turns what a project typed in its Telegram field (a t.me link, an @handle or a bare handle)
 * into a bare handle. Returns null when nothing usable is there.
 */
export function telegramHandle(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/)?@?([A-Za-z0-9_+]{3,64})\/?(?:[?#].*)?$/i.exec(s) ?? /^@?([A-Za-z0-9_]{3,64})$/.exec(s);
  return m?.[1] ?? null;
}
