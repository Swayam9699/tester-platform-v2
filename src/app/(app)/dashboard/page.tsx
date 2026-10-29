import { ArrowUp, Search, SlidersHorizontal, Smartphone } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { AppLogo, SectionTitle, SlotBar, Sparkle, Stat, StatusBadge, TextLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { androidLabel } from "@/lib/android";
import { requireOnboardedUser } from "@/api/auth";
import { getDashboard } from "@/api/queries";
import { percent } from "@/lib/utils";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const db = await getDb();
  const d = await getDashboard(db, user);
  const first = user.name.split(" ")[0];

  const actions = [
    { href: "/apps/new", emoji: "🚀", title: "Submit your app", body: "List it and get 16 testers via handshakes" },
    { href: "/discover", emoji: "🧭", title: "Discover apps", body: "Find apps to test in exchange for yours" },
    {
      href: "/handshakes?due=1",
      emoji: "✅",
      title: d.due.length ? `Check in (${d.due.length} due)` : "Daily check-ins",
      body: d.due.length ? "Open each app and tick it off for today" : "You're all caught up for today",
    },
  ];

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <section className="flex flex-col items-center pt-4 text-center">
        <Sparkle size={128} className="sparkle-float" />
        <h1 className="mt-4 text-[34px] font-semibold tracking-tight sm:text-[40px]">Welcome, {first}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">How can we help you ship today?</p>

        <div className="mt-8 grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="group block text-left transition-transform hover:-translate-y-0.5">
              <Card className="h-full gap-0 p-4">
                <span className="text-[28px] leading-none">{a.emoji}</span>
                <p className="mt-6 text-sm font-semibold text-ink">{a.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{a.body}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <DashboardAlerts d={d} blockedUntil={user.blockedUntil} />

      <SectionTitle action={<TextLink href="/profile">Level details</TextLink>}>Your progress</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Level" value={user.level} hint={d.next ? `${d.next.completionsRequired - user.completedHandshakes} to level ${d.next.level}` : "Max level"}>
          {d.next && d.current && (
            <Progress
              className="mt-3"
              value={percent(user.completedHandshakes - d.current.completionsRequired, d.next.completionsRequired - d.current.completionsRequired)}
            />
          )}
        </Stat>
        <Stat label="Handshake slots" value={`${d.used}/${d.limit}`} hint="in use right now">
          <Progress className="mt-3" value={percent(d.used, d.limit)} />
        </Stat>
        <Stat label="Check-ins due" value={d.due.length} hint={`${d.sides.filter((s) => s.sideStatus === "active").length} apps you're testing`} />
        <Stat label="Reliability" value={`${user.reliabilityScore}`} hint={`${user.completedHandshakes} completed · ${user.failedHandshakes} failed`} />
      </div>

      <SectionTitle action={<TextLink href="/apps">All apps</TextLink>}>Your apps</SectionTitle>
      {d.myApps.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {d.myApps.slice(0, 4).map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="block">
              <Card className="h-full flex-row items-center gap-4 p-4 hover:bg-white/80">
                <AppLogo name={app.name} src={app.logoUrl} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{app.name}</p>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="mt-2.5">
                    <SlotBar slots={app.slots} total={app.testerSlots} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {app.slots.used}/{app.testerSlots} testers · {androidLabel(app.minAndroidApi)}+
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Link href="/apps/new" className="block">
          <Card className="block p-5 text-sm text-muted-foreground hover:text-ink">
            You haven&apos;t listed an app yet. <span className="font-medium text-ink underline">Submit your first app →</span>
          </Card>
        </Link>
      )}

      <div className="flex-1" />

      {/* Composer, as in the mockup: jump straight into Discover with a search. */}
      <Card className="mt-10 block p-3">
        <form action="/discover">
          <InputGroup className="h-10 border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupAddon>
              <Search size={15} />
            </InputGroupAddon>
            <InputGroupInput name="q" placeholder="Search apps to test by name or package…" aria-label="Search apps" />
          </InputGroup>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" className="pointer-events-none" nativeButton={false} render={<span />}>
              <Smartphone size={14} /> {androidLabel(user.deviceAndroidApi)}
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/discover" />}>
              <SlidersHorizontal size={14} /> Browse all
            </Button>
            <div className="flex-1" />
            <Button type="submit" size="icon" className="size-9" aria-label="Search">
              <ArrowUp size={16} />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
