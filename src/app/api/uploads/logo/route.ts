import { randomUUID } from "node:crypto";
import { userFromRequest } from "@/lib/db";
import { inspectImage } from "@/lib/ads/image";
import { LOGO_PREFIX, checkLogoImage } from "@/lib/logo";
import { putImage, storageConfigured } from "@/lib/storage";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const EXT = { jpeg: "jpg", png: "png", webp: "webp" } as const;

/** Accepts one logo image as multipart form data, validates the real bytes and stores it publicly on Vercel Blob. */
export async function POST(req: Request) {
  const rl = rateLimit(`logo:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many uploads. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to upload a logo." }, { status: 401 });
  if (!storageConfigured()) return Response.json({ error: "Uploads are not live yet. Server storage is not configured." }, { status: 503 });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ error: "Send the image as multipart form data." }, { status: 400 });
  }
  if (!file || typeof file === "string") return Response.json({ error: "No file received." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspectImage(bytes);
  const check = checkLogoImage(info, bytes.length);
  if (!check.ok || !info) return Response.json({ error: check.error ?? "Invalid image" }, { status: 422 });

  const path = `${LOGO_PREFIX}/${user.id}/${randomUUID()}.${EXT[info.kind]}`;
  try {
    return Response.json({ url: await putImage(path, bytes, info.kind) });
  } catch {
    return Response.json({ error: "Could not store the image." }, { status: 502 });
  }
}
