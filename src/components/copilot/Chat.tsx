"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Msg { role: "user" | "assistant"; content: string }
interface Ctx { network: string; address: string }

const SUGGESTIONS = [
  "What is trending on Solana today?",
  "Which tokens show unusual volume growth right now?",
  "Find new pools with meaningful liquidity on Base",
  "Explain the difference between market cap and FDV",
];
const TOKEN_SUGGESTIONS = ["Summarise this token's market data", "What risks are visible in this token's data?", "Explain this token's liquidity profile"];

const TOOL_LABEL: Record<string, string> = { search_tokens: "Searching tokens", get_trending: "Reading trending data", get_new_pairs: "Reading new pairs", get_token: "Fetching token data", compare_tokens: "Comparing tokens" };

export function Chat({ context }: { context: Ctx | null }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, tool]);
  useEffect(() => () => abort.current?.abort(), []);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history, context }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "The Copilot is unavailable.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { type: string; text?: string; name?: string; message?: string };
          if (ev.type === "text") {
            setTool(null);
            setMessages((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + ev.text } : x)));
          } else if (ev.type === "tool") setTool(TOOL_LABEL[ev.name ?? ""] ?? "Fetching data");
          else if (ev.type === "error") throw new Error(ev.message);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
      }
    } finally {
      setBusy(false);
      setTool(null);
    }
  }

  const suggestions = context ? TOKEN_SUGGESTIONS : SUGGESTIONS;
  return (
    <div className="glass flex h-[calc(100dvh-var(--header-h)-var(--nav-h)-48px)] min-h-[420px] flex-col lg:h-[calc(100dvh-var(--header-h)-120px)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-4 py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--border)] text-brand"><Sparkles size={22} /></span>
            <p className="text-sm text-soft">{context ? "Ask about this token. I read live market data before answering." : "Ask about tokens, pools and market activity. I read live market data before answering."}</p>
            <div className="mx-auto flex max-w-md flex-col gap-2">
              {suggestions.map((s) => <button key={s} type="button" className="glass-flat hover-lift px-4 py-3 text-left text-sm" onClick={() => ask(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white" : "glass-flat"}`}>
              {m.content || (busy && i === messages.length - 1 ? <Loader2 size={16} className="animate-spin text-brand" /> : null)}
            </div>
          </div>
        ))}
        {tool && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 size={13} className="animate-spin" /> {tool}…</p>}
        {error && <p className="text-sm text-down" role="alert">{error}</p>}
        <div ref={end} />
      </div>
      <form className="border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <div className="flex gap-2">
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a token or the market" maxLength={1000} aria-label="Message" />
          <button className="btn btn-primary !px-0 w-12 shrink-0" disabled={busy || !input.trim()} aria-label="Send"><Send size={17} /></button>
        </div>
        <p className="mt-2 text-[11px] text-muted">Answers use live data from GeckoTerminal, can be wrong, and are not financial advice. The Copilot cannot trade or move funds.</p>
      </form>
    </div>
  );
}
