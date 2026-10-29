"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { demoMode, supabaseEnabled } from "@/lib/config";
import { createSupabaseServer } from "@/lib/supabase";
import * as admin from "@/server/admin";
import { deleteDraft, saveApp, setAppLifecycle } from "@/server/apps";
import { DEMO_COOKIE, NEXT_COOKIE, requireUser, safeNext } from "@/server/auth";
import { AppError } from "@/server/core";
import { runDailyJob } from "@/server/cron";
import * as hs from "@/server/handshakes";
import { saveScreenshot } from "@/server/storage";
import { completeOnboarding, markNotificationsRead, updateProfile, upsertUserByEmail } from "@/server/users";

export type ActionState = { ok: boolean; message?: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const num = (fd: FormData, key: string) => Number(fd.get(key));
const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

/** Runs a mutation for the signed-in user and turns rule violations into a message for the form. */
async function run(
  fn: (userId: string) => Promise<unknown>,
  success?: string,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await fn(user.id);
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: success };
}

// ---------- auth ----------

export async function signInWithGoogle(fd: FormData) {
  if (!supabaseEnabled) redirect("/login");
  const next = safeNext(str(fd, "next"));
  (await cookies()).set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 10 });
  const supabase = await createSupabaseServer();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export type EmailSignInState = { step: "email" | "code"; email?: string; message?: string; error?: boolean } | null;

/**
 * Passwordless email sign-in through Supabase: step "send" emails a one-time code (and a link), step "code"
 * verifies it, step "reset" goes back to entering an email.
 */
export async function emailSignInAction(_: EmailSignInState, fd: FormData): Promise<EmailSignInState> {
  if (!supabaseEnabled) return { step: "email", error: true, message: "Email sign-in isn't set up." };
  const email = str(fd, "email").trim().toLowerCase();
  const next = safeNext(str(fd, "next"));
  const step = str(fd, "step");
  if (step === "reset") return { step: "email", email };

  const supabase = await createSupabaseServer();
  if (step === "code") {
    const { error } = await supabase.auth.verifyOtp({ email, token: str(fd, "code").replace(/\s/g, ""), type: "email" });
    if (error) return { step: "code", email, error: true, message: "That code didn't work. Check it, or send a new one." };
    redirect(next);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { step: "email", email, error: true, message: "Enter a valid email." };
  // The email also has a sign-in link; /auth/callback sends its clicker to `next`.
  (await cookies()).set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` } });
  if (error) {
    console.error("Email sign-in:", error.code, error.message);
    const messages: Record<string, string> = {
      email_address_invalid: "That email address isn't valid.",
      // Supabase's built-in sender only mails the project's own team until custom SMTP is set up.
      email_address_not_authorized: "Email sign-in isn't available yet. Please continue with Google.",
      over_email_send_rate_limit: "Too many sign-in emails. Wait a minute and try again.",
    };
    return {
      step: "email",
      email,
      error: true,
      message: messages[error.code ?? ""] ?? (error.status === 429 ? messages.over_email_send_rate_limit : "We couldn't send the email. Please try again shortly."),
    };
  }
  return { step: "code", email, message: `We emailed a sign-in code to ${email}.` };
}

export async function demoSignIn(_: ActionState, fd: FormData): Promise<ActionState> {
  // Only for the local demo database: with a real database this would let anyone sign in as anyone.
  if (!demoMode) return { ok: false, message: "Demo sign-in is disabled." };
  const db = await getDb();
  const email = str(fd, "email").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Enter a valid email." };
  const user = await upsertUserByEmail(db, { email, name: str(fd, "name") || email.split("@")[0] });
  (await cookies()).set(DEMO_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(safeNext(str(fd, "next")));
}

export async function signOut() {
  if (supabaseEnabled) await (await createSupabaseServer()).auth.signOut();
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/");
}

// ---------- onboarding + profile ----------

export async function onboardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const result = await run(
    (uid) =>
      completeOnboarding(db, uid, {
        deviceAndroidApi: num(fd, "deviceAndroidApi"),
        joinedGoogleGroup: bool(fd, "joinedGoogleGroup"),
        playEmail: str(fd, "playEmail"),
      }),
  );
  if (result?.ok) redirect(safeNext(str(fd, "next")));
  return result;
}

export async function profileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(
    (uid) => updateProfile(db, uid, { name: str(fd, "name"), deviceAndroidApi: num(fd, "deviceAndroidApi"), playEmail: str(fd, "playEmail") }),
    "Profile saved.",
  );
}

export async function readNotificationsAction(): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => markNotificationsRead(db, uid));
}

// ---------- apps ----------

export async function saveAppAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const publish = str(fd, "intent") === "publish";
  const appId = str(fd, "appId") || undefined;
  let savedId = "";
  const result = await run(async (uid) => {
    savedId = await saveApp(
      db,
      uid,
      {
        name: str(fd, "name"),
        description: str(fd, "description"),
        testingLink: str(fd, "testingLink"),
        logoUrl: str(fd, "logoUrl"),
        minAndroidApi: num(fd, "minAndroidApi"),
        groupAddedConfirmed: bool(fd, "groupAddedConfirmed"),
        countriesAllConfirmed: bool(fd, "countriesAllConfirmed"),
        releaseSentConfirmed: bool(fd, "releaseSentConfirmed"),
      },
      { publish, appId },
    );
  });
  if (result?.ok) redirect(`/apps/${savedId}${publish && !appId ? "?published=1" : ""}`);
  return result;
}

export async function appLifecycleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const action = str(fd, "action") as "archive" | "complete" | "reopen" | "delete";
  if (action === "delete") {
    const result = await run((uid) => deleteDraft(db, uid, str(fd, "appId")));
    if (result?.ok) redirect("/apps");
    return result;
  }
  return run((uid) => setAppLifecycle(db, uid, str(fd, "appId"), action), "Updated.");
}

// ---------- handshakes ----------

export async function requestHandshakeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const result = await run((uid) =>
    hs.requestHandshake(db, uid, { targetAppId: str(fd, "targetAppId"), offeredAppId: str(fd, "offeredAppId"), message: str(fd, "message") }),
  );
  if (result?.ok) redirect("/requests?sent=1");
  return result;
}

export async function respondAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const id = str(fd, "handshakeId");
  switch (str(fd, "action")) {
    case "accept": {
      const result = await run((uid) => hs.acceptHandshake(db, uid, id));
      if (result?.ok) redirect(`/handshakes/${id}`);
      return result;
    }
    case "reject":
      return run((uid) => hs.rejectHandshake(db, uid, id), "Request declined.");
    case "cancel":
      return run((uid) => hs.cancelHandshake(db, uid, id), "Request withdrawn.");
    default:
      return { ok: false, message: "Unknown action." };
  }
}

export async function optinProofAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const url = await saveScreenshot(fd.get("proof") as File | null, "optin");
    await hs.submitOptinProof(db, uid, str(fd, "sideId"), url);
  }, "Proof uploaded. Your 16 days start as soon as your partner opts in too.");
}

export async function checkInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const file = fd.get("proof") as File | null;
    const proofUrl = file && file.size > 0 ? await saveScreenshot(file, "checkins") : undefined;
    await hs.checkIn(db, uid, str(fd, "sideId"), { note: str(fd, "note"), proofUrl });
  }, "Checked in for today ✓");
}

export async function feedbackAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(
    (uid) => hs.submitFeedback(db, uid, str(fd, "sideId"), { rating: num(fd, "rating"), bugs: str(fd, "bugs"), comments: str(fd, "comments") }),
    "Thanks! Feedback sent to the developer.",
  );
}

export async function reportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => hs.reportIssue(db, uid, str(fd, "handshakeId"), str(fd, "reason")), "Report sent to the admins.");
}

// ---------- friend tests ----------

export async function joinFriendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  let handshakeId = "";
  const result = await run(async (uid) => {
    handshakeId = (await hs.joinAsFriend(db, uid, str(fd, "code"))).id;
  });
  if (result?.ok) redirect(`/handshakes/${handshakeId}`);
  return result;
}

export async function leaveFriendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => hs.leaveFriendTest(db, uid, str(fd, "handshakeId")), "Friend test ended.");
}

export async function resetInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => hs.resetInviteCode(db, uid, str(fd, "appId")), "New link created. The old one no longer works.");
}

// ---------- admin ----------

export async function adminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const action = str(fd, "action");
  return run(async (uid) => {
    switch (action) {
      case "resolve":
      case "dismiss":
        return admin.resolveDispute(db, uid, str(fd, "disputeId"), action === "resolve" ? "resolved" : "dismissed", str(fd, "resolution"));
      case "ban":
        return admin.banUser(db, uid, str(fd, "userId"), num(fd, "days") || 30, str(fd, "reason"));
      case "unblock":
        return admin.unblockUser(db, uid, str(fd, "userId"));
      case "rejectProof":
        return admin.rejectProof(db, uid, str(fd, "sideId"));
      case "markSkipped":
        return admin.markSideSkipped(db, uid, str(fd, "sideId"));
      case "clock":
        await admin.shiftClock(db, uid, num(fd, "days"));
        return runDailyJob(db);
      case "cron":
        await admin.assertAdmin(db, uid);
        return runDailyJob(db);
    }
  }, "Done.");
}
