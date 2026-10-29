import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appStatus = pgEnum("app_status", ["draft", "in_review", "open", "full", "completed", "archived"]);
export const handshakeStatus = pgEnum("handshake_status", [
  "requested",
  "accepted",
  "rejected",
  "active",
  "completed",
  "broken",
  "cancelled",
]);
// exchange = 1:1 swap; friend = one-way, the owner invited someone who tests without offering an app back.
export const handshakeKind = pgEnum("handshake_kind", ["exchange", "friend"]);
export const sideStatus = pgEnum("side_status", ["pending", "joined", "active", "completed", "skipped"]);
export const disputeStatus = pgEnum("dispute_status", ["open", "resolved", "dismissed"]);

export function newInviteCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleEmail: text("google_email").notNull().unique(), // the sign-in email (Google account or email-code sign-in)
  // The Google account used on Google Play, which is what developers' closed tracks see. Asked during onboarding.
  playEmail: text("play_email"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  deviceAndroidApi: integer("device_android_api"), // e.g. 26 = Android 8.0
  level: integer("level").notNull().default(1),
  completedHandshakes: integer("completed_handshakes").notNull().default(0),
  failedHandshakes: integer("failed_handshakes").notNull().default(0),
  reliabilityScore: integer("reliability_score").notNull().default(100),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  joinedGoogleGroup: boolean("joined_google_group").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: createdAt(),
});

export const apps = pgTable(
  "apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    packageName: text("package_name").notNull(),
    description: text("description"),
    joinAndroidLink: text("join_android_link").notNull(),
    joinWebLink: text("join_web_link").notNull(),
    logoUrl: text("logo_url"),
    minAndroidApi: integer("min_android_api").notNull(),
    groupAddedConfirmed: boolean("group_added_confirmed").notNull().default(false),
    countriesAllConfirmed: boolean("countries_all_confirmed").notNull().default(false),
    releaseSentConfirmed: boolean("release_sent_confirmed").notNull().default(false),
    testerSlots: integer("tester_slots").notNull().default(16),
    durationDays: integer("duration_days").notNull().default(16),
    status: appStatus("status").notNull().default("draft"),
    // Set when a tester skipped this app: it floats to the top of Discover to find a replacement.
    priorityUntil: timestamp("priority_until", { withTimezone: true }),
    // Secret part of the owner's friend-invite link (/invite/<code>). Resetting it revokes the old link.
    inviteCode: text("invite_code")
      .notNull()
      .$defaultFn(newInviteCode),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("apps_package_name_key").on(t.packageName),
    uniqueIndex("apps_invite_code_key").on(t.inviteCode),
    index("apps_status_idx").on(t.status),
  ],
);

export const handshakes = pgTable(
  "handshakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // requester
    kind: handshakeKind("kind").notNull().default("exchange"),
    appAId: uuid("app_a_id").references(() => apps.id, { onDelete: "cascade" }), // the app they offer; null for friend tests
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // target owner
    appBId: uuid("app_b_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }), // target app
    status: handshakeStatus("status").notNull().default("requested"),
    message: text("message"),
    endedReason: text("ended_reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // Request expiry while `requested`, opt-in deadline while `accepted`.
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  },
  (t) => [
    index("handshakes_user_a_idx").on(t.userAId, t.status),
    index("handshakes_user_b_idx").on(t.userBId, t.status),
    check("handshakes_distinct_users", sql`${t.userAId} <> ${t.userBId}`),
  ],
);

// Two rows per handshake, one per direction (one row for friend tests). Lets us penalize only the side that skipped.
export const handshakeSides = pgTable(
  "handshake_sides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handshakeId: uuid("handshake_id")
      .notNull()
      .references(() => handshakes.id, { onDelete: "cascade" }),
    testerId: uuid("tester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    optinProofUrl: text("optin_proof_url"),
    proofRejected: boolean("proof_rejected").notNull().default(false),
    lastCheckinDate: date("last_checkin_date"),
    checkinCount: integer("checkin_count").notNull().default(0),
    missedStreak: integer("missed_streak").notNull().default(0),
    status: sideStatus("status").notNull().default("pending"),
  },
  (t) => [
    uniqueIndex("handshake_sides_direction_key").on(t.handshakeId, t.testerId),
    index("handshake_sides_app_idx").on(t.appId, t.status),
    index("handshake_sides_tester_idx").on(t.testerId, t.status),
  ],
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sideId: uuid("side_id")
      .notNull()
      .references(() => handshakeSides.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    proofUrl: text("proof_url"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("daily_checkins_side_date_key").on(t.sideId, t.date)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sideId: uuid("side_id")
      .notNull()
      .references(() => handshakeSides.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    bugs: text("bugs"),
    comments: text("comments"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("feedback_side_key").on(t.sideId), check("feedback_rating_range", sql`${t.rating} between 1 and 5`)],
);

export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  activeSlots: integer("active_slots").notNull(),
  completionsRequired: integer("completions_required").notNull(),
});

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    handshakeId: uuid("handshake_id").references(() => handshakes.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("blocks_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  handshakeId: uuid("handshake_id")
    .notNull()
    .references(() => handshakes.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: disputeStatus("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: createdAt(),
});

// Key/value store: last processed cron date, demo clock offset.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type App = typeof apps.$inferSelect;
export type Handshake = typeof handshakes.$inferSelect;
export type HandshakeSide = typeof handshakeSides.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
