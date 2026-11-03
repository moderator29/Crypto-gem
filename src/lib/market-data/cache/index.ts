interface Entry<T> {
  value: T;
  expires: number;
  staleUntil: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 2000;

/**
 * Cache with request de-duplication and stale-if-error.
 * Fresh for `ttlMs`; if the loader fails, a value up to `staleMs` old is
 * served (flagged through the `stale` out-parameter) instead of the error.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  opts: { staleMs?: number } = {},
): Promise<{ value: T; stale: boolean }> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return { value: hit.value, stale: false };

  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = loader().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  try {
    const value = await pending;
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
    store.set(key, { value, expires: now + ttlMs, staleUntil: now + ttlMs + (opts.staleMs ?? ttlMs * 10) });
    return { value, stale: false };
  } catch (err) {
    if (hit && hit.staleUntil > now) return { value: hit.value, stale: true };
    throw err;
  }
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}
