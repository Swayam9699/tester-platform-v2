import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { UPLOAD_DIR } from "@/server/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Serves locally stored screenshots (demo mode). Signed-in users only. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getSessionUser())) return new NextResponse("Unauthorized", { status: 401 });
  const { name } = await params;
  const match = name.match(/^[0-9a-f-]{36}\.(png|jpg|webp)$/);
  if (!match) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(bytes, { headers: { "content-type": TYPES[match[1]], "cache-control": "private, max-age=86400" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
