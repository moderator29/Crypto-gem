import { DEFAULT_RPC } from "./methods";

export const RPC_TIMEOUT_MS = 8000;

/** RPC_<NETWORK> when it is an https URL, else the public default. */
export function rpcUrl(networkId: string): string {
  const env = process.env[`RPC_${networkId.toUpperCase()}`]?.trim();
  return env && env.startsWith("https://") ? env : (DEFAULT_RPC[networkId] as string);
}

/** One JSON-RPC call. Throws on transport failure, HTTP error or an RPC error object. */
export async function rpcCall<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result as T;
}
