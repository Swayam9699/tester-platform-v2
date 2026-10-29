import { and, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import type { Db } from "@/db";
import { apps, handshakeSides, handshakes, users } from "@/db/schema";
import { RULES } from "@/lib/config";
import { addDays, dayKey, DAY_MS, parseDay } from "@/lib/time";
import { getNow, getSetting, notify, refreshAppStatus, rewardCompletion, setSetting } from "./core";
import { breakHandshake } from "./handshakes";

export type CronSummary = {
  day: string;
  daysProcessed: number;
  expiredRequests: number;
  missedJoins: number;
  warnings: number;
  broken: number;
  completed: number;
};

/**
 * The daily job. Safe to run any number of times per day: missed-day counting is tracked per
 * calendar day in `settings.last_cron_day`, and every other step only acts on overdue rows.
 */
export async function runDailyJob(db: Db): Promise<CronSummary> {
  return db.transaction(async (tx) => {
    const now = await getNow(tx);
    const today = dayKey(now);
    const summary: CronSummary = { day: today, daysProcessed: 0, expiredRequests: 0, missedJoins: 0, warnings: 0, broken: 0, completed: 0 };

    // 1. Requests nobody answered within 48h.
    const expired = await tx
      .update(handshakes)
      .set({ status: "cancelled", endedReason: "Expired after 48h without a response" })
      .where(and(eq(handshakes.status, "requested"), lt(handshakes.deadlineAt, now)))
      .returning();
    for (const hs of expired) {
      await notify(tx, hs.userAId, "expired", "Your handshake request expired", "The developer didn't respond within 48 hours.", "/discover");
    }
    summary.expiredRequests = expired.length;

    // 2. Accepted handshakes where someone never opted in.
    const lateJoins = await tx
      .select()
      .from(handshakes)
      .where(and(eq(handshakes.status, "accepted"), lt(handshakes.deadlineAt, now)));
    for (const hs of lateJoins) {
      const sides = await tx.select().from(handshakeSides).where(eq(handshakeSides.handshakeId, hs.id));
      const skippers = sides.filter((s) => s.status === "pending").map((s) => s.id);
      await breakHandshake(tx, hs.id, skippers, `Didn't opt in within ${RULES.joinDeadlineHours} hours.`, now);
      summary.missedJoins += skippers.length;
    }

    // 3. Missed check-ins, one pass per calendar day since the last run.
    const lastDay = (await getSetting<string>(tx, "last_cron_day")) ?? dayKey(addDays(now, -1));
    for (let d = parseDay(lastDay).getTime() + DAY_MS; d <= parseDay(today).getTime(); d += DAY_MS) {
      const yesterday = dayKey(new Date(d - DAY_MS));
      const r = await processMissedDay(tx, yesterday, now);
      summary.warnings += r.warnings;
      summary.broken += r.broken;
      summary.daysProcessed++;
    }
    await setSetting(tx, "last_cron_day", today);

    // 4. Handshakes that reached their last day with no skip.
    const finished = await tx
      .select()
      .from(handshakes)
      .where(and(eq(handshakes.status, "active"), lte(handshakes.endsAt, now)));
    for (const hs of finished) {
      await tx.update(handshakes).set({ status: "completed" }).where(eq(handshakes.id, hs.id));
      const sides = await tx
        .update(handshakeSides)
        .set({ status: "completed" })
        .where(and(eq(handshakeSides.handshakeId, hs.id), eq(handshakeSides.status, "active")))
        .returning();
      for (const side of sides) {
        // Friend tests don't count toward levels or reliability, so friends can't farm completions.
        if (hs.kind === "exchange") await rewardCompletion(tx, side.testerId);
        await notify(
          tx,
          side.testerId,
          "completed",
          hs.kind === "friend" ? "Friend test completed 🎉" : "Handshake completed 🎉",
          "You've finished your testing period. You can uninstall the app now.",
          `/handshakes/${hs.id}`,
        );
      }
      if (hs.kind === "friend" && sides.length) {
        const [friend] = await tx.select({ name: users.name }).from(users).where(eq(users.id, hs.userAId));
        await notify(tx, hs.userBId, "completed", `${friend.name} finished testing your app 🎉`, undefined, "/friends?tab=history");
      }
      summary.completed++;
    }

    // 5. Keep open/full in sync with tester slots.
    const liveApps = await tx.select({ id: apps.id }).from(apps).where(inArray(apps.status, ["open", "full"]));
    for (const app of liveApps) await refreshAppStatus(tx, app.id);

    return summary;
  });
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function processMissedDay(tx: Tx, yesterday: string, now: Date) {
  let warnings = 0;
  let broken = 0;
  const rows = await tx
    .select({ side: handshakeSides, hs: handshakes })
    .from(handshakeSides)
    .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
    .where(
      and(
        eq(handshakes.status, "active"),
        eq(handshakes.kind, "exchange"), // check-ins are optional for friend testers
        eq(handshakeSides.status, "active"),
        or(isNull(handshakeSides.lastCheckinDate), lt(handshakeSides.lastCheckinDate, yesterday)),
      ),
    );

  const skippersByHandshake = new Map<string, string[]>();
  for (const { side, hs } of rows) {
    const startDay = dayKey(hs.startedAt!);
    const lastDay = dayKey(new Date(hs.endsAt!.getTime() - 1));
    // The start day is a grace day; days after the campaign don't count.
    if (yesterday <= startDay || yesterday > lastDay) continue;

    const streak = side.missedStreak + 1;
    await tx.update(handshakeSides).set({ missedStreak: streak }).where(eq(handshakeSides.id, side.id));
    if (streak >= RULES.skipAtMissedDays) {
      skippersByHandshake.set(hs.id, [...(skippersByHandshake.get(hs.id) ?? []), side.id]);
    } else if (streak === RULES.warnAtMissedDays) {
      warnings++;
      await notify(
        tx,
        side.testerId,
        "warning",
        `You've missed ${streak} check-ins in a row`,
        "Check in today. One more missed day breaks the handshake and blocks you from new ones.",
        `/handshakes/${hs.id}`,
      );
    }
  }

  for (const [handshakeId, skippers] of skippersByHandshake) {
    await breakHandshake(tx, handshakeId, skippers, `Missed ${RULES.skipAtMissedDays} daily check-ins in a row.`, now);
    broken++;
  }
  return { warnings, broken };
}
