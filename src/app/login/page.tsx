import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { demoSignIn, signInWithGoogle } from "@/app/actions";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EmailSignIn } from "@/components/EmailSignIn";
import { Avatar, LogoMark, Sparkle } from "@/components/ui";
import { APP_NAME, demoMode, supabaseEnabled } from "@/lib/config";
import { getSessionUser, safeNext } from "@/server/auth";

export const metadata = { title: "Sign in" };

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.9 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: nextParam } = await searchParams;
  const next = safeNext(nextParam);
  if (await getSessionUser()) redirect(next);
  const invited = next.startsWith("/invite/");
  const demoUsers = demoMode ? await (await getDb()).select().from(users).where(eq(users.joinedGoogleGroup, true)).limit(6) : [];

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="glass-shell w-full max-w-[420px] rounded-[28px] p-8">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-semibold">{APP_NAME.toUpperCase()}</span>
        </Link>
        <div className="mt-6 flex justify-center">
          <Sparkle size={84} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">{invited ? "Sign in to accept your invite" : "Welcome back"}</h1>
        <p className="mt-1 text-center text-sm text-muted">Sign in with Google, or get a one-time code by email.</p>

        {error && <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">Sign-in failed. Please try again.</p>}

        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button className="btn btn-soft h-12 w-full text-[15px]" disabled={!supabaseEnabled}>
            <GoogleG /> Continue with Google
          </button>
        </form>

        {supabaseEnabled && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <EmailSignIn next={next} />
          </>
        )}

        {!supabaseEnabled && !demoMode && (
          <p className="mt-4 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            Sign-in isn&apos;t set up yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to the deployment.
          </p>
        )}

        {demoMode && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs text-muted">
              <b className="text-ink-2">Demo mode.</b> Google Sign-In turns on once Supabase keys are set in <code>.env.local</code>. Pick a demo account:
            </p>
            <div className="mt-3 space-y-1.5">
              {demoUsers.map((u) => (
                <ActionForm key={u.id} action={demoSignIn}>
                  <input type="hidden" name="email" value={u.googleEmail} />
                  <input type="hidden" name="next" value={next} />
                  <button className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2 text-left text-sm shadow-sm ring-1 ring-black/5 hover:bg-canvas">
                    <Avatar name={u.name} size={26} ring={false} />
                    <span className="flex-1 font-medium">{u.name}</span>
                    <span className="text-xs text-muted">{u.isAdmin ? "admin" : `L${u.level}`}</span>
                  </button>
                </ActionForm>
              ))}
            </div>
            <ActionForm action={demoSignIn} className="mt-4 flex gap-2">
              <input type="hidden" name="next" value={next} />
              <input name="name" className="field h-10 w-28" placeholder="Name" />
              <input name="email" type="email" required className="field h-10 flex-1" placeholder="new@email.com" />
              <SubmitButton className="btn btn-dark h-10">Go</SubmitButton>
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  );
}
