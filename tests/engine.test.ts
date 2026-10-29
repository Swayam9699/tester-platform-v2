process.env.PGLITE_DIR = "memory://";
process.env.SEED_DEMO = "false";

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { apps, handshakeSides, handshakes, users } from "@/db/schema";
import { saveApp } from "@/server/apps";
import { activeHandshakeCount, getSetting, setSetting, usedTesterSlots } from "@/server/core";
import { runDailyJob } from "@/server/cron";
import {
  acceptHandshake,
  checkIn,
  joinAsFriend,
  leaveFriendTest,
  requestHandshake,
  resetInviteCode,
  submitOptinProof,
} from "@/server/handshakes";
import { isOnboarded } from "@/server/auth";
import { listMySides } from "@/server/queries";
import { completeOnboarding, upsertUserByEmail } from "@/server/users";

let db: Db;
let seq = 0;

async function makeUser(api = 34) {
  const u = await upsertUserByEmail(db, { email: `user${++seq}@test.dev`, name: `User ${seq}` });
  await completeOnboarding(db, u.id, { deviceAndroidApi: api, joinedGoogleGroup: true, playEmail: u.googleEmail });
  return u;
}

async function makeApp(ownerId: string, minApi = 26) {
  return saveApp(
    db,
    ownerId,
    {
      name: `App ${++seq}`,
      testingLink: `https://play.google.com/apps/testing/com.test.app${seq}`,
      minAndroidApi: minApi,
      groupAddedConfirmed: true,
      countriesAllConfirmed: true,
      releaseSentConfirmed: true,
    },
    { publish: true },
  );
}

async function advanceDays(days: number) {
  const current = (await getSetting<number>(db, "clock_offset_days")) ?? 0;
  await setSetting(db, "clock_offset_days", current + days);
}

async function sides(handshakeId: string) {
  return db.select().from(handshakeSides).where(eq(handshakeSides.handshakeId, handshakeId));
}

async function pair() {
  const a = await makeUser();
  const b = await makeUser();
  const appA = await makeApp(a.id);
  const appB = await makeApp(b.id);
  const hs = await requestHandshake(db, a.id, { targetAppId: appB, offeredAppId: appA });
  await acceptHandshake(db, b.id, hs.id);
  const [sa, sb] = await Promise.all([
    db.select().from(handshakeSides).where(and(eq(handshakeSides.handshakeId, hs.id), eq(handshakeSides.testerId, a.id))),
    db.select().from(handshakeSides).where(and(eq(handshakeSides.handshakeId, hs.id), eq(handshakeSides.testerId, b.id))),
  ]);
  return { a, b, appA, appB, hs, sideA: sa[0], sideB: sb[0] };
}

before(async () => {
  db = await getDb();
});

describe("handshake rules", () => {
  test("accept creates two sides and both proofs start the 16-day clock", async () => {
    const { hs, a, b, sideA, sideB } = await pair();
    assert.equal((await sides(hs.id)).length, 2);
    await submitOptinProof(db, a.id, sideA.id, "/proof-a.png");
    let [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(row.status, "accepted");
    await submitOptinProof(db, b.id, sideB.id, "/proof-b.png");
    [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(row.status, "active");
    assert.equal(Math.round((row.endsAt!.getTime() - row.startedAt!.getTime()) / 86_400_000), 16);
  });

  test("my sides show the partner's status and today's check-in", async () => {
    const { hs, a, b, sideA, sideB } = await pair();
    let [mine] = await listMySides(db, a.id);
    assert.equal(mine.partnerSideStatus, "pending");
    await submitOptinProof(db, a.id, sideA.id, "/a.png");
    await submitOptinProof(db, b.id, sideB.id, "/b.png");
    await checkIn(db, b.id, sideB.id);
    [mine] = (await listMySides(db, a.id)).filter((s) => s.handshakeId === hs.id);
    assert.equal(mine.partnerSideStatus, "active");
    assert.equal(mine.partnerCheckedToday, true);
    assert.equal(mine.checkedToday, false);
  });

  test("duplicate request for the same app is refused", async () => {
    const { a, appA, appB } = await pair();
    await assert.rejects(requestHandshake(db, a.id, { targetAppId: appB, offeredAppId: appA }), /already/);
  });

  test("matching filter: device below the app's minimum Android version", async () => {
    const oldPhone = await makeUser(26);
    const dev = await makeUser(34);
    const target = await makeApp(dev.id, 30);
    const offered = await makeApp(oldPhone.id, 26);
    await assert.rejects(
      requestHandshake(db, oldPhone.id, { targetAppId: target, offeredAppId: offered }),
      /Android version/,
    );
  });

  test("offered app must run on the target owner's device", async () => {
    const me = await makeUser(36);
    const owner = await makeUser(28);
    const target = await makeApp(owner.id, 26);
    const offered = await makeApp(me.id, 33);
    await assert.rejects(requestHandshake(db, me.id, { targetAppId: target, offeredAppId: offered }), /can't run/);
  });

  test("level slot limit caps outgoing requests (level 1 = 12)", async () => {
    const me = await makeUser();
    const offered = await makeApp(me.id);
    for (let i = 0; i < 12; i++) {
      const owner = await makeUser();
      await requestHandshake(db, me.id, { targetAppId: await makeApp(owner.id), offeredAppId: offered });
    }
    const owner = await makeUser();
    await assert.rejects(
      requestHandshake(db, me.id, { targetAppId: await makeApp(owner.id), offeredAppId: offered }),
      /slots/,
    );
  });

  test("app with 16 testers becomes full and leaves Discover", async () => {
    const owner = await makeUser();
    const target = await makeApp(owner.id);
    // Level 1 owner only has 12 slots; raise it so tester slots are the binding limit.
    await db.update(users).set({ level: 5 }).where(eq(users.id, owner.id));
    for (let i = 0; i < 16; i++) {
      const t = await makeUser();
      const hs = await requestHandshake(db, t.id, { targetAppId: target, offeredAppId: await makeApp(t.id) });
      await acceptHandshake(db, owner.id, hs.id);
    }
    const [app] = await db.select().from(apps).where(eq(apps.id, target));
    assert.equal(app.status, "full");
  });

  test("3 missed check-ins break the handshake, block the skipper, credit the partner", async () => {
    const { hs, a, b, appA, sideA, sideB } = await pair();
    await submitOptinProof(db, a.id, sideA.id, "/a.png");
    await submitOptinProof(db, b.id, sideB.id, "/b.png");
    await runDailyJob(db);

    for (let day = 1; day <= 4; day++) {
      await advanceDays(1);
      await runDailyJob(db);
      const [hsRow] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
      if (hsRow.status !== "active") break;
      await checkIn(db, a.id, sideA.id); // A is diligent, B never checks in
    }

    const [hsRow] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(hsRow.status, "broken");
    const s = await sides(hs.id);
    assert.equal(s.find((x) => x.testerId === b.id)!.status, "skipped");
    assert.equal(s.find((x) => x.testerId === a.id)!.status, "completed");

    const [ua] = await db.select().from(users).where(eq(users.id, a.id));
    const [ub] = await db.select().from(users).where(eq(users.id, b.id));
    assert.equal(ua.completedHandshakes, 1);
    assert.equal(ub.failedHandshakes, 1);
    assert.ok(ub.blockedUntil && ub.reliabilityScore < 100);
    const [boosted] = await db.select().from(apps).where(eq(apps.id, appA));
    assert.ok(boosted.priorityUntil, "innocent side's app is boosted to find a replacement");
  });

  test("16 days of check-ins complete the handshake for both", async () => {
    const { hs, a, b, sideA, sideB } = await pair();
    await submitOptinProof(db, a.id, sideA.id, "/a.png");
    await submitOptinProof(db, b.id, sideB.id, "/b.png");
    for (let day = 0; day <= 16; day++) {
      const [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
      if (row.status === "active") {
        await checkIn(db, a.id, sideA.id);
        await checkIn(db, b.id, sideB.id);
        await assert.rejects(checkIn(db, a.id, sideA.id), /already checked in/);
      }
      await advanceDays(1);
      await runDailyJob(db);
    }
    const [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(row.status, "completed");
    const s = await sides(hs.id);
    assert.ok(s.every((x) => x.status === "completed"));
  });

  test("unanswered requests expire after 48h; unjoined accepts break after 48h", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const appA = await makeApp(a.id);
    const appB = await makeApp(b.id);
    const req = await requestHandshake(db, a.id, { targetAppId: appB, offeredAppId: appA });

    const { hs, a: a2, b: b2, sideA } = await pair();
    await submitOptinProof(db, a2.id, sideA.id, "/a.png");

    await advanceDays(3);
    await runDailyJob(db);
    const [r1] = await db.select().from(handshakes).where(eq(handshakes.id, req.id));
    const [r2] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(r1.status, "cancelled");
    assert.equal(r2.status, "broken");
    const [ub] = await db.select().from(users).where(eq(users.id, b2.id));
    const [ua] = await db.select().from(users).where(eq(users.id, a2.id));
    assert.equal(ub.failedHandshakes, 1, "the side that never opted in is penalized");
    assert.equal(ua.failedHandshakes, 0);
  });
});

describe("friend tests", () => {
  async function invite() {
    const owner = await makeUser();
    const appId = await makeApp(owner.id);
    const [app] = await db.select().from(apps).where(eq(apps.id, appId));
    return { owner, app };
  }

  async function friendSide(handshakeId: string) {
    const [side] = await sides(handshakeId);
    return side;
  }

  test("a friend joins by link: one side, a tester slot, no handshake slots, clock starts on their proof", async () => {
    const { owner, app } = await invite();
    const friend = await makeUser();
    const hs = await joinAsFriend(db, friend.id, app.inviteCode);
    assert.equal(hs.kind, "friend");
    assert.equal(hs.appAId, null);
    assert.equal((await sides(hs.id)).length, 1);
    assert.equal(await usedTesterSlots(db, app.id), 1);
    assert.equal(await activeHandshakeCount(db, friend.id), 0);
    assert.equal(await activeHandshakeCount(db, owner.id), 0);

    await submitOptinProof(db, friend.id, (await friendSide(hs.id)).id, "/f.png");
    const [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(row.status, "active");
  });

  test("owners can't join their own app, friends can't join twice, reset links stop working", async () => {
    const { owner, app } = await invite();
    const friend = await makeUser();
    await assert.rejects(joinAsFriend(db, owner.id, app.inviteCode), /your own app/);
    await joinAsFriend(db, friend.id, app.inviteCode);
    await assert.rejects(joinAsFriend(db, friend.id, app.inviteCode), /already testing/);
    await resetInviteCode(db, owner.id, app.id);
    await assert.rejects(joinAsFriend(db, (await makeUser()).id, app.inviteCode), /no longer valid/);
  });

  test("missed check-ins never break a friend test, and completion gives no level credit", async () => {
    const { owner, app } = await invite();
    const friend = await makeUser();
    const hs = await joinAsFriend(db, friend.id, app.inviteCode);
    await submitOptinProof(db, friend.id, (await friendSide(hs.id)).id, "/f.png");
    for (let day = 0; day <= 16; day++) {
      await advanceDays(1);
      await runDailyJob(db);
    }
    const [row] = await db.select().from(handshakes).where(eq(handshakes.id, hs.id));
    assert.equal(row.status, "completed");
    assert.equal((await friendSide(hs.id)).status, "completed");
    const [f] = await db.select().from(users).where(eq(users.id, friend.id));
    assert.equal(f.completedHandshakes, 0);
    assert.equal(f.failedHandshakes, 0);
    assert.equal(await usedTesterSlots(db, app.id), 1, "a completed friend still counts toward the app's testers");
    const [o] = await db.select().from(users).where(eq(users.id, owner.id));
    assert.equal(o.completedHandshakes, 0);
  });

  test("not opting in within 48h ends the friend test without a penalty; leaving frees the slot", async () => {
    const { owner, app } = await invite();
    const late = await makeUser();
    const lateHs = await joinAsFriend(db, late.id, app.inviteCode);
    const leaver = await makeUser();
    const leaveHs = await joinAsFriend(db, leaver.id, app.inviteCode);
    assert.equal(await usedTesterSlots(db, app.id), 2);

    await leaveFriendTest(db, owner.id, leaveHs.id); // the owner removes them
    assert.equal(await usedTesterSlots(db, app.id), 1);

    await advanceDays(3);
    await runDailyJob(db);
    const [row] = await db.select().from(handshakes).where(eq(handshakes.id, lateHs.id));
    assert.equal(row.status, "cancelled");
    const [u] = await db.select().from(users).where(eq(users.id, late.id));
    assert.equal(u.failedHandshakes, 0);
    assert.equal(u.blockedUntil, null);
    assert.equal(await usedTesterSlots(db, app.id), 0);
  });
});

describe("sign-in and the Google Play email", () => {
  test("Google sign-ins use their account as the Play email; email-code sign-ins must give one", async () => {
    const viaGoogle = await upsertUserByEmail(db, { email: `G${++seq}@Gmail.com`, name: "G", provider: "google" });
    assert.equal(viaGoogle.playEmail, viaGoogle.googleEmail);

    const viaEmail = await upsertUserByEmail(db, { email: `work${++seq}@company.dev`, name: "E", provider: "email" });
    assert.equal(viaEmail.playEmail, null);
    await assert.rejects(
      completeOnboarding(db, viaEmail.id, { deviceAndroidApi: 34, joinedGoogleGroup: true, playEmail: "not-an-email" }),
      /Google account email/,
    );
    await completeOnboarding(db, viaEmail.id, { deviceAndroidApi: 34, joinedGoogleGroup: true, playEmail: " Me@Gmail.com " });
    const [row] = await db.select().from(users).where(eq(users.id, viaEmail.id));
    assert.equal(row.playEmail, "me@gmail.com");
    assert.equal(row.googleEmail, viaEmail.googleEmail, "the sign-in email is unchanged");
    assert.ok(isOnboarded(row));
  });
});
