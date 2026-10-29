import { signOut } from "@/actions/auth";
import { getDb } from "@/db";
import { PageHeader, SectionTitle, Stat, UserAvatar } from "@/components/common";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, percent } from "@/lib/utils";
import { requireOnboardedUser } from "@/api/auth";
import { getProfile } from "@/api/queries";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const p = await getProfile(await getDb(), user);
  const current = p.levels.find((l) => l.level === user.level);
  const next = p.levels.find((l) => l.level === user.level + 1);

  return (
    <div>
      <PageHeader title="Profile" />
      <Card className="flex-row flex-wrap items-center gap-4 p-5">
        <UserAvatar name={user.name} src={user.avatarUrl} size={56} ring={false} />
        <div className="flex-1">
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.googleEmail}</p>
          {user.playEmail !== user.googleEmail && <p className="text-xs text-faint">Google Play: {user.playEmail}</p>}
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </Card>

      {p.blocked && (
        <div className="mt-4 rounded-2xl bg-bad-soft p-4 text-sm text-bad">
          <b>Blocked until {user.blockedUntil!.toUTCString().slice(0, 22)}.</b> You can keep testing in your current handshakes, but can&apos;t send or accept new ones.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Level" value={user.level} hint={`${p.limit} handshake slots`}>
          {next && current && (
            <>
              <Progress className="mt-3" value={percent(user.completedHandshakes - current.completionsRequired, next.completionsRequired - current.completionsRequired)} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {next.completionsRequired - user.completedHandshakes} more to level {next.level}
              </p>
            </>
          )}
        </Stat>
        <Stat label="Slots in use" value={`${p.used}/${p.limit}`} />
        <Stat label="Reliability" value={user.reliabilityScore} hint="out of 100">
          <Progress className="mt-3" value={percent(user.reliabilityScore, 100)} />
        </Stat>
        <Stat label="Completed / failed" value={`${user.completedHandshakes} / ${user.failedHandshakes}`} />
      </div>

      <SectionTitle>Levels</SectionTitle>
      <Card className="block overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-canvas">
            <TableRow>
              <TableHead className="px-4 text-xs text-muted-foreground">Level</TableHead>
              <TableHead className="px-4 text-xs text-muted-foreground">Active handshakes at once</TableHead>
              <TableHead className="px-4 text-xs text-muted-foreground">Completed handshakes needed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.levels.map((l) => (
              <TableRow key={l.level} className={cn(l.level === user.level && "bg-[#fff6f1] font-semibold hover:bg-[#fff6f1]")}>
                <TableCell className="px-4 py-2.5">
                  {l.level}
                  {l.level === user.level && " (you)"}
                </TableCell>
                <TableCell className="px-4 py-2.5">{l.activeSlots}</TableCell>
                <TableCell className="px-4 py-2.5">{l.completionsRequired}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <SectionTitle>Settings</SectionTitle>
      <ProfileForm name={user.name} playEmail={user.playEmail} deviceAndroidApi={user.deviceAndroidApi} />

      {p.blocks.length > 0 && (
        <>
          <SectionTitle>Block history</SectionTitle>
          <Card className="gap-0 divide-y divide-line py-0">
            {p.blocks.map((b) => (
              <div key={b.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-ink-2">{b.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {b.startsAt.toISOString().slice(0, 10)} → {b.endsAt.toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
