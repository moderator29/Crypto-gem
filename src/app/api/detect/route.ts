import { detectToken } from "@/lib/detect/engine";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";
import type { DetectEvent } from "@/lib/detect/types";

export const dynamic = "force-dynamic";

/** Streams newline-delimited detection events: real stage updates, then one result. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("address") ?? "").trim();
  const network = url.searchParams.get("network") ?? undefined;
  if (!address || address.length > 128) {
    return Response.json({ error: "address required" }, { status: 400 });
  }
  const rl = rateLimit(`detect:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) {
    return Response.json({ error: "Too many lookups. Slow down." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: DetectEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const ev of detectToken(address, network)) send(ev);
      } catch {
        send({ type: "result", status: "unavailable", message: "Detection failed unexpectedly. Retry in a moment." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
