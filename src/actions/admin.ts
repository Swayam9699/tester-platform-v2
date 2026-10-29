"use server";

import * as admin from "@/api/admin";
import { runDailyJob } from "@/api/cron";
import { getDb } from "@/db";
import { adminActionSchema } from "@/validation/admin";
import { parseForm, run, type ActionState } from "./utils";

export async function adminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const input = parseForm(adminActionSchema, fd);
    switch (input.action) {
      case "resolve":
      case "dismiss":
        return admin.resolveDispute(db, uid, input.disputeId, input.action === "resolve" ? "resolved" : "dismissed", input.resolution);
      case "ban":
        return admin.banUser(db, uid, input.userId, input.days, input.reason);
      case "unblock":
        return admin.unblockUser(db, uid, input.userId);
      case "rejectProof":
        return admin.rejectProof(db, uid, input.sideId);
      case "markSkipped":
        return admin.markSideSkipped(db, uid, input.sideId);
      case "clock":
        await admin.shiftClock(db, uid, input.days);
        return runDailyJob(db);
      case "cron":
        await admin.assertAdmin(db, uid);
        return runDailyJob(db);
    }
  }, "Done.");
}
