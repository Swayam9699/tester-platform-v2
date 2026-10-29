import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { notifications, users } from "@/db/schema";
import { isValidApi } from "@/lib/android";
import { adminEmails } from "@/lib/config";
import { fail } from "./core";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Find-or-create the platform user for a signed-in account. Google (and demo) sign-ins are the Play account
 * already; email-code sign-ins confirm their Google Play email during onboarding.
 */
export async function upsertUserByEmail(
  db: Db,
  input: { email: string; name: string; avatarUrl?: string | null; id?: string; provider?: "google" | "email" },
) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.googleEmail, email));
  const isAdmin = adminEmails.includes(email);
  if (existing) {
    if (isAdmin && !existing.isAdmin) await db.update(users).set({ isAdmin }).where(eq(users.id, existing.id));
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({
      id: input.id,
      googleEmail: email,
      playEmail: input.provider === "email" ? null : email,
      name: input.name.trim() || email.split("@")[0],
      avatarUrl: input.avatarUrl ?? null,
      isAdmin,
    })
    .returning();
  return created;
}

function playEmailOrFail(raw: string) {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email)) fail("Enter the Google account email you use on Google Play.");
  return email;
}

export async function completeOnboarding(
  db: Db,
  userId: string,
  input: { deviceAndroidApi: number; joinedGoogleGroup: boolean; playEmail: string },
) {
  if (!input.joinedGoogleGroup) fail("Join the Google Group and tick the box to confirm.");
  if (!isValidApi(input.deviceAndroidApi)) fail("Choose your device's Android version.");
  const playEmail = playEmailOrFail(input.playEmail);
  await db.update(users).set({ ...input, playEmail }).where(eq(users.id, userId));
}

export async function updateProfile(db: Db, userId: string, input: { name: string; deviceAndroidApi: number; playEmail: string }) {
  if (input.name.trim().length < 2) fail("Name is too short.");
  if (!isValidApi(input.deviceAndroidApi)) fail("Choose your device's Android version.");
  const playEmail = playEmailOrFail(input.playEmail);
  await db
    .update(users)
    .set({ name: input.name.trim(), deviceAndroidApi: input.deviceAndroidApi, playEmail })
    .where(eq(users.id, userId));
}

export async function markNotificationsRead(db: Db, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
