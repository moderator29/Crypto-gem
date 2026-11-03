export type ImageKind = "jpeg" | "png" | "webp";

export interface ImageInfo {
  kind: ImageKind;
  width: number;
  height: number;
}

/** Reads type and size from file bytes, never from the client-claimed content type. */
export function inspectImage(buf: Uint8Array): ImageInfo | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { kind: "png", width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { kind: "jpeg", height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      }
      i += 2 + dv.getUint16(i + 2);
    }
    return null;
  }
  const tag = (o: number, s: string) => [...s].every((c, k) => buf[o + k] === c.charCodeAt(0));
  if (buf.length > 30 && tag(0, "RIFF") && tag(8, "WEBP")) {
    if (tag(12, "VP8X")) return { kind: "webp", width: 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)), height: 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16)) };
    if (tag(12, "VP8 ")) return { kind: "webp", width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    if (tag(12, "VP8L")) {
      const b = dv.getUint32(21, true);
      return { kind: "webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

export interface CreativeCheck {
  ok: boolean;
  error?: string;
}

/** Accepts images within 15 percent of the recommended aspect ratio and at least half the recommended width. */
export function checkCreative(info: ImageInfo | null, bytes: number, rec: { w: number; h: number }, maxBytes = 2 * 1024 * 1024): CreativeCheck {
  if (!info) return { ok: false, error: "Use a JPG, PNG or WebP image" };
  if (bytes > maxBytes) return { ok: false, error: "Image must be 2 MB or smaller" };
  if (info.width < rec.w / 2) return { ok: false, error: `Image is too small. Minimum width ${Math.ceil(rec.w / 2)}px` };
  const ratio = info.width / info.height;
  const want = rec.w / rec.h;
  if (Math.abs(ratio - want) / want > 0.15) return { ok: false, error: `Wrong shape. Use about ${rec.w}x${rec.h}` };
  return { ok: true };
}
