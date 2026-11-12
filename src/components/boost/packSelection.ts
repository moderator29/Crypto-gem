export const PACK_EVENT = "boost:pack";
const KEY = "boost-pack";

/** The remembered pack id from the URL (?pack=) first, then sessionStorage. Storage can be blocked, so every access is guarded. */
export function readPack(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get("pack");
    if (q && /^[a-z0-9_-]{2,30}$/i.test(q)) return q;
  } catch {
    return null;
  }
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v && /^[a-z0-9_-]{2,30}$/i.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Remembers the pack in the URL and sessionStorage, then tells the project picker. */
export function storePack(id: string): void {
  try {
    window.sessionStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable, the URL still carries the choice */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("pack", id);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new CustomEvent(PACK_EVENT, { detail: id }));
}

/** Validates a pack id against the packs actually on sale. Anything else is ignored. */
export function validPack<T extends { id: string }>(id: string | null | undefined, packs: readonly T[]): string | null {
  return id && packs.some((p) => p.id === id) ? id : null;
}
