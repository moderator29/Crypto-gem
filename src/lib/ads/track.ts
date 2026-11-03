import { createHash } from "node:crypto";

const BOT = /bot|crawl|spider|slurp|headless|phantom|lighthouse|curl|wget|python-requests|httpclient|facebookexternalhit|preview/i;

/** Basic bot filter. Missing user agents are treated as bots. */
export function isBot(userAgent: string | null): boolean {
  return !userAgent || userAgent.length < 10 || BOT.test(userAgent);
}

export function deviceOf(userAgent: string | null): "desktop" | "mobile" | "tablet" {
  const ua = userAgent ?? "";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Dedupe key: one unique impression per visitor per campaign per hour, one
 * click per visitor per campaign per hour. The visitor is a salted hash of IP
 * and user agent, so no raw IP is stored.
 */
export function dedupeKey(kind: "impression" | "click", ip: string, userAgent: string, now = new Date(), salt = process.env.AD_HASH_SALT ?? "cg"): string {
  const hour = now.toISOString().slice(0, 13);
  return createHash("sha256").update(`${salt}|${kind}|${ip}|${userAgent}|${hour}`).digest("hex").slice(0, 32);
}
