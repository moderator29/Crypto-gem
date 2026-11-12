import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed tokens for checkout quotes and receipts.
 *
 * Format: base64url(JSON payload) "." base64url(HMAC-SHA256(secret, "cg." + body)).
 * The payload is readable by anyone holding the token, so it never contains a secret;
 * the signature only proves that this server issued it and that nothing was changed.
 */

export const MIN_SECRET_LENGTH = 32;

/** The signing secret, or null when CHECKOUT_SECRET is missing or shorter than 32 characters. */
export function checkoutSecret(): string | null {
  const s = process.env.CHECKOUT_SECRET?.trim();
  return s && s.length >= MIN_SECRET_LENGTH ? s : null;
}

export const NOT_CONFIGURED = "Checkout is not configured: set CHECKOUT_SECRET";

const b64url = (buf: Buffer): string => buf.toString("base64url");

function mac(secret: string, body: string): Buffer {
  return createHmac("sha256", secret).update(`cg.${body}`).digest();
}

/** Signs any JSON-serialisable payload. */
export function signToken(payload: object, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${b64url(mac(secret, body))}`;
}

/**
 * Verifies the signature in constant time and returns the parsed payload, or null for anything
 * malformed, tampered with or signed by another secret. The caller still validates the payload shape.
 */
export function verifyToken(token: string, secret: string): unknown {
  if (typeof token !== "string" || token.length > 8000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null;
  const expected = mac(secret, body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}
