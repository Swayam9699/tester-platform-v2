import { redirect } from "next/navigation";
import { LogoMark, Sparkle } from "@/components/common";
import { OnboardingForm } from "@/components/forms/OnboardingForm";
import { googleGroup } from "@/lib/config";
import { isOnboarded, requireUser, safeNext } from "@/api/auth";

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
          <span className="text-sm text-muted-foreground">Step 1 of 1 · Setup</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Sparkle size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hi {user.name.split(" ")[0]}, let&apos;s get you set up</h1>
            <p className="text-sm text-muted-foreground">Three quick things and you&apos;re in.</p>
          </div>
        </div>

        <OnboardingForm next={next} playEmail={user.playEmail ?? user.googleEmail} group={googleGroup} />
      </div>
    </div>
  );
}
