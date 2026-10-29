import { and, count, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { apps, blocks, handshakeSides, handshakes, levels, notifications, settings, users, type User } from "@/db/schema";
import { demoMode, RULES } from "@/lib/config";
import { addDays, DAY_MS } from "@/lib/time";

export class AppError extends Error {}

export function fail(message: string): never {
  throw new AppError(message);
}

// ---------- settings + clock ----------

export async function getSetting<T>(db: DbOrTx, key: string): Promise<T | undefined> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value as T | undefined;
}

export async function setSetting(db: DbOrTx, key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Current time. In demo mode an admin can fast-forward the clock to walk through a 16-day campaign. */
export async function getNow(db: DbOrTx): Promise<Date> {
  if (!demoMode) return new Date();
  const offsetDays = (await getSetting<number>(db, "clock_offset_days")) ?? 0;
  return new Date(Date.now() + offsetDays * DAY_MS);
}

// ---------- notifications ----------

export async function notify(
  db: DbOrTx,
  userId: string,
  kind: string,
  title: string,
  body?: string,
  link?: string,
) {
  await db.insert(notifications).values({ userId, kind, title, body, link });
}

// ---------- users, levels, slots ----------

export async function getUser(db: DbOrTx, userId: string): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) fail("User not found.");
  return user;
}

export function isBlocked(user: Pick<User, "blockedUntil">, now: Date) {
  return Boolean(user.blockedUntil && user.blockedUntil > now);
}

export function assertCanHandshake(user: User, now: Date, who = "You") {
  if (isBlocked(user, now)) {
    const until = user.blockedUntil!.toISOString().slice(0, 10);
    fail(who === "You" ? `You're blocked from new handshakes until ${until}.` : `${who} is blocked from new handshakes.`);
  }
  if (!user.joinedGoogleGroup || user.deviceAndroidApi == null || user.playEmail == null) {
    fail(who === "You" ? "Finish onboarding first (Google Group + device version)." : `${who} hasn't finished onboarding.`);
  }
}

export async function slotLimit(db: DbOrTx, level: number) {
  const [row] = await db.select().from(levels).where(eq(levels.level, level));
  return row?.activeSlots ?? 12;
}

/** Highest level whose completion requirement is met. */
export async function levelForCompletions(db: DbOrTx, completed: number) {
  const [row] = await db
    .select({ level: levels.level })
    .from(levels)
    .where(lte(levels.completionsRequired, completed))
    .orderBy(desc(levels.level))
    .limit(1);
  return row?.level ?? 1;
}

/**
 * Handshakes occupying one of the user's slots: anything accepted or active, plus requests they sent
 * (so a user can't fan out more requests than they could honour). Friend tests don't use slots.
 */
export async function activeHandshakeCount(db: DbOrTx, userId: string, excludeHandshakeId?: string) {
  const [row] = await db
    .select({ n: count() })
    .from(handshakes)
    .where(
      and(
        eq(handshakes.kind, "exchange"),
        or(
          and(
            or(eq(handshakes.userAId, userId), eq(handshakes.userBId, userId)),
            inArray(handshakes.status, ["accepted", "active"]),
          ),
          and(eq(handshakes.userAId, userId), eq(handshakes.status, "requested")),
        ),
        excludeHandshakeId ? sql`${handshakes.id} <> ${excludeHandshakeId}` : undefined,
      ),
    );
  return row.n;
}

export async function assertFreeSlot(db: DbOrTx, user: User, excludeHandshakeId?: string, who = "You") {
  const [used, limit] = await Promise.all([
    activeHandshakeCount(db, user.id, excludeHandshakeId),
    slotLimit(db, user.level),
  ]);
  if (used >= limit) {
    fail(
      who === "You"
        ? `All ${limit} of your handshake slots are in use. Complete handshakes to level up.`
        : `${who} has no free handshake slots right now.`,
    );
  }
}

/** Testers occupying an app's slots: live sides of live handshakes, plus completed sides. */
export const liveSideCondition = or(
  eq(handshakeSides.status, "completed"),
  and(
    inArray(handshakeSides.status, ["pending", "joined", "active"]),
    inArray(handshakes.status, ["accepted", "active"]),
  ),
);

export async function usedTesterSlots(db: DbOrTx, appId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(handshakeSides)
    .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
    .where(and(eq(handshakeSides.appId, appId), liveSideCondition));
  return row.n;
}

/** Flip an app between open/full as testers come and go. Other statuses are left alone. */
export async function refreshAppStatus(db: DbOrTx, appId: string) {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId));
  if (!app || (app.status !== "open" && app.status !== "full")) return;
  const used = await usedTesterSlots(db, appId);
  const next = used >= app.testerSlots ? "full" : "open";
  if (next !== app.status) await db.update(apps).set({ status: next }).where(eq(apps.id, appId));
}

// ---------- rewards + penalties ----------

export async function rewardCompletion(db: DbOrTx, userId: string) {
  const user = await getUser(db, userId);
  const completed = user.completedHandshakes + 1;
  const level = Math.max(user.level, await levelForCompletions(db, completed));
  await db
    .update(users)
    .set({
      completedHandshakes: completed,
      reliabilityScore: Math.min(100, user.reliabilityScore + RULES.reliabilityReward),
      level,
    })
    .where(eq(users.id, userId));
  if (level > user.level) {
    const slots = await slotLimit(db, level);
    await notify(db, userId, "level_up", `You reached level ${level}!`, `You can now run ${slots} handshakes at once.`, "/profile");
  }
}

/** Skipping your half: block (longer for repeat offenders) and lower reliability. */
export async function penalize(db: DbOrTx, userId: string, handshakeId: string, reason: string, now: Date) {
  const user = await getUser(db, userId);
  const failed = user.failedHandshakes + 1;
  const days = Math.min(RULES.baseBlockDays * failed, RULES.maxBlockDays);
  const endsAt = addDays(now, days);
  const blockedUntil = user.blockedUntil && user.blockedUntil > endsAt ? user.blockedUntil : endsAt;
  await db
    .update(users)
    .set({
      failedHandshakes: failed,
      reliabilityScore: Math.max(0, user.reliabilityScore - RULES.reliabilityPenalty),
      blockedUntil,
    })
    .where(eq(users.id, userId));
  await db.insert(blocks).values({ userId, reason, handshakeId, startsAt: now, endsAt });
  await notify(
    db,
    userId,
    "blocked",
    `You're blocked from new handshakes for ${days} days`,
    `${reason} Your reliability score dropped by ${RULES.reliabilityPenalty}.`,
    "/profile",
  );
}
