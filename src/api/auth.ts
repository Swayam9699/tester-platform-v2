import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { DEMO_COOKIE, demoMode, supabaseEnabled } from "@/lib/config";
import { createSupabaseServer } from "@/lib/supabase";
import { upsertUserByEmail } from "./users";

/** Where to land after Google sign-in, so an invite link survives the OAuth round trip. */
export const NEXT_COOKIE = "after_login";

/** Only same-site paths, so `?next=` can't be used as an open redirect. */
export function safeNext(path: string | null | undefined, fallback = "/dashboard") {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}

export const getSessionUser = cache(async (): Promise<User | null> => {
  const db = await getDb();
  if (supabaseEnabled) {
    const supabase = await createSupabaseServer();
    // Verified signature + expiry, checked locally (asymmetric signing key) instead of a call to Supabase Auth.
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.email) return null;
    const meta = claims.user_metadata ?? {};
    return upsertUserByEmail(db, {
      email: claims.email,
      name: meta.full_name ?? meta.name ?? "",
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
      provider: claims.app_metadata?.provider === "email" ? "email" : "google",
    });
  }
  // The demo cookie is an unsigned user id, so it's only honoured against the local demo database.
  if (!demoMode) return null;
  const id = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
});

export function isOnboarded(user: User) {
  return user.joinedGoogleGroup && user.deviceAndroidApi != null && user.playEmail != null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");
  return user;
}
