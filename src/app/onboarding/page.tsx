import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { onboardAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LogoMark, Sparkle } from "@/components/ui";
import { ANDROID_VERSIONS } from "@/lib/android";
import { googleGroup } from "@/lib/config";
import { isOnboarded, requireUser, safeNext } from "@/server/auth";

export const metadata = { title: "Get set up" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await requireUser();
  if (isOnboarded(user)) redirect(next);

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="glass-shell w-full max-w-[520px] rounded-[28px] p-8">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="text-sm text-muted">Step 1 of 1 · Setup</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Sparkle size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hi {user.name.split(" ")[0]}, let&apos;s get you set up</h1>
            <p className="text-sm text-muted">Three quick things and you&apos;re in.</p>
          </div>
        </div>

        <ActionForm action={onboardAction} className="mt-8 space-y-5">
          <input type="hidden" name="next" value={next} />
          <section className="card p-5">
            <p className="font-semibold">
              <span className="mr-2 text-muted">1.</span>Join our Google Group
            </p>
            <p className="mt-1 text-sm text-muted">
              Every developer adds this one group to their closed track, so joining once gives you access to every app on the platform. Join with the Google account you use on Google Play (step 2).
            </p>
            <a href={googleGroup.url} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm mt-3">
              Open {googleGroup.email} <ExternalLink size={12} />
            </a>
            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" name="joinedGoogleGroup" className="check" required />
              I&apos;ve joined the group
            </label>
          </section>

          <section className="card p-5">
            <label htmlFor="playEmail" className="font-semibold">
              <span className="mr-2 text-muted">2.</span>Your Google Play account
            </label>
            <p className="mt-1 text-sm text-muted">The Google account signed in to the Play Store on your phone. You opt in to tests with it, and it must be the one in the group.</p>
            <input
              id="playEmail"
              name="playEmail"
              type="email"
              required
              className="field mt-3"
              defaultValue={user.playEmail ?? user.googleEmail}
              placeholder="you@gmail.com"
            />
          </section>

          <section className="card p-5">
            <label htmlFor="deviceAndroidApi" className="font-semibold">
              <span className="mr-2 text-muted">3.</span>Your phone&apos;s Android version
            </label>
            <p className="mt-1 text-sm text-muted">Settings → About phone → Android version. We only show you apps your phone can run.</p>
            <select id="deviceAndroidApi" name="deviceAndroidApi" className="field mt-3" required defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {ANDROID_VERSIONS.map((v) => (
                <option key={v.api} value={v.api}>
                  {v.label} (API {v.api})
                </option>
              ))}
            </select>
          </section>

          <SubmitButton className="btn btn-dark h-12 w-full" pendingText="Saving…">
            Continue
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
