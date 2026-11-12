/** Tiny local key-value store. Uses localStorage when it works and falls back to memory when it is blocked, so every feature still runs. */

const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let persistent = true;

/** True while writes are actually reaching localStorage. */
export function isPersistent(): boolean {
  return persistent;
}

/** Read a raw string. Never throws. */
export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

/** Write or remove a raw string, keep a memory copy, and tell subscribers. Never throws. */
export function writeRaw(key: string, value: string | null): void {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    persistent = false;
  }
  listeners.forEach((l) => l());
}

/** Subscribe to changes made in this tab or, through the storage event, in other tabs. Returns the unsubscribe function. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => cb();
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Parse JSON text without throwing. */
export function safeJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
