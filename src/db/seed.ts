import { and, count, eq } from "drizzle-orm";
import type { Db } from "./index";
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
  settings,
  users,
} from "./schema";
import { LEVELS } from "@/lib/config";
import { androidLink, webLink } from "@/lib/playLinks";
import { addDays, addHours, dayKey } from "@/lib/time";

export async function seedLevels(db: Db) {
  for (const l of LEVELS) {
    await db
      .insert(levels)
      .values(l)
      .onConflictDoUpdate({ target: levels.level, set: { activeSlots: l.activeSlots, completionsRequired: l.completionsRequired } });
  }
}

const PEOPLE = [
  { key: "allison", name: "Allison Lipshutz", email: "allison@example.com", api: 35, level: 2, completed: 12, reliability: 96, admin: true },
  { key: "marcus", name: "Marcus Chen", email: "marcus@example.com", api: 34, level: 1, completed: 4, reliability: 100 },
  { key: "priya", name: "Priya Sharma", email: "priya@example.com", api: 36, level: 3, completed: 31, reliability: 98 },
  { key: "diego", name: "Diego Alvarez", email: "diego@example.com", api: 33, level: 1, completed: 2, reliability: 100 },
  { key: "sofia", name: "Sofia Rossi", email: "sofia@example.com", api: 31, level: 2, completed: 14, reliability: 92 },
  { key: "kenji", name: "Kenji Watanabe", email: "kenji@example.com", api: 35, level: 2, completed: 19, reliability: 100 },
  { key: "amara", name: "Amara Okafor", email: "amara@example.com", api: 30, level: 1, completed: 6, reliability: 94 },
  { key: "lukas", name: "Lukas Becker", email: "lukas@example.com", api: 34, level: 1, completed: 3, reliability: 70, failed: 2 },
  { key: "hannah", name: "Hannah Kim", email: "hannah@example.com", api: 36, level: 1, completed: 1, reliability: 100 },
  { key: "omar", name: "Omar Haddad", email: "omar@example.com", api: 29, level: 1, completed: 8, reliability: 100 },
  { key: "zara", name: "Zara Ahmed", email: "zara@example.com", api: 34, level: 2, completed: 11, reliability: 100 },
  { key: "tomas", name: "Tomás Silva", email: "tomas@example.com", api: 33, level: 1, completed: 5, reliability: 97 },
  { key: "mei", name: "Mei Lin", email: "mei@example.com", api: 35, level: 3, completed: 27, reliability: 99 },
  { key: "noah", name: "Noah Williams", email: "noah@example.com", api: 32, level: 1, completed: 0, reliability: 100 },
  { key: "ines", name: "Inès Moreau", email: "ines@example.com", api: 36, level: 1, completed: 7, reliability: 88 },
  { key: "ravi", name: "Ravi Patel", email: "ravi@example.com", api: 34, level: 2, completed: 16, reliability: 95 },
] as const;

const APPS = [
  { key: "budget", owner: "allison", name: "Pocket Budget", pkg: "com.allison.pocketbudget", api: 26, desc: "Envelope budgeting that works offline." },
  { key: "habit", owner: "allison", name: "Habit Garden", pkg: "com.allison.habitgarden", api: 28, desc: "Grow a plant for every streak you keep." },
  { key: "trail", owner: "marcus", name: "Trailmix", pkg: "io.trailmix.hiking", api: 29, desc: "Offline trail maps and elevation profiles." },
  { key: "focus", owner: "priya", name: "Deep Focus Timer", pkg: "dev.priya.deepfocus", api: 30, desc: "Pomodoro with ambient soundscapes." },
  { key: "recipe", owner: "diego", name: "Sabor Recipes", pkg: "app.sabor.recipes", api: 26, desc: "Latin American home cooking, step by step." },
  { key: "lingo", owner: "sofia", name: "Lingo Cards", pkg: "it.rossi.lingocards", api: 28, desc: "Spaced-repetition flashcards for 20 languages." },
  { key: "pixel", owner: "kenji", name: "Pixel Journal", pkg: "jp.kenji.pixeljournal", api: 31, desc: "A one-pixel-a-day mood journal." },
  { key: "plant", owner: "amara", name: "Water My Plants", pkg: "ng.amara.watermyplants", api: 26, desc: "Watering reminders tuned to each species." },
  { key: "scan", owner: "lukas", name: "QuickScan PDF", pkg: "de.becker.quickscan", api: 29, desc: "Scan receipts and docs to searchable PDFs." },
  { key: "split", owner: "hannah", name: "SplitEasy", pkg: "com.hannahkim.spliteasy", api: 33, desc: "Split bills with friends, settle in one tap." },
  { key: "pray", owner: "omar", name: "Calm Breath", pkg: "com.haddad.calmbreath", api: 24, desc: "Guided breathing in 60 seconds." },
  { key: "fit", owner: "zara", name: "StepStreak", pkg: "com.zara.stepstreak", api: 28, desc: "Daily step goals with friendly streaks." },
  { key: "tide", owner: "tomas", name: "Tide Times", pkg: "pt.silva.tidetimes", api: 26, desc: "Tide charts and surf windows for 4,000 beaches." },
  { key: "read", owner: "mei", name: "Readwise Lite", pkg: "com.meilin.readlite", api: 30, desc: "Save highlights from any book in one tap." },
  { key: "chess", owner: "noah", name: "Chess Puzzles Daily", pkg: "io.noahw.chesspuzzles", api: 26, desc: "One hand-picked puzzle every morning." },
  { key: "camera", owner: "ines", name: "Lumière Cam", pkg: "fr.moreau.lumiere", api: 36, desc: "Film-style camera presets. Needs Android 16." },
  { key: "expense", owner: "ravi", name: "Receipt Ninja", pkg: "in.ravipatel.receiptninja", api: 29, desc: "Snap receipts, export GST-ready reports." },
] as const;

type PersonKey = (typeof PEOPLE)[number]["key"];
type AppKey = (typeof APPS)[number]["key"];

/** A believable community so every screen has something to show in demo mode. */
export async function seedDemoData(db: Db) {
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) return;

  const now = new Date();
  const uid = {} as Record<PersonKey, string>;
  const aid = {} as Record<AppKey, string>;

  for (const p of PEOPLE) {
    const failed = "failed" in p ? p.failed : 0;
    const [u] = await db
      .insert(users)
      .values({
        name: p.name,
        googleEmail: p.email,
        playEmail: p.email,
        deviceAndroidApi: p.api,
        level: p.level,
        completedHandshakes: p.completed,
        failedHandshakes: failed,
        reliabilityScore: p.reliability,
        joinedGoogleGroup: true,
        isAdmin: "admin" in p && p.admin,
        blockedUntil: failed ? addDays(now, 5) : null,
        createdAt: addDays(now, -60),
      })
      .returning();
    uid[p.key] = u.id;
  }

  for (const a of APPS) {
    const [row] = await db
      .insert(apps)
      .values({
        ownerId: uid[a.owner],
        name: a.name,
        packageName: a.pkg,
        description: a.desc,
        joinWebLink: webLink(a.pkg),
        joinAndroidLink: androidLink(a.pkg),
        minAndroidApi: a.api,
        groupAddedConfirmed: true,
        countriesAllConfirmed: true,
        releaseSentConfirmed: true,
        status: "open",
        createdAt: addDays(now, -30),
      })
      .returning();
    aid[a.key] = row.id;
  }

  const blockedUser = uid.lukas;
  await db.insert(blocks).values({
    userId: blockedUser,
    reason: "Missed 3 daily check-ins in a row.",
    startsAt: addDays(now, -9),
    endsAt: addDays(now, 5),
  });

  type SideSeed = { last?: number | null; streak?: number; proof?: boolean };
  async function handshake(
    a: PersonKey,
    appA: AppKey,
    b: PersonKey,
    appB: AppKey,
    status: "requested" | "accepted" | "active" | "completed",
    opts: { ageDays?: number; sideA?: SideSeed; sideB?: SideSeed; message?: string } = {},
  ) {
    const age = opts.ageDays ?? 0;
    const requestedAt = addDays(now, -age - 1);
    const startedAt = status === "active" || status === "completed" ? addDays(now, -age) : null;
    const [hs] = await db
      .insert(handshakes)
      .values({
        userAId: uid[a],
        appAId: aid[appA],
        userBId: uid[b],
        appBId: aid[appB],
        status,
        message: opts.message,
        requestedAt: status === "requested" ? addHours(now, -age * 24 - 3) : requestedAt,
        acceptedAt: status === "requested" ? null : addHours(requestedAt, 5),
        startedAt,
        endsAt: startedAt ? addDays(startedAt, 16) : null,
        deadlineAt:
          status === "requested" ? addHours(now, 48 - age * 24 - 3) : status === "accepted" ? addHours(now, 30) : null,
      })
      .returning();
    if (status === "requested") return hs.id;

    const sideStatus = status === "accepted" ? "pending" : status;
    const sideDefs = [
      { tester: a, app: appB, seed: opts.sideA },
      { tester: b, app: appA, seed: opts.sideB },
    ];
    for (const s of sideDefs) {
      const joined = status !== "accepted" || s.seed?.proof;
      const lastOffset = s.seed?.last === undefined ? (status === "completed" ? -age + 16 - 1 : 0) : s.seed.last;
      const lastDate = startedAt && lastOffset !== null ? addDays(now, lastOffset) : null;
      const checkinDays: string[] = [];
      if (startedAt && lastDate) {
        for (let d = startedAt; dayKey(d) <= dayKey(lastDate); d = addDays(d, 1)) checkinDays.push(dayKey(d));
      }
      const [side] = await db
        .insert(handshakeSides)
        .values({
          handshakeId: hs.id,
          testerId: uid[s.tester],
          appId: aid[s.app],
          status: joined && status === "accepted" ? "joined" : sideStatus,
          joinedAt: joined ? addHours(requestedAt, 8) : null,
          optinProofUrl: joined ? "/demo-proof.svg" : null,
          lastCheckinDate: lastDate ? dayKey(lastDate) : null,
          checkinCount: checkinDays.length,
          missedStreak: s.seed?.streak ?? 0,
        })
        .returning();
      if (checkinDays.length) {
        await db.insert(dailyCheckins).values(checkinDays.map((date) => ({ sideId: side.id, date })));
      }
    }
    return hs.id;
  }

  // Allison's world (the demo login).
  await handshake("allison", "budget", "marcus", "trail", "active", { ageDays: 5, sideA: { last: -1 } });
  await handshake("allison", "habit", "priya", "focus", "active", { ageDays: 9, sideA: { last: -2, streak: 1 } });
  await handshake("kenji", "pixel", "allison", "budget", "active", { ageDays: 13 });
  await handshake("sofia", "lingo", "allison", "habit", "accepted", { sideA: { proof: true } });
  const completed = await handshake("omar", "pray", "allison", "budget", "completed", { ageDays: 19 });
  await handshake("diego", "recipe", "allison", "habit", "requested", {
    ageDays: 0,
    message: "Hi! Happy to test Habit Garden daily — looks lovely.",
  });
  await handshake("hannah", "split", "allison", "budget", "requested", { ageDays: 1 });
  await handshake("allison", "budget", "amara", "plant", "requested", { ageDays: 0 });

  // Allison sent Noah her friend invite link: he tests Pocket Budget without anything in return.
  {
    const startedAt = addDays(now, -4);
    const [hs] = await db
      .insert(handshakes)
      .values({
        kind: "friend",
        userAId: uid.noah,
        userBId: uid.allison,
        appBId: aid.budget,
        status: "active",
        requestedAt: addHours(startedAt, -6),
        acceptedAt: addHours(startedAt, -6),
        startedAt,
        endsAt: addDays(startedAt, 16),
      })
      .returning();
    await db.insert(handshakeSides).values({
      handshakeId: hs.id,
      testerId: uid.noah,
      appId: aid.budget,
      status: "active",
      joinedAt: startedAt,
      optinProofUrl: "/demo-proof.svg",
      lastCheckinDate: dayKey(addDays(now, -1)),
      checkinCount: 3,
    });
  }

  // Everyone else, so apps show partially filled tester bars.
  await handshake("marcus", "trail", "priya", "focus", "active", { ageDays: 7 });
  await handshake("marcus", "trail", "kenji", "pixel", "active", { ageDays: 3 });
  await handshake("hannah", "split", "priya", "focus", "active", { ageDays: 11 });
  await handshake("sofia", "lingo", "kenji", "pixel", "active", { ageDays: 2 });
  await handshake("omar", "pray", "sofia", "lingo", "completed", { ageDays: 18 });
  await handshake("amara", "plant", "diego", "recipe", "active", { ageDays: 6 });
  await handshake("priya", "focus", "diego", "recipe", "active", { ageDays: 4 });
  await handshake("zara", "fit", "mei", "read", "active", { ageDays: 8 });
  await handshake("ravi", "expense", "mei", "read", "active", { ageDays: 5 });
  await handshake("ravi", "expense", "zara", "fit", "active", { ageDays: 10 });
  await handshake("tomas", "tide", "ravi", "expense", "accepted", { sideA: { proof: true } });
  await handshake("kenji", "pixel", "ravi", "expense", "active", { ageDays: 12 });
  // Someone skipped Tide Times, so it's boosted in Discover to find a replacement tester.
  await db.update(apps).set({ priorityUntil: addDays(now, 5) }).where(eq(apps.id, aid.tide));

  // Omar tested Pocket Budget in the completed handshake.
  const [omarSide] = await db
    .select()
    .from(handshakeSides)
    .where(and(eq(handshakeSides.handshakeId, completed), eq(handshakeSides.testerId, uid.omar)));
  await db.insert(feedback).values({
    sideId: omarSide.id,
    rating: 4,
    bugs: "Currency picker resets to USD after rotating the screen.",
    comments: "Clean and fast. Would love CSV export for monthly reports.",
  });

  await db.insert(disputes).values({
    reporterId: uid.priya,
    handshakeId: completed,
    reason: "Partner's opt-in screenshot looks like it's from a different app — please double-check.",
  });

  await db.insert(notifications).values([
    { userId: uid.allison, kind: "request", title: "Diego Alvarez wants to test Habit Garden", body: "In return they'll have you test Sabor Recipes.", link: "/requests", createdAt: addHours(now, -3) },
    { userId: uid.allison, kind: "warning", title: "You missed yesterday's check-in for Deep Focus Timer", body: "Check in today to keep your streak.", link: "/handshakes", createdAt: addHours(now, -5) },
    { userId: uid.allison, kind: "accepted", title: "Sofia Rossi accepted your handshake", body: "Opt in to Lingo Cards and upload your screenshot within 48h.", link: "/handshakes", createdAt: addHours(now, -18) },
    { userId: uid.allison, kind: "feedback", title: "New 4★ feedback on Pocket Budget", body: "From Omar Haddad", link: "/apps", createdAt: addDays(now, -2), readAt: addDays(now, -1) },
    { userId: uid.allison, kind: "completed", title: "Handshake completed 🎉", body: "You finished testing Calm Breath.", link: "/handshakes", createdAt: addDays(now, -3), readAt: addDays(now, -2) },
  ]);

  // The demo history above already reflects today's cron run.
  await db.insert(settings).values({ key: "last_cron_day", value: dayKey(now) }).onConflictDoNothing();
}
