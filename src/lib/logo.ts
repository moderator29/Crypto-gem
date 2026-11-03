import type { ImageInfo } from "@/lib/ads/image";

export const LOGO_BUCKET = "logos";
export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MIN_PX = 128;

/** Checks a logo from its real bytes: type, size, minimum width and a roughly square shape (within 20 percent). */
export function checkLogoImage(info: ImageInfo | null, bytes: number): { ok: boolean; error?: string } {
  if (!info) return { ok: false, error: "Use a JPG, PNG or WebP image" };
  if (bytes > LOGO_MAX_BYTES) return { ok: false, error: "Image must be 1 MB or smaller" };
  if (info.width < LOGO_MIN_PX || info.height < LOGO_MIN_PX) return { ok: false, error: `Image is too small. Minimum ${LOGO_MIN_PX}px` };
  if (Math.abs(info.width / info.height - 1) > 0.2) return { ok: false, error: "Logo must be roughly square" };
  return { ok: true };
}
