import "server-only";
import { put } from "@vercel/blob";

export type StoredImageKind = "jpeg" | "png" | "webp";

const MIME: Record<StoredImageKind, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** True when Vercel Blob is connected (BLOB_READ_WRITE_TOKEN is set). */
export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Store an image publicly and return its full https URL. The content type comes from the validated bytes,
 * never from the client. Paths are unique per upload, so the name is kept exactly as given.
 */
export async function putImage(pathname: string, bytes: Uint8Array, kind: StoredImageKind): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Blob storage is not configured");
  const blob = await put(pathname, Buffer.from(bytes), { access: "public", addRandomSuffix: false, contentType: MIME[kind], token });
  return blob.url;
}
