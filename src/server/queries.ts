import { aliasedTable, and, asc, count, desc, eq, ilike, inArray, isNull, lte, ne, notExists, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  apps,
  blocks,
  dailyCheckins,
  disputes,
  feedback,
  handshakeSides,
  handshakes,
  levels,
  notifications,
  users,
  type App,
  type User,
} from "@/db/schema";
import { cache } from "react";
import { demoMode } from "@/lib/config";
import { dayKey, daysBetween } from "@/lib/time";
import { activeHandshakeCount, getNow, getSetting, isBlocked, liveSideCondition, slotLimit } from "./core";

export type SlotBreakdown = { pending: number; active: number; completed: number; used: number };

const emptySlots = (): SlotBreakdown => ({ pending: 0, active: 0, completed: 0, used: 0 });

/** Tester-slot usage per app, for the given apps or for every app owned by `ownerId`. */
export async function slotBreakdown(db: Db, target: string[] | { ownerId: string }) {
  const map = new Map<string, SlotBreakdown>();
  if (Array.isArray(target) && !target.length) return map;
  const rows = await db
    .select({ appId: handshakeSides.appId, status: handshakeSides.status, n: count() })
    .from(handshakeSides)
    .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
    .innerJoin(apps, eq(apps.id, handshakeSides.appId))
    .where(and(Array.isArray(target) ? inArray(handshakeSides.appId, target) : eq(apps.ownerId, target.ownerId), liveSideCondition))
    .groupBy(handshakeSides.appId, handshakeSides.status);
  for (const r of rows) {
    const b = map.get(r.appId) ?? emptySlots();
    if (r.status === "completed") b.completed += r.n;
    else if (r.status === "active") b.active += r.n;
    else b.pending += r.n;
    b.used += r.n;
    map.set(r.appId, b);
  }
  return map;
}

// ---------- my sides (the apps I'm testing) ----------

export type MySide = {
  sideId: string;
  handshakeId: string;
  kind: "exchange" | "friend";
  hsStatus: string;
  sideStatus: string;
  app: Pick<App, "id" | "name" | "logoUrl" | "packageName" | "joinWebLink" | "joinAndroidLink">;
  partner: Pick<User, "id" | "name" | "avatarUrl">;
  partnerSideStatus: string;
  partnerCheckedToday: boolean;
  checkedToday: boolean;
  missedStreak: number;
  checkinCount: number;
  day: number;
  totalDays: number;
  daysLeft: number;
  deadlineAt: Date | null;
  proofRejected: boolean;
  endedReason: string | null;
};

type HsStatus = (typeof handshakes.status.enumValues)[number];

export async function listMySides(db: Db, userId: string, statuses: HsStatus[] = ["accepted", "active"]) {
  const owner = aliasedTable(users, "owner");
  // The other direction of the same handshake (none for friend tests), read in the same query.
  const partnerSide = (column: string) =>
    sql<string | null>`(select ps.${sql.raw(column)}::text from ${handshakeSides} ps
      where ps.handshake_id = ${handshakes.id} and ps.tester_id <> ${userId} limit 1)`;
  const [now, rows] = await Promise.all([
    getNow(db),
    db
      .select({
        side: handshakeSides,
        hs: handshakes,
        app: apps,
        owner,
        partnerStatus: partnerSide("status"),
        partnerLastCheckin: partnerSide("last_checkin_date"),
      })
      .from(handshakeSides)
      .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
      .innerJoin(apps, eq(apps.id, handshakeSides.appId))
      .innerJoin(owner, eq(owner.id, apps.ownerId))
      .where(and(eq(handshakeSides.testerId, userId), inArray(handshakes.status, statuses)))
      .orderBy(desc(handshakes.startedAt), desc(handshakes.acceptedAt)),
  ]);
  const today = dayKey(now);

  return rows.map(({ side, hs, app, owner, partnerStatus, partnerLastCheckin }): MySide => {
    const totalDays = hs.startedAt && hs.endsAt ? daysBetween(hs.startedAt, hs.endsAt) : app.durationDays;
    const day = hs.startedAt ? Math.min(totalDays, daysBetween(hs.startedAt, now) + 1) : 0;
    return {
      sideId: side.id,
      handshakeId: hs.id,
      kind: hs.kind,
      hsStatus: hs.status,
      sideStatus: side.status,
      app: app,
      partner: owner,
      partnerSideStatus: partnerStatus ?? "pending",
      partnerCheckedToday: partnerLastCheckin === today,
      checkedToday: side.lastCheckinDate === today,
      missedStreak: side.missedStreak,
      checkinCount: side.checkinCount,
      day,
      totalDays,
      daysLeft: Math.max(0, totalDays - day),
      deadlineAt: hs.deadlineAt,
      proofRejected: side.proofRejected,
      endedReason: hs.endedReason,
    };
  });
}

// ---------- shell + dashboard ----------

// The app layout and the page under it render in the same request and read some of the same things;
// React's cache runs each of these once per request.
export const mySidesForRequest = cache((db: Db, userId: string) => listMySides(db, userId));
export const handshakeCountForRequest = cache((db: Db, userId: string) => activeHandshakeCount(db, userId));
export const slotLimitForRequest = cache((db: Db, level: number) => slotLimit(db, level));

export async function getShellData(db: Db, user: User) {
  const [[unread], [incoming], sides] = await Promise.all([
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    db
      .select({ n: count() })
      .from(handshakes)
      .where(and(eq(handshakes.userBId, user.id), eq(handshakes.status, "requested"))),
    mySidesForRequest(db, user.id),
  ]);
  return { unread: unread.n, incoming: incoming.n, sides };
}

export async function getDashboard(db: Db, user: User) {
  const [now, used, limit, levelRows, sides, myApps, [incoming], slots] = await Promise.all([
    getNow(db),
    handshakeCountForRequest(db, user.id),
    slotLimitForRequest(db, user.level),
    db.select().from(levels).orderBy(asc(levels.level)),
    mySidesForRequest(db, user.id),
    db.select().from(apps).where(and(eq(apps.ownerId, user.id), ne(apps.status, "archived"))),
    db
      .select({ n: count() })
      .from(handshakes)
      .where(and(eq(handshakes.userBId, user.id), eq(handshakes.status, "requested"))),
    slotBreakdown(db, { ownerId: user.id }),
  ]);
  const next = levelRows.find((l) => l.level === user.level + 1);
  const current = levelRows.find((l) => l.level === user.level);
  const due = sides.filter((s) => s.sideStatus === "active" && !s.checkedToday);
  const needProof = sides.filter((s) => s.sideStatus === "pending");
  const atRisk = sides.filter((s) => s.sideStatus === "active" && s.missedStreak > 0);
  return {
    now,
    used,
    limit,
    blocked: isBlocked(user, now),
    current,
    next,
    sides,
    due,
    needProof,
    atRisk,
    incoming: incoming.n,
    myApps: myApps.map((a) => ({ ...a, slots: slots.get(a.id) ?? emptySlots() })),
  };
}

// ---------- discover ----------

export async function getDiscover(db: Db, user: User, q?: string) {
  const now = await getNow(db);
  const owner = aliasedTable(users, "owner");
  const search = q?.trim();
  const candidates = db
    .select({ app: apps, owner })
    .from(apps)
    .innerJoin(owner, eq(owner.id, apps.ownerId))
    .where(
      and(
        eq(apps.status, "open"),
        ne(apps.ownerId, user.id),
        lte(apps.minAndroidApi, user.deviceAndroidApi ?? 0),
        or(isNull(owner.blockedUntil), lte(owner.blockedUntil, now)),
        notExists(
          db
            .select({ id: handshakes.id })
            .from(handshakes)
            .where(
              and(
                notInArray(handshakes.status, ["rejected", "cancelled"]),
                or(
                  and(eq(handshakes.userAId, user.id), eq(handshakes.appBId, apps.id)),
                  and(eq(handshakes.userBId, user.id), eq(handshakes.appAId, apps.id)),
                ),
              ),
            ),
        ),
        search ? or(ilike(apps.name, `%${search}%`), ilike(apps.packageName, `%${search}%`)) : undefined,
      ),
    );
  const [rows, myOpenApps, used, limit] = await Promise.all([
    candidates,
    db
      .select()
      .from(apps)
      .where(and(eq(apps.ownerId, user.id), eq(apps.status, "open")))
      .orderBy(asc(apps.name)),
    handshakeCountForRequest(db, user.id),
    slotLimitForRequest(db, user.level),
  ]);

  // Which (owner, my app) pairs already have a handshake — those apps can't be offered to that owner again.
  const ownerIds = [...new Set(rows.map((r) => r.owner.id))];
  const myAppIds = myOpenApps.map((a) => a.id);
  const [slots, pairs] = await Promise.all([
    slotBreakdown(db, rows.map((r) => r.app.id)),
    ownerIds.length && myAppIds.length
      ? db
          .select({ ua: handshakes.userAId, ub: handshakes.userBId, aa: handshakes.appAId, ab: handshakes.appBId })
          .from(handshakes)
          .where(
            and(
              notInArray(handshakes.status, ["rejected", "cancelled"]),
              or(
                and(inArray(handshakes.userAId, ownerIds), inArray(handshakes.appBId, myAppIds)),
                and(inArray(handshakes.userBId, ownerIds), inArray(handshakes.appAId, myAppIds)),
              ),
            ),
          )
      : [],
  ]);
  const tested = new Set<string>();
  for (const p of pairs) {
    tested.add(`${p.ua}:${p.ab}`);
    tested.add(`${p.ub}:${p.aa}`);
  }

  const cards = rows
    .map(({ app, owner }) => {
      const s = slots.get(app.id) ?? emptySlots();
      return {
        app,
        owner: { id: owner.id, name: owner.name, avatarUrl: owner.avatarUrl, reliability: owner.reliabilityScore, deviceApi: owner.deviceAndroidApi },
        slots: s,
        priority: Boolean(app.priorityUntil && app.priorityUntil > now),
        offerable: myOpenApps
          .filter((a) => owner.deviceAndroidApi != null && a.minAndroidApi <= owner.deviceAndroidApi && !tested.has(`${owner.id}:${a.id}`))
          .map((a) => ({ id: a.id, name: a.name })),
      };
    })
    // Replacement-priority apps first, then owner reliability, then fewest testers so new apps fill quickly.
    .sort((a, b) => Number(b.priority) - Number(a.priority) || b.owner.reliability - a.owner.reliability || a.slots.used - b.slots.used);

  return { cards, myOpenApps, used, limit, blocked: isBlocked(user, now), blockedUntil: user.blockedUntil };
}

// ---------- my apps ----------

export async function getMyApps(db: Db, userId: string) {
  const [rows, slots, ratings] = await Promise.all([
    db.select().from(apps).where(eq(apps.ownerId, userId)).orderBy(desc(apps.createdAt)),
    slotBreakdown(db, { ownerId: userId }),
    db
      .select({ appId: handshakeSides.appId, avg: sql<string>`avg(${feedback.rating})`, n: count() })
      .from(feedback)
      .innerJoin(handshakeSides, eq(handshakeSides.id, feedback.sideId))
      .innerJoin(apps, eq(apps.id, handshakeSides.appId))
      .where(eq(apps.ownerId, userId))
      .groupBy(handshakeSides.appId),
  ]);
  return rows.map((app) => {
    const r = ratings.find((x) => x.appId === app.id);
    return { app, slots: slots.get(app.id) ?? emptySlots(), rating: r ? Number(r.avg) : null, reviews: r?.n ?? 0 };
  });
}

export async function getAppDetail(db: Db, userId: string, appId: string) {
  // Each query is limited to this owner's app, so they can all run at once.
  const owned = and(eq(apps.id, appId), eq(apps.ownerId, userId));
  const [[app], testers, reviews, slotMap, now] = await Promise.all([
    db.select().from(apps).where(owned),
    db
      .select({ side: handshakeSides, hs: handshakes, tester: users })
      .from(handshakeSides)
      .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
      .innerJoin(users, eq(users.id, handshakeSides.testerId))
      .innerJoin(apps, eq(apps.id, handshakeSides.appId))
      .where(owned)
      .orderBy(desc(handshakes.acceptedAt)),
    db
      .select({ fb: feedback, tester: users })
      .from(feedback)
      .innerJoin(handshakeSides, eq(handshakeSides.id, feedback.sideId))
      .innerJoin(users, eq(users.id, handshakeSides.testerId))
      .innerJoin(apps, eq(apps.id, handshakeSides.appId))
      .where(owned)
      .orderBy(desc(feedback.createdAt)),
    slotBreakdown(db, [appId]),
    getNow(db),
  ]);
  if (!app) return null;
  return { app, testers, reviews, slots: slotMap.get(appId) ?? emptySlots(), now };
}

// ---------- requests ----------

export async function getRequests(db: Db, userId: string) {
  const ua = aliasedTable(users, "ua");
  const ub = aliasedTable(users, "ub");
  const aa = aliasedTable(apps, "aa");
  const ab = aliasedTable(apps, "ab");
  const base = () =>
    db
      .select({ hs: handshakes, userA: ua, userB: ub, appA: aa, appB: ab })
      .from(handshakes)
      .innerJoin(ua, eq(ua.id, handshakes.userAId))
      .innerJoin(ub, eq(ub.id, handshakes.userBId))
      .innerJoin(aa, eq(aa.id, handshakes.appAId))
      .innerJoin(ab, eq(ab.id, handshakes.appBId));
  const [incoming, outgoing, history, now] = await Promise.all([
    base().where(and(eq(handshakes.userBId, userId), eq(handshakes.status, "requested"))).orderBy(desc(handshakes.requestedAt)),
    base().where(and(eq(handshakes.userAId, userId), eq(handshakes.status, "requested"))).orderBy(desc(handshakes.requestedAt)),
    base()
      .where(
        and(
          or(eq(handshakes.userAId, userId), eq(handshakes.userBId, userId)),
          inArray(handshakes.status, ["rejected", "cancelled"]),
        ),
      )
      .orderBy(desc(handshakes.requestedAt))
      .limit(10),
    getNow(db),
  ]);
  return { incoming, outgoing, history, now };
}

// ---------- handshake detail ----------

export async function getHandshakeDetail(db: Db, userId: string, handshakeId: string) {
  const [[hs], sides, now] = await Promise.all([
    db.select().from(handshakes).where(eq(handshakes.id, handshakeId)),
    db.select().from(handshakeSides).where(eq(handshakeSides.handshakeId, handshakeId)),
    getNow(db),
  ]);
  if (!hs || (hs.userAId !== userId && hs.userBId !== userId)) return null;
  const mine = sides.find((s) => s.testerId === userId);
  // Owners follow their friend testers from the app page; there's no side here for them.
  if (!mine) return null;
  const theirs = sides.find((s) => s.testerId !== userId);
  const partnerId = hs.userAId === userId ? hs.userBId : hs.userAId;
  const [[partner], appRows, myCheckins, fbRows, myDisputes] = await Promise.all([
    db.select().from(users).where(eq(users.id, partnerId)),
    db.select().from(apps).where(inArray(apps.id, [hs.appAId, hs.appBId].filter((id): id is string => id != null))),
    db.select().from(dailyCheckins).where(eq(dailyCheckins.sideId, mine.id)).orderBy(asc(dailyCheckins.date)),
    sides.length ? db.select().from(feedback).where(inArray(feedback.sideId, sides.map((s) => s.id))) : [],
    db.select().from(disputes).where(and(eq(disputes.handshakeId, hs.id), eq(disputes.reporterId, userId))),
  ]);
  const testingAppId = hs.userAId === userId ? hs.appBId : hs.appAId;
  const testingApp = appRows.find((a) => a.id === testingAppId)!;
  const myApp = appRows.find((a) => a.id !== testingAppId); // undefined for friend tests
  return {
    hs,
    now,
    mine,
    theirs,
    partner,
    testingApp,
    myApp,
    myCheckins,
    myFeedback: fbRows.find((f) => f.sideId === mine.id),
    theirFeedback: theirs ? fbRows.find((f) => f.sideId === theirs.id) : undefined,
    myDisputes,
    iRequested: hs.userAId === userId,
  };
}

// ---------- friend invites ----------

export async function getInvite(db: Db, code: string, user: User | null) {
  const owner = aliasedTable(users, "owner");
  const [row] = await db.select({ app: apps, owner }).from(apps).innerJoin(owner, eq(owner.id, apps.ownerId)).where(eq(apps.inviteCode, code));
  if (!row) return null;
  const [slotMap, [existing]] = await Promise.all([
    slotBreakdown(db, [row.app.id]),
    // The signed-in visitor's live (or finished) test of this app, if any.
    user
      ? db
          .select({ id: handshakes.id })
          .from(handshakeSides)
          .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
          .where(and(eq(handshakeSides.appId, row.app.id), eq(handshakeSides.testerId, user.id), liveSideCondition))
          .limit(1)
      : [],
  ]);
  return { app: row.app, owner: row.owner, slots: slotMap.get(row.app.id) ?? emptySlots(), existingHandshakeId: existing?.id ?? null };
}

// ---------- friend testing ----------

export type FriendTester = {
  handshakeId: string;
  appId: string;
  appName: string;
  tester: Pick<User, "id" | "name" | "avatarUrl">;
  sideStatus: string;
  hsStatus: string;
  checkinCount: number;
  checkedToday: boolean;
  day: number;
  totalDays: number;
  deadlineAt: Date | null;
  endedReason: string | null;
};

/** Both directions of friend testing: friends testing my apps, and apps I'm testing for friends. */
export async function getFriendTesting(db: Db, userId: string) {
  const [now, slots, myApps, rows, testing, tested] = await Promise.all([
    getNow(db),
    slotBreakdown(db, { ownerId: userId }),
    db
      .select()
      .from(apps)
      .where(and(eq(apps.ownerId, userId), notInArray(apps.status, ["draft", "in_review"])))
      .orderBy(asc(apps.name)),
    db
      .select({ side: handshakeSides, hs: handshakes, tester: users, app: apps })
      .from(handshakes)
      .innerJoin(handshakeSides, eq(handshakeSides.handshakeId, handshakes.id))
      .innerJoin(users, eq(users.id, handshakeSides.testerId))
      .innerJoin(apps, eq(apps.id, handshakes.appBId))
      .where(and(eq(handshakes.kind, "friend"), eq(handshakes.userBId, userId)))
      .orderBy(desc(handshakes.acceptedAt)),
    mySidesForRequest(db, userId),
    listMySides(db, userId, ["completed", "broken", "cancelled"]),
  ]);
  const today = dayKey(now);

  const friends = rows.map(({ side, hs, tester, app }): FriendTester => {
    const totalDays = hs.startedAt && hs.endsAt ? daysBetween(hs.startedAt, hs.endsAt) : app.durationDays;
    return {
      handshakeId: hs.id,
      appId: app.id,
      appName: app.name,
      tester: { id: tester.id, name: tester.name, avatarUrl: tester.avatarUrl },
      sideStatus: side.status,
      hsStatus: hs.status,
      checkinCount: side.checkinCount,
      checkedToday: side.lastCheckinDate === today,
      day: hs.startedAt ? Math.min(totalDays, daysBetween(hs.startedAt, now) + 1) : 0,
      totalDays,
      deadlineAt: hs.deadlineAt,
      endedReason: hs.endedReason,
    };
  });
  const live = (f: FriendTester) => f.hsStatus === "accepted" || f.hsStatus === "active";

  return {
    now,
    // Apps taking testers, plus any finished app that still has friends mid-test.
    apps: myApps
      .map((app) => ({ app, slots: slots.get(app.id) ?? emptySlots(), friends: friends.filter((f) => f.appId === app.id && live(f)) }))
      .filter(({ app, friends }) => app.status === "open" || app.status === "full" || friends.length > 0),
    pastFriends: friends.filter((f) => !live(f)),
    testing: testing.filter((s) => s.kind === "friend"),
    tested: tested.filter((s) => s.kind === "friend"),
    stats: {
      activeFriends: friends.filter(live).length,
      completedFriends: friends.filter((f) => f.hsStatus === "completed").length,
    },
  };
}

export async function listHandshakeHistory(db: Db, userId: string) {
  // Cancelled handshakes only have sides when they were friend tests that ended early.
  return listMySides(db, userId, ["completed", "broken", "cancelled"]);
}

// ---------- notifications, profile, admin ----------

export async function listNotifications(db: Db, userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function getProfile(db: Db, user: User) {
  const [now, used, limit, levelRows, blockRows] = await Promise.all([
    getNow(db),
    handshakeCountForRequest(db, user.id),
    slotLimitForRequest(db, user.level),
    db.select().from(levels).orderBy(asc(levels.level)),
    db.select().from(blocks).where(eq(blocks.userId, user.id)).orderBy(desc(blocks.startsAt)),
  ]);
  return { now, used, limit, levels: levelRows, blocks: blockRows, blocked: isBlocked(user, now) };
}

export async function getAdmin(db: Db) {
  const now = await getNow(db);
  const reporter = aliasedTable(users, "reporter");
  const [openDisputes, allUsers, proofs, offset, lastCron] = await Promise.all([
    db
      .select({ d: disputes, reporter, hs: handshakes })
      .from(disputes)
      .innerJoin(reporter, eq(reporter.id, disputes.reporterId))
      .innerJoin(handshakes, eq(handshakes.id, disputes.handshakeId))
      .where(eq(disputes.status, "open"))
      .orderBy(desc(disputes.createdAt)),
    db.select().from(users).orderBy(desc(users.blockedUntil), asc(users.reliabilityScore)),
    db
      .select({ side: handshakeSides, hs: handshakes, tester: users, app: apps })
      .from(handshakeSides)
      .innerJoin(handshakes, eq(handshakes.id, handshakeSides.handshakeId))
      .innerJoin(users, eq(users.id, handshakeSides.testerId))
      .innerJoin(apps, eq(apps.id, handshakeSides.appId))
      .where(and(sql`${handshakeSides.optinProofUrl} is not null`, inArray(handshakes.status, ["accepted", "active"])))
      .orderBy(desc(handshakeSides.joinedAt))
      .limit(24),
    getSetting<number>(db, "clock_offset_days"),
    getSetting<string>(db, "last_cron_day"),
  ]);
  return { now, openDisputes, users: allUsers, proofs, clockOffset: offset ?? 0, lastCron, demoMode, blockedCount: allUsers.filter((u) => u.blockedUntil && u.blockedUntil > now).length };
}

