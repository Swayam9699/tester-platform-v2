import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { demoSignIn, signInWithGoogle } from "@/actions/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { DemoSignInForm } from "@/components/forms/DemoSignInForm";
import { EmailSignIn } from "@/components/forms/EmailSignIn";
import { LogoMark, Sparkle, UserAvatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, demoMode, supabaseEnabled } from "@/lib/config";
import { getSessionUser, safeNext } from "@/api/auth";
import { GoogleLogo } from "@/components/auth/GoogleLogo";

export const metadata = { title: "Sign in" };

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
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in with Google, or get a one-time code by email.</p>

        {error && <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">Sign-in failed. Please try again.</p>}

        <form action={signInWithGoogle} className="mt-6">
          <Input type="hidden" name="next" value={next} />
          <Button variant="outline" size="lg" className="w-full text-[15px]" disabled={!supabaseEnabled}>
            <GoogleLogo /> Continue with Google
          </Button>
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
            <p className="text-xs text-muted-foreground">
              <b className="text-ink-2">Demo mode.</b> Google Sign-In turns on once Supabase keys are set in <code>.env.local</code>. Pick a demo account:
            </p>
            <div className="mt-3 space-y-1.5">
              {demoUsers.map((u) => (
                <ActionForm key={u.id} action={demoSignIn}>
                  <Input type="hidden" name="email" value={u.googleEmail} />
                  <Input type="hidden" name="next" value={next} />
                  <SubmitButton variant="outline" className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left text-ink shadow-sm hover:not-disabled:bg-canvas">
                    <UserAvatar name={u.name} size={26} ring={false} />
                    <span className="flex-1 font-medium">{u.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{u.isAdmin ? "admin" : `L${u.level}`}</span>
                  </SubmitButton>
                </ActionForm>
              ))}
            </div>
            <DemoSignInForm next={next} />
          </div>
        )}
      </div>
    </div>
  );
}
