import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { demoMode } from "@/lib/config";
import { runDailyJob } from "@/server/cron";

export const dynamic = "force-dynamic";

/** Daily job. Vercel Cron (vercel.json) or the Cloudflare cron trigger (worker.ts) calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret ? request.headers.get("authorization") === `Bearer ${secret}` : demoMode;
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runDailyJob(await getDb());
  return NextResponse.json(summary);
}
