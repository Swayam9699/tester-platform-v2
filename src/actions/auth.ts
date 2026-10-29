"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { DEMO_COOKIE, demoMode, supabaseEnabled } from "@/lib/config";
import { createSupabaseServer } from "@/lib/supabase";
import { NEXT_COOKIE, safeNext } from "@/api/auth";
import { upsertUserByEmail } from "@/api/users";
import { demoSignInSchema, emailCodeSchema, emailSignInSchema } from "@/validation/auth";
import { str, type ActionState } from "./utils";

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
    const parsed = emailCodeSchema.safeParse({ email, code: str(fd, "code") });
    if (!parsed.success) return { step: "code", email, error: true, message: parsed.error.issues[0].message };
    const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
    if (error) return { step: "code", email, error: true, message: "That code didn't work. Check it, or send a new one." };
    redirect(next);
  }

  const parsed = emailSignInSchema.safeParse({ email });
  if (!parsed.success) return { step: "email", email, error: true, message: parsed.error.issues[0].message };
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
  const parsed = demoSignInSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, name } = parsed.data;
  const user = await upsertUserByEmail(db, { email, name: name || email.split("@")[0] });
  (await cookies()).set(DEMO_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(safeNext(str(fd, "next")));
}

export async function signOut() {
  if (supabaseEnabled) await (await createSupabaseServer()).auth.signOut();
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/");
}
