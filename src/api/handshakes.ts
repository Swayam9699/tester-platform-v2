import { and, asc, eq, inArray, notInArray, or } from "drizzle-orm";
import type { Db, DbOrTx } from "@/db";
import { apps, dailyCheckins, disputes, feedback, handshakeSides, handshakes, newInviteCode, users } from "@/db/schema";
import { RULES } from "@/lib/config";
import { addDays, addHours, dayKey } from "@/lib/time";
import {
  assertCanHandshake,
  assertFreeSlot,
  fail,
  getNow,
  getUser,
  isBlocked,
  notify,
  penalize,
  refreshAppStatus,
  rewardCompletion,
  usedTesterSlots,
} from "./core";

const DEAD: ("rejected" | "cancelled")[] = ["rejected", "cancelled"];

/** True if `testerId` has (or had) a live handshake testing `appId`. */
export async function hasHandshakeTesting(db: DbOrTx, testerId: string, appId: string) {
  const [row] = await db
    .select({ id: handshakes.id })
    .from(handshakes)
    .where(
      and(
        or(
          and(eq(handshakes.userAId, testerId), eq(handshakes.appBId, appId)),
          and(eq(handshakes.userBId, testerId), eq(handshakes.appAId, appId)),
        ),
        notInArray(handshakes.status, DEAD),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function requestHandshake(
  db: Db,
  userId: string,
  input: { targetAppId: string; offeredAppId: string; message?: string },
) {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const me = await getUser(tx, userId);
    assertCanHandshake(me, now);

    const [target] = await tx.select().from(apps).where(eq(apps.id, input.targetAppId));
    if (!target) fail("App not found.");
    if (target.ownerId === me.id) fail("You can't test your own app.");
    if (target.status !== "open") fail("This app isn't accepting testers right now.");
    if (target.minAndroidApi > me.deviceAndroidApi!) fail("Your device's Android version is below this app's minimum.");

    const owner = await getUser(tx, target.ownerId);
    if (isBlocked(owner, now)) fail("This developer can't take new handshakes right now.");

    const [offered] = await tx.select().from(apps).where(eq(apps.id, input.offeredAppId));
    if (!offered || offered.ownerId !== me.id) fail("Pick one of your own apps to offer.");
    if (offered.status !== "open") fail(`${offered.name} isn't open for testers.`);
    if (owner.deviceAndroidApi == null || offered.minAndroidApi > owner.deviceAndroidApi) {
      fail(`${owner.name}'s device can't run ${offered.name} (minimum Android version too high).`);
    }

    if (await hasHandshakeTesting(tx, me.id, target.id)) fail("You already have a handshake for this app.");
    if (await hasHandshakeTesting(tx, owner.id, offered.id)) fail(`${owner.name} has already tested ${offered.name}.`);

    await assertFreeSlot(tx, me);

    const [hs] = await tx
      .insert(handshakes)
      .values({
        userAId: me.id,
        appAId: offered.id,
        userBId: owner.id,
        appBId: target.id,
        status: "requested",
        message: input.message?.trim() || null,
        requestedAt: now,
        deadlineAt: addHours(now, RULES.requestExpiryHours),
      })
      .returning();

    await notify(
      tx,
      owner.id,
      "request",
      `${me.name} wants to test ${target.name}`,
      `In return they'll have you test ${offered.name}. Expires in ${RULES.requestExpiryHours}h.`,
      "/requests",
    );
    return hs;
  });
}

/** Checks both users' free slots and both apps' free tester slots under row locks. */
export async function acceptHandshake(db: Db, userId: string, handshakeId: string) {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const [hs] = await tx.select().from(handshakes).where(eq(handshakes.id, handshakeId)).for("update");
    if (!hs || hs.userBId !== userId || !hs.appAId) fail("Request not found.");
    if (hs.status !== "requested") fail("This request is no longer pending.");
    if (hs.deadlineAt && hs.deadlineAt < now) fail("This request has expired.");
    const offeredAppId = hs.appAId;

    // Lock in a stable order so concurrent accepts can't deadlock.
    const lockedUsers = await tx
      .select()
      .from(users)
      .where(inArray(users.id, [hs.userAId, hs.userBId]))
      .orderBy(asc(users.id))
      .for("update");
    const lockedApps = await tx
      .select()
      .from(apps)
      .where(inArray(apps.id, [offeredAppId, hs.appBId]))
      .orderBy(asc(apps.id))
      .for("update");
    const requester = lockedUsers.find((u) => u.id === hs.userAId)!;
    const me = lockedUsers.find((u) => u.id === hs.userBId)!;

    assertCanHandshake(me, now);
    assertCanHandshake(requester, now, requester.name);
    await assertFreeSlot(tx, me);
    await assertFreeSlot(tx, requester, hs.id, requester.name);

    for (const app of lockedApps) {
      if (app.status !== "open") fail(`${app.name} is no longer open for testers.`);
      if ((await usedTesterSlots(tx, app.id)) >= app.testerSlots) fail(`${app.name} has no free tester slots.`);
    }

    await tx
      .update(handshakes)
      .set({ status: "accepted", acceptedAt: now, deadlineAt: addHours(now, RULES.joinDeadlineHours) })
      .where(eq(handshakes.id, hs.id));
    await tx.insert(handshakeSides).values([
      { handshakeId: hs.id, testerId: hs.userAId, appId: hs.appBId },
      { handshakeId: hs.id, testerId: hs.userBId, appId: offeredAppId },
    ]);
    for (const app of lockedApps) await refreshAppStatus(tx, app.id);

    const link = `/handshakes/${hs.id}`;
    const body = `Open the join link, opt in, and upload a screenshot of the "You're a tester" page within ${RULES.joinDeadlineHours}h.`;
    await notify(tx, requester.id, "accepted", `${me.name} accepted your handshake`, body, link);
    await notify(tx, me.id, "accepted", `Handshake with ${requester.name} accepted`, body, link);
  });
}

export async function rejectHandshake(db: Db, userId: string, handshakeId: string) {
  return db.transaction(async (tx) => {
    const [hs] = await tx.select().from(handshakes).where(eq(handshakes.id, handshakeId)).for("update");
    if (!hs || hs.userBId !== userId) fail("Request not found.");
    if (hs.status !== "requested") fail("This request is no longer pending.");
    await tx.update(handshakes).set({ status: "rejected", endedReason: "Declined" }).where(eq(handshakes.id, hs.id));
    const me = await getUser(tx, userId);
    await notify(tx, hs.userAId, "rejected", `${me.name} declined your handshake request`, undefined, "/discover");
  });
}

export async function cancelHandshake(db: Db, userId: string, handshakeId: string) {
  return db.transaction(async (tx) => {
    const [hs] = await tx.select().from(handshakes).where(eq(handshakes.id, handshakeId)).for("update");
    if (!hs || hs.userAId !== userId) fail("Request not found.");
    if (hs.status !== "requested") fail("Only pending requests can be withdrawn.");
    await tx.update(handshakes).set({ status: "cancelled", endedReason: "Withdrawn" }).where(eq(handshakes.id, hs.id));
  });
}

async function getMySide(tx: DbOrTx, userId: string, sideId: string) {
  const [row] = await tx
    .select({ side: handshakeSides, hs: handshakes })
    .from(handshakeSides)
    .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
    .where(eq(handshakeSides.id, sideId))
    .for("update");
  if (!row || row.side.testerId !== userId) fail("Handshake not found.");
  return row;
}

/** Tester uploaded the "You're a tester" screenshot. Starts the 16-day clock once both sides have. */
export async function submitOptinProof(db: Db, userId: string, sideId: string, proofUrl: string) {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const { side, hs } = await getMySide(tx, userId, sideId);
    if (hs.status !== "accepted") fail("Opt-in proof isn't needed for this handshake.");
    if (hs.deadlineAt && hs.deadlineAt < now) fail("The opt-in deadline has passed.");
    if (side.status !== "pending") fail("You've already submitted your opt-in proof.");

    await tx
      .update(handshakeSides)
      .set({ status: "joined", joinedAt: now, optinProofUrl: proofUrl, proofRejected: false })
      .where(eq(handshakeSides.id, side.id));

    const sides = await tx.select().from(handshakeSides).where(eq(handshakeSides.handshakeId, hs.id));
    // Friend tests have no partner side, so the clock starts as soon as the friend opts in.
    const partner = sides.find((s) => s.id !== side.id);
    const me = await getUser(tx, userId);

    if (!partner || partner.status === "joined") {
      const appIds = [hs.appAId, hs.appBId].filter((id): id is string => id != null);
      const testedApps = await tx.select().from(apps).where(inArray(apps.id, appIds));
      const duration = Math.max(...testedApps.map((a) => a.durationDays), RULES.durationDays);
      const endsAt = addDays(now, duration);
      await tx
        .update(handshakes)
        .set({ status: "active", startedAt: now, endsAt, deadlineAt: null })
        .where(eq(handshakes.id, hs.id));
      await tx.update(handshakeSides).set({ status: "active" }).where(eq(handshakeSides.handshakeId, hs.id));
      if (!partner) {
        const [app] = testedApps;
        await notify(tx, me.id, "started", `You're testing ${app.name} — day 1 of ${duration}`, "Keep the app installed and open it now and then.", `/handshakes/${hs.id}`);
        await notify(tx, hs.userBId, "partner_joined", `${me.name} opted in to ${app.name}`, `Their ${duration} days have started.`, "/friends");
        return;
      }
      for (const uid of [hs.userAId, hs.userBId]) {
        await notify(
          tx,
          uid,
          "started",
          "Your handshake is live — day 1 of " + duration,
          "Open the app and check in every day. Missing 3 days in a row breaks the handshake.",
          `/handshakes/${hs.id}`,
        );
      }
    } else {
      await notify(tx, partner.testerId, "partner_joined", `${me.name} opted in to your app`, undefined, `/handshakes/${hs.id}`);
    }
  });
}

/** "Opened today." One per side per calendar day. */
export async function checkIn(db: Db, userId: string, sideId: string, input: { note?: string; proofUrl?: string } = {}) {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const { side, hs } = await getMySide(tx, userId, sideId);
    if (hs.status !== "active" || side.status !== "active") {
      fail(hs.kind === "friend" ? "Check-ins open once you've opted in." : "Check-ins open once both testers have joined.");
    }
    const today = dayKey(now);
    if (side.lastCheckinDate === today) fail("You've already checked in today.");

    await tx
      .insert(dailyCheckins)
      .values({ sideId: side.id, date: today, note: input.note?.trim() || null, proofUrl: input.proofUrl || null })
      .onConflictDoNothing();
    await tx
      .update(handshakeSides)
      .set({ lastCheckinDate: today, checkinCount: side.checkinCount + 1, missedStreak: 0 })
      .where(eq(handshakeSides.id, side.id));
  });
}

export async function submitFeedback(
  db: Db,
  userId: string,
  sideId: string,
  input: { rating: number; bugs?: string; comments?: string },
) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) fail("Rating must be 1–5.");
  return db.transaction(async (tx) => {
    const { side } = await getMySide(tx, userId, sideId);
    if (side.status === "pending") fail("Join the test before leaving feedback.");
    const values = { rating: input.rating, bugs: input.bugs?.trim() || null, comments: input.comments?.trim() || null };
    await tx
      .insert(feedback)
      .values({ sideId: side.id, ...values })
      .onConflictDoUpdate({ target: feedback.sideId, set: values });
    const [app] = await tx.select().from(apps).where(eq(apps.id, side.appId));
    const me = await getUser(tx, userId);
    await notify(tx, app.ownerId, "feedback", `New ${input.rating}★ feedback on ${app.name}`, `From ${me.name}`, `/apps/${app.id}`);
  });
}

export async function reportIssue(db: Db, userId: string, handshakeId: string, reason: string) {
  if (reason.trim().length < 10) fail("Please describe the problem (at least 10 characters).");
  const [hs] = await db.select().from(handshakes).where(eq(handshakes.id, handshakeId));
  if (!hs || (hs.userAId !== userId && hs.userBId !== userId)) fail("Handshake not found.");
  await db.insert(disputes).values({ reporterId: userId, handshakeId, reason: reason.trim() });
}

/**
 * End a handshake because one or both sides skipped. Skippers are penalized; an innocent side that was
 * actively testing keeps its completion credit, and its own app is boosted in Discover to find a replacement.
 */
export async function breakHandshake(db: DbOrTx, handshakeId: string, skipperSideIds: string[], reason: string, now: Date) {
  const [hs] = await db.select().from(handshakes).where(eq(handshakes.id, handshakeId));
  if (!hs || !["accepted", "active"].includes(hs.status)) return;
  // Friends are doing the owner a favour: no blocks or reliability penalties, the test just ends.
  if (hs.kind === "friend") return endFriendTest(db, hs, reason);
  const sides = await db.select().from(handshakeSides).where(eq(handshakeSides.handshakeId, hs.id));

  await db.update(handshakes).set({ status: "broken", endedReason: reason, deadlineAt: null }).where(eq(handshakes.id, hs.id));

  for (const side of sides) {
    if (skipperSideIds.includes(side.id)) {
      await db.update(handshakeSides).set({ status: "skipped" }).where(eq(handshakeSides.id, side.id));
      await penalize(db, side.testerId, hs.id, reason, now);
      // The app the skipper was supposed to test lost a tester.
      await db.update(apps).set({ priorityUntil: addDays(now, RULES.priorityDays) }).where(eq(apps.id, side.appId));
      const partner = sides.find((s) => s.id !== side.id)!;
      if (!skipperSideIds.includes(partner.id)) {
        await notify(
          db,
          partner.testerId,
          "partner_skipped",
          "Your handshake partner dropped out",
          hs.status === "active"
            ? "You keep full completion credit, and your app is boosted in Discover to find a replacement tester."
            : "No penalty for you. Your app is boosted in Discover to find a replacement tester.",
          `/handshakes/${hs.id}`,
        );
      }
    } else if (hs.status === "active" && side.status === "active") {
      await db.update(handshakeSides).set({ status: "completed" }).where(eq(handshakeSides.id, side.id));
      await rewardCompletion(db, side.testerId);
    }
  }
  await refreshAppStatus(db, hs.appAId!);
  await refreshAppStatus(db, hs.appBId);
}

// ---------- friend tests ----------

/** A friend opened the owner's invite link and joins as a one-way tester. */
export async function joinAsFriend(db: Db, userId: string, inviteCode: string) {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const [app] = await tx.select().from(apps).where(eq(apps.inviteCode, inviteCode)).for("update");
    if (!app) fail("This invite link is no longer valid. Ask for a new one.");
    if (app.ownerId === userId) fail("This is your own app. Share the link with a friend.");
    if (app.status !== "open") fail(`${app.name} isn't taking testers right now.`);

    const me = await getUser(tx, userId);
    if (!me.joinedGoogleGroup || me.deviceAndroidApi == null || me.playEmail == null) {
      fail("Finish setup first (Google Group, Play email and device version).");
    }
    if (app.minAndroidApi > me.deviceAndroidApi) fail("Your phone's Android version is below this app's minimum.");
    if (await hasHandshakeTesting(tx, me.id, app.id)) fail(`You're already testing ${app.name}.`);
    if ((await usedTesterSlots(tx, app.id)) >= app.testerSlots) fail(`${app.name} has no free tester slots.`);

    const [hs] = await tx
      .insert(handshakes)
      .values({
        kind: "friend",
        userAId: me.id,
        userBId: app.ownerId,
        appBId: app.id,
        status: "accepted",
        requestedAt: now,
        acceptedAt: now,
        deadlineAt: addHours(now, RULES.joinDeadlineHours),
      })
      .returning();
    await tx.insert(handshakeSides).values({ handshakeId: hs.id, testerId: me.id, appId: app.id });
    await refreshAppStatus(tx, app.id);
    await notify(tx, app.ownerId, "friend_joined", `${me.name} is testing ${app.name} as a friend`, "They still need to opt in on Google Play.", "/friends");
    return hs;
  });
}

/** The friend stops testing, or the owner removes them. Frees the tester slot. */
export async function leaveFriendTest(db: Db, userId: string, handshakeId: string) {
  return db.transaction(async (tx) => {
    const [hs] = await tx.select().from(handshakes).where(eq(handshakes.id, handshakeId)).for("update");
    if (!hs || hs.kind !== "friend" || (hs.userAId !== userId && hs.userBId !== userId)) fail("Friend test not found.");
    if (hs.status !== "accepted" && hs.status !== "active") fail("This friend test has already ended.");
    const me = await getUser(tx, userId);
    await endFriendTest(tx, hs, hs.userAId === userId ? `${me.name} stopped testing.` : `Removed by ${me.name}.`);
  });
}

async function endFriendTest(db: DbOrTx, hs: typeof handshakes.$inferSelect, reason: string) {
  await db.update(handshakes).set({ status: "cancelled", endedReason: reason, deadlineAt: null }).where(eq(handshakes.id, hs.id));
  await refreshAppStatus(db, hs.appBId);
  const [app] = await db.select().from(apps).where(eq(apps.id, hs.appBId));
  await notify(db, hs.userAId, "friend_ended", `Your friend test of ${app.name} ended`, reason, "/friends?tab=history");
  await notify(db, hs.userBId, "friend_ended", `A friend tester left ${app.name}`, reason, "/friends?tab=history");
}

export async function resetInviteCode(db: Db, userId: string, appId: string) {
  const [app] = await db
    .update(apps)
    .set({ inviteCode: newInviteCode() })
    .where(and(eq(apps.id, appId), eq(apps.ownerId, userId)))
    .returning();
  if (!app) fail("App not found.");
}
