import "server-only";
import type { ReceiptData } from "./types";

const sent = new Set<string>();

/** Plain text summary of a paid order for the admin chat. */
export function adminMessage(r: ReceiptData, origin: string | null): string {
  const lines = [
    `New paid order ${r.number}`,
    `Type: ${r.kind}`,
    `Item: ${r.title}`,
    ...r.lines.map((l) => `  ${l}`),
    `Price: ${r.priceUsd} USD`,
    `Amount: ${r.received} ${r.asset} (quoted ${r.amount})`,
    `Network: ${r.networkLabel}`,
    `Transaction: ${r.explorerTxUrl}`,
    `Receipt number: ${r.number}`,
  ];
  if (origin) lines.push(`Receipts are verified at ${origin}/checkout/receipt`);
  lines.push("A repeated receipt number means the same transaction was submitted again.");
  return lines.join("\n");
}

/**
 * Sends the admin heads-up when TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID are set.
 * Never throws and never logs the bot token. `key` dedupes repeat polls on this instance.
 */
export async function notifyAdmin(r: ReceiptData, key: string, origin: string | null = null): Promise<boolean> {
  const bot = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!bot || !chat) return false;
  if (sent.has(key)) return false;
  if (sent.size > 2000) sent.clear();
  sent.add(key);
  try {
    const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: adminMessage(r, origin), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) sent.delete(key);
    return res.ok;
  } catch {
    sent.delete(key);
    return false;
  }
}
