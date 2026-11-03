import { randomUUID } from "node:crypto";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { inspectImage } from "@/lib/ads/image";
import { LOGO_BUCKET, checkLogoImage } from "@/lib/logo";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const EXT = { jpeg: "jpg", png: "png", webp: "webp" } as const;
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/** Accepts one logo image as multipart form data, validates the real bytes and stores it publicly. */
export async function POST(req: Request) {
  const rl = rateLimit(`logo:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many uploads. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to upload a logo." }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "Uploads are not live yet. Server storage is not configured." }, { status: 503 });

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

  const path = `${user.id}/${randomUUID()}.${EXT[info.kind]}`;
  const db = supabaseAdmin();
  const { error } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: MIME[info.kind], upsert: false });
  if (error) return Response.json({ error: "Could not store the image." }, { status: 502 });
  const { data } = db.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
