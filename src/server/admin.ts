import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { blocks, disputes, handshakeSides, handshakes, users } from "@/db/schema";
import { demoMode } from "@/lib/config";
import { addDays, dayKey } from "@/lib/time";
import { fail, getNow, getSetting, getUser, notify, setSetting } from "./core";
import { breakHandshake } from "./handshakes";

export async function assertAdmin(db: Db, userId: string) {
  const user = await getUser(db, userId);
  if (!user.isAdmin) fail("Admins only.");
  return user;
}

export async function resolveDispute(db: Db, adminId: string, disputeId: string, status: "resolved" | "dismissed", resolution: string) {
  await assertAdmin(db, adminId);
  const [d] = await db.update(disputes).set({ status, resolution: resolution.trim() || null }).where(eq(disputes.id, disputeId)).returning();
  if (!d) fail("Dispute not found.");
  await notify(db, d.reporterId, "dispute", `Your report was ${status}`, resolution.trim() || undefined, `/handshakes/${d.handshakeId}`);
}

export async function banUser(db: Db, adminId: string, userId: string, days: number, reason: string) {
  await assertAdmin(db, adminId);
  if (!(days > 0)) fail("Ban length must be positive.");
  const now = await getNow(db);
  const endsAt = addDays(now, days);
  await db.update(users).set({ blockedUntil: endsAt }).where(eq(users.id, userId));
  await db.insert(blocks).values({ userId, reason: reason.trim() || "Banned by an admin", startsAt: now, endsAt });
  await notify(db, userId, "blocked", `An admin blocked you for ${days} days`, reason.trim() || undefined, "/profile");
}

export async function unblockUser(db: Db, adminId: string, userId: string) {
  await assertAdmin(db, adminId);
  await db.update(users).set({ blockedUntil: null }).where(eq(users.id, userId));
  await notify(db, userId, "unblocked", "Your block was lifted", undefined, "/profile");
}

/** Bad opt-in screenshot before the clock started: send the tester back to re-upload. */
export async function rejectProof(db: Db, adminId: string, sideId: string) {
  await assertAdmin(db, adminId);
  const [row] = await db
    .select({ side: handshakeSides, hs: handshakes })
    .from(handshakeSides)
    .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
    .where(eq(handshakeSides.id, sideId));
  if (!row) fail("Not found.");
  if (row.hs.status !== "accepted" || row.side.status !== "joined") fail("Only proofs on handshakes that haven't started can be sent back.");
  await db
    .update(handshakeSides)
    .set({ status: "pending", joinedAt: null, proofRejected: true })
    .where(eq(handshakeSides.id, sideId));
  await notify(db, row.side.testerId, "proof_rejected", "Your opt-in screenshot was rejected", "Upload a clear screenshot of the \"You're a tester\" page.", `/handshakes/${row.hs.id}`);
}

/** Admin ruling that a tester didn't do their part (e.g. fake proof on a live handshake). */
export async function markSideSkipped(db: Db, adminId: string, sideId: string) {
  await assertAdmin(db, adminId);
  const [side] = await db.select().from(handshakeSides).where(eq(handshakeSides.id, sideId));
  if (!side) fail("Not found.");
  await db.transaction(async (tx) => {
    await breakHandshake(tx, side.handshakeId, [side.id], "An admin found you didn't complete your side of the handshake.", await getNow(tx));
  });
}

export async function shiftClock(db: Db, adminId: string, days: number) {
  await assertAdmin(db, adminId);
  if (!demoMode) fail("The clock can only be changed in demo mode.");
  const current = (await getSetting<number>(db, "clock_offset_days")) ?? 0;
  await setSetting(db, "clock_offset_days", days === 0 ? 0 : current + days);
  // Going back in time: treat the real today as already processed so no day is counted twice.
  if (days === 0) await setSetting(db, "last_cron_day", dayKey(new Date()));
}
