import { Heart } from "lucide-react";
import Link from "next/link";
import { joinFriendAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AppLogo, Avatar, LogoMark, SlotBar } from "@/components/ui";
import { androidLabel } from "@/lib/android";
import { APP_NAME, RULES } from "@/lib/config";
import { getSessionUser, isOnboarded } from "@/server/auth";
import { getInvite } from "@/server/queries";

export const metadata = { title: "You're invited to test" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  const invite = await getInvite(await getDb(), code, user);
  const here = `/invite/${code}`;

  if (!invite) {
    return (
      <Shell>
        <h1 className="text-center text-2xl font-semibold tracking-tight">This invite link doesn&apos;t work</h1>
        <p className="mt-2 text-center text-sm text-muted">The developer may have created a new link. Ask them to send it again.</p>
        <Link href="/" className="btn btn-soft mt-6 w-full">
          About {APP_NAME}
        </Link>
      </Shell>
    );
  }

  const { app, owner, slots, existingHandshakeId } = invite;
  const first = owner.name.split(" ")[0];
  const isOwner = user?.id === owner.id;
  const tooOld = user?.deviceAndroidApi != null && user.deviceAndroidApi < app.minAndroidApi;

  let action: React.ReactNode;
  if (isOwner) {
    action = (
      <Note>
        This is your own invite link. Send it to friends; each one who joins fills a tester slot.{" "}
        <Link href={`/apps/${app.id}`} className="font-medium text-ink underline">
          Back to {app.name}
        </Link>
      </Note>
    );
  } else if (existingHandshakeId) {
    action = (
      <Link href={`/handshakes/${existingHandshakeId}`} className="btn btn-dark h-12 w-full">
        You&apos;re already testing {app.name} →
      </Link>
    );
  } else if (app.status !== "open") {
    action = <Note>{app.name} isn&apos;t taking new testers right now{app.status === "full" ? ": all slots are filled" : ""}.</Note>;
  } else if (!user) {
    action = (
      <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn btn-dark h-12 w-full">
        Sign in to accept
      </Link>
    );
  } else if (!isOnboarded(user)) {
    action = (
      <Link href={`/onboarding?next=${encodeURIComponent(here)}`} className="btn btn-dark h-12 w-full">
        Finish a 1-minute setup to accept
      </Link>
    );
  } else if (tooOld) {
    action = <Note>Your phone runs an older Android version than {app.name} needs ({androidLabel(app.minAndroidApi)}+).</Note>;
  } else {
    action = (
      <ActionForm action={joinFriendAction}>
        <input type="hidden" name="code" value={code} />
        <SubmitButton className="btn btn-dark h-12 w-full" pendingText="Joining…">
          <Heart size={16} /> Test {app.name} for {first}
        </SubmitButton>
      </ActionForm>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <Avatar name={owner.name} src={owner.avatarUrl} size={36} ring={false} />
        <p className="text-sm text-ink-2">
          <b className="text-ink">{owner.name}</b> invited you to test their app
        </p>
      </div>

      <div className="card mt-5 flex items-center gap-4 p-4">
        <AppLogo name={app.name} src={app.logoUrl} size={56} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{app.name}</h1>
          {app.description && <p className="text-sm text-muted">{app.description}</p>}
          <p className="mt-1 text-xs text-faint">{androidLabel(app.minAndroidApi)}+</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Testers</span>
          <span>
            {slots.used}/{app.testerSlots}
          </span>
        </div>
        <SlotBar slots={slots} total={app.testerSlots} />
      </div>

      <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm text-ink-2">
        <p className="font-medium text-ink">No app swap needed</p>
        <p className="mt-1">
          You&apos;re helping {first} reach Google Play&apos;s 12-tester requirement. You don&apos;t need an app of your own.
        </p>
        <ol className="mt-3 space-y-1.5">
          <li>
            <b>1.</b> Opt in on Google Play with your Google account and install the app.
          </li>
          <li>
            <b>2.</b> Keep it installed for {app.durationDays || RULES.durationDays} days and open it now and then.
          </li>
          <li>
            <b>3.</b> Leave feedback if you spot something. It&apos;s optional.
          </li>
        </ol>
      </div>

      <div className="mt-6">{action}</div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="glass-shell w-full max-w-[460px] rounded-[28px] p-6 sm:p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark />
          <span className="font-semibold">{APP_NAME.toUpperCase()}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-2">{children}</p>;
}
