import type { ImageKind } from "@/lib/ads/image";

export type CheckLevel = "pass" | "warn" | "fail";
export interface CheckItem { id: "type" | "size" | "dimensions" | "shape"; label: string; level: CheckLevel; note: string }
export interface CreativeInput { kind: ImageKind | null; bytes: number; width: number; height: number }
export interface CreativeReport { items: CheckItem[]; ok: boolean; cropPct: number }

export const MAX_CREATIVE_BYTES = 2 * 1024 * 1024;
const ASPECT_FAIL = 0.15;
const ASPECT_WARN = 0.05;

export const formatBytes = (n: number): string => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Share of the image that is cut away when it is fitted to the slot with "cover" (0 to 100). */
export function cropPercent(width: number, height: number, rec: { w: number; h: number }): number {
  if (width <= 0 || height <= 0) return 0;
  const have = width / height;
  const want = rec.w / rec.h;
  return Math.round((1 - Math.min(have, want) / Math.max(have, want)) * 100);
}

/**
 * Grades one uploaded creative against a placement size. The hard failures match the
 * server rules (type, 2 MB, half the recommended width, 15 percent shape tolerance),
 * so a pass here is never refused later for those reasons. Softer notes are warnings.
 */
export function evaluateCreative(input: CreativeInput, rec: { w: number; h: number }, maxBytes = MAX_CREATIVE_BYTES): CreativeReport {
  const items: CheckItem[] = [];
  const typed = input.kind !== null;
  items.push(typed
    ? { id: "type", label: "File type", level: "pass", note: input.kind === "jpeg" ? "JPG" : input.kind === "png" ? "PNG" : "WebP" }
    : { id: "type", label: "File type", level: "fail", note: "Use a PNG, JPG or WebP image" });

  items.push(input.bytes > maxBytes
    ? { id: "size", label: "File size", level: "fail", note: `${formatBytes(input.bytes)} is over the ${formatBytes(maxBytes)} limit` }
    : input.bytes > maxBytes * 0.75
      ? { id: "size", label: "File size", level: "warn", note: `${formatBytes(input.bytes)} of ${formatBytes(maxBytes)}. Compress it for faster loading` }
      : { id: "size", label: "File size", level: "pass", note: `${formatBytes(input.bytes)} of ${formatBytes(maxBytes)}` });

  if (!typed || input.width <= 0 || input.height <= 0) {
    items.push({ id: "dimensions", label: "Pixel size", level: "fail", note: "Could not read the image size" });
    items.push({ id: "shape", label: "Shape", level: "fail", note: "Could not read the image size" });
    return { items, ok: false, cropPct: 0 };
  }

  const minW = Math.ceil(rec.w / 2);
  items.push(input.width < minW
    ? { id: "dimensions", label: "Pixel size", level: "fail", note: `${input.width}×${input.height}. Minimum width is ${minW}px, recommended ${rec.w}×${rec.h}` }
    : input.width < rec.w
      ? { id: "dimensions", label: "Pixel size", level: "warn", note: `${input.width}×${input.height}. Below the recommended ${rec.w}×${rec.h}, so it may look soft on sharp screens` }
      : { id: "dimensions", label: "Pixel size", level: "pass", note: `${input.width}×${input.height}. Meets the recommended ${rec.w}×${rec.h}` });

  const dev = Math.abs(input.width / input.height - rec.w / rec.h) / (rec.w / rec.h);
  const crop = cropPercent(input.width, input.height, rec);
  items.push(dev > ASPECT_FAIL
    ? { id: "shape", label: "Shape", level: "fail", note: `Wrong shape. Use about ${rec.w}×${rec.h}` }
    : dev > ASPECT_WARN
      ? { id: "shape", label: "Shape", level: "warn", note: `Close to the slot shape. About ${crop}% is trimmed at the edges, so keep key content centred` }
      : { id: "shape", label: "Shape", level: "pass", note: "Matches the slot shape" });

  return { items, ok: items.every((i) => i.level !== "fail"), cropPct: crop };
}

/** Safe-area inset as a percent of the slot: text and logos should stay inside it. */
export function safeInset(rec: { w: number; h: number }): { x: number; y: number } {
  const wide = rec.w / rec.h >= 2.5;
  return { x: wide ? 5 : 8, y: wide ? 14 : 10 };
}
