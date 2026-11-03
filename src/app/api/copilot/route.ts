import { copilotConfigured, runCopilot, sanitiseMessages, type CopilotEvent } from "@/lib/ai/copilot";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Streams Copilot events as NDJSON. Rate limited per minute and per day to control cost. */
export async function POST(req: Request) {
  if (!copilotConfigured()) return Response.json({ error: "AI Copilot is not configured. Set ANTHROPIC_API_KEY." }, { status: 503 });
  const ip = clientKey(req);
  const minute = rateLimit(`ai:m:${ip}`, 8, 60_000);
  const day = rateLimit(`ai:d:${ip}`, 80, 86_400_000);
  if (!minute.ok || !day.ok) return Response.json({ error: "You have reached the Copilot limit. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(minute.retryAfterSec, day.retryAfterSec)) } });

  const body = (await req.json().catch(() => null)) as { messages?: unknown; context?: { network?: string; address?: string } } | null;
  const messages = sanitiseMessages(body?.messages);
  if (messages.length === 0) return Response.json({ error: "Ask a question first." }, { status: 400 });
  const c = body?.context;
  const context = c?.network && c.address && getNetwork(c.network) && classifyAddress(c.address) !== "unknown" ? { network: c.network, address: normalizeAddress(c.address) } : null;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: CopilotEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const ev of runCopilot(messages, context)) send(ev);
      } catch {
        send({ type: "error", message: "The Copilot could not answer right now. Try again." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
