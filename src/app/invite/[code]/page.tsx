import { Heart } from "lucide-react";
import Link from "next/link";
import { joinFriendAction } from "@/actions/handshakes";
import { getDb } from "@/db";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppLogo, SlotBar, UserAvatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { androidLabel } from "@/lib/android";
import { APP_NAME, RULES } from "@/lib/config";
import { getSessionUser, isOnboarded } from "@/api/auth";
import { getInvite } from "@/api/queries";
import { InviteShell } from "@/components/invite/InviteShell";
import { InviteNote } from "@/components/invite/InviteNote";

export const metadata = { title: "You're invited to test" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  const invite = await getInvite(await getDb(), code, user);
  const here = `/invite/${code}`;

  if (!invite) {
    return (
      <InviteShell>
        <h1 className="text-center text-2xl font-semibold tracking-tight">This invite link doesn&apos;t work</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">The developer may have created a new link. Ask them to send it again.</p>
        <Button variant="outline" className="mt-6 w-full" nativeButton={false} render={<Link href="/" />}>
          About {APP_NAME}
        </Button>
      </InviteShell>
    );
  }

  const { app, owner, slots, existingHandshakeId } = invite;
  const first = owner.name.split(" ")[0];
  const isOwner = user?.id === owner.id;
  const tooOld = user?.deviceAndroidApi != null && user.deviceAndroidApi < app.minAndroidApi;

  let action: React.ReactNode;
  if (isOwner) {
    action = (
      <InviteNote>
        This is your own invite link. Send it to friends; each one who joins fills a tester slot.{" "}
        <Link href={`/apps/${app.id}`} className="font-medium text-ink underline">
          Back to {app.name}
        </Link>
      </InviteNote>
    );
  } else if (existingHandshakeId) {
    action = (
      <Button size="lg" className="w-full" nativeButton={false} render={<Link href={`/handshakes/${existingHandshakeId}`} />}>
        You&apos;re already testing {app.name} →
      </Button>
    );
  } else if (app.status !== "open") {
    action = <InviteNote>{app.name} isn&apos;t taking new testers right now{app.status === "full" ? ": all slots are filled" : ""}.</InviteNote>;
  } else if (!user) {
    action = (
      <Button size="lg" className="w-full" nativeButton={false} render={<Link href={`/login?next=${encodeURIComponent(here)}`} />}>
        Sign in to accept
      </Button>
    );
  } else if (!isOnboarded(user)) {
    action = (
      <Button size="lg" className="w-full" nativeButton={false} render={<Link href={`/onboarding?next=${encodeURIComponent(here)}`} />}>
        Finish a 1-minute setup to accept
      </Button>
    );
  } else if (tooOld) {
    action = <InviteNote>Your phone runs an older Android version than {app.name} needs ({androidLabel(app.minAndroidApi)}+).</InviteNote>;
  } else {
    action = (
      <ActionForm action={joinFriendAction}>
        <Input type="hidden" name="code" value={code} />
        <SubmitButton size="lg" className="w-full" pendingText="Joining…">
          <Heart size={16} /> Test {app.name} for {first}
        </SubmitButton>
      </ActionForm>
    );
  }

  return (
    <InviteShell>
      <div className="flex items-center gap-3">
        <UserAvatar name={owner.name} src={owner.avatarUrl} size={36} ring={false} />
        <p className="text-sm text-ink-2">
          <b className="text-ink">{owner.name}</b> invited you to test their app
        </p>
      </div>

      <Card className="mt-5 flex-row items-center gap-4 p-4">
        <AppLogo name={app.name} src={app.logoUrl} size={56} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{app.name}</h1>
          {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}
          <p className="mt-1 text-xs text-faint">{androidLabel(app.minAndroidApi)}+</p>
        </div>
      </Card>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
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
    </InviteShell>
  );
}
