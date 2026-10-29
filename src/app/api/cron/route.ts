import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { demoMode } from "@/lib/config";
import { apiHandler, HttpError } from "@/api/handler";
import { runDailyJob } from "@/api/cron";

export const dynamic = "force-dynamic";

/** Daily job. Vercel Cron (vercel.json) or the Cloudflare cron trigger (worker.ts) calls this with `Authorization: Bearer $CRON_SECRET`. */
export const GET = apiHandler(async (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const authorized = secret ? request.headers.get("authorization") === `Bearer ${secret}` : demoMode;
  if (!authorized) throw new HttpError(401, "unauthorized");
  const summary = await runDailyJob(await getDb());
  return NextResponse.json(summary);
});
