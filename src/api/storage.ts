import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { demoMode } from "@/lib/config";
import { fail } from "./core";

const MAX_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

/** Stores an uploaded screenshot and returns a URL to it. Supabase Storage when configured, local disk otherwise. */
export async function saveScreenshot(file: File | null, folder: string): Promise<string> {
  if (!file || file.size === 0) fail("Attach a screenshot.");
  const ext = TYPES[file.type];
  if (!ext) fail("Screenshots must be PNG, JPG or WebP.");
  if (file.size > MAX_BYTES) fail("Screenshots must be under 4 MB.");
  const name = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The secret key (sb_secret_…) or, for older projects, the legacy service_role key.
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const bucket = process.env.SUPABASE_PROOF_BUCKET || "proofs";
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const key = `${folder}/${name}`;
    const { error } = await supabase.storage.from(bucket).upload(key, bytes, { contentType: file.type });
    if (error) fail(`Upload failed: ${error.message}`);
    return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
  }

  // Local disk only works on your own machine; hosted deployments (e.g. Cloudflare) have no writable disk.
  if (!demoMode) fail("Screenshot storage isn't set up. Add SUPABASE_SECRET_KEY to the deployment.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `/api/uploads/${name}`;
}
