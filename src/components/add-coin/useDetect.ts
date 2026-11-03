"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { classifyAddress } from "@/lib/market-data/identifiers";
import type { DetectedToken, DetectEvent, DetectStatus, NetworkMatch } from "@/lib/detect/types";

export interface Stage {
  id: string;
  label: string;
  state: "running" | "done" | "skipped" | "failed";
}

export interface DetectState {
  phase: "idle" | "detecting" | "done";
  stages: Stage[];
  status: DetectStatus | null;
  message?: string;
  matches?: NetworkMatch[];
  token?: DetectedToken;
}

const IDLE: DetectState = { phase: "idle", stages: [], status: null };
const resultCache = new Map<string, DetectState>();

/**
 * Debounced, cancellable detection. A newer address or network aborts the
 * in-flight request and its late events are ignored. Successful results are
 * cached so retyping the same address costs nothing.
 */
export function useDetect(address: string, network: string | null) {
  const [state, setState] = useState<DetectState>(IDLE);
  const abort = useRef<AbortController | null>(null);
  const [nonce, setNonce] = useState(0);

  const run = useCallback(async (addr: string, net: string | null) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const key = `${addr}|${net ?? ""}`;
    const hit = resultCache.get(key);
    if (hit) {
      setState(hit);
      return;
    }
    setState({ phase: "detecting", stages: [], status: null });
    try {
      const res = await fetch(`/api/detect?address=${encodeURIComponent(addr)}${net ? `&network=${net}` : ""}`, { signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const retry = res.status === 429 ? "Too many lookups. Wait a moment and retry." : "Detection is temporarily unavailable.";
        setState({ phase: "done", stages: [], status: "unavailable", message: retry });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let stages: Stage[] = [];
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as DetectEvent;
          if (ev.type === "stage") {
            stages = [...stages.filter((s) => s.id !== ev.id), { id: ev.id, label: ev.label, state: ev.state }];
            if (!ctrl.signal.aborted) setState({ phase: "detecting", stages, status: null });
          } else if (!ctrl.signal.aborted) {
            const final: DetectState = { phase: "done", stages, status: ev.status, message: ev.message, matches: ev.matches, token: ev.token };
            if (ev.status === "found" || ev.status === "partial" || ev.status === "multiple") resultCache.set(key, final);
            setState(final);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState({ phase: "done", stages: [], status: "unavailable", message: "Detection is temporarily unavailable. Retry." });
    }
  }, []);

  const trimmed = address.trim();
  const malformed = trimmed !== "" && classifyAddress(trimmed) === "unknown";

  useEffect(() => {
    if (!trimmed || malformed) {
      abort.current?.abort();
      return;
    }
    const t = setTimeout(() => run(trimmed, network), 350);
    return () => clearTimeout(t);
  }, [trimmed, malformed, network, run, nonce]);

  useEffect(() => () => abort.current?.abort(), []);

  const view: DetectState = !trimmed
    ? IDLE
    : malformed
      ? { phase: "done", stages: [], status: trimmed.length >= 20 ? "invalid" : null, message: "That does not look like a valid contract address or mint." }
      : state;

  return { state: view, retry: () => { resultCache.delete(`${address.trim()}|${network ?? ""}`); setNonce((n) => n + 1); } };
}
