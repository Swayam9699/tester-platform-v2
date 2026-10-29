export const APP_NAME = "Tester";

/** Supabase's publishable key (sb_publishable_…) or, for older projects, the legacy anon key. Either works. */
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Google Sign-In + Supabase Storage are enabled when the Supabase project keys are present. */
export const supabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey);

/**
 * Postgres connection string: DATABASE_URL, or POSTGRES_URL as set by Vercel's Supabase integration. That
 * integration appends options (supa=, pgbouncer=, connect_timeout=) that postgres.js would forward to the server
 * as startup parameters, so only sslmode is kept.
 */
export function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) if (key !== "sslmode") url.searchParams.delete(key);
  return url.toString();
}

/** Digits in Supabase's email sign-in code. Must match Authentication → Email → "Email OTP Length" in Supabase. */
export const EMAIL_CODE_LENGTH = 6;

/** Demo mode sign-in: an unsigned user id, only honoured against the local demo database (see getSessionUser). */
export const DEMO_COOKIE = "demo_uid";

/** Demo mode: local database, pick-a-user sign-in, and an adjustable clock for walking through 16-day cycles. */
export const demoMode = !databaseUrl() && !supabaseEnabled;

export const googleGroup = {
  url: process.env.NEXT_PUBLIC_GOOGLE_GROUP_URL || "https://groups.google.com/g/tester-community",
  email: process.env.NEXT_PUBLIC_GOOGLE_GROUP_EMAIL || "tester-community@googlegroups.com",
};

export const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Business rules from the PRD. */
export const RULES = {
  testerSlots: 16, // 12 required by Google + 4 spare
  durationDays: 16, // 14 required by Google + 2 spare
  requestExpiryHours: 48,
  joinDeadlineHours: 48,
  warnAtMissedDays: 2,
  skipAtMissedDays: 3,
  baseBlockDays: 7,
  maxBlockDays: 60,
  reliabilityPenalty: 15,
  reliabilityReward: 2,
  priorityDays: 7,
} as const;

export const LEVELS = [
  { level: 1, activeSlots: 12, completionsRequired: 0 },
  { level: 2, activeSlots: 14, completionsRequired: 10 },
  { level: 3, activeSlots: 16, completionsRequired: 25 },
  { level: 4, activeSlots: 18, completionsRequired: 50 },
  { level: 5, activeSlots: 20, completionsRequired: 100 },
] as const;
