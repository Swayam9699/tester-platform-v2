import { AlertTriangle, ArrowUp, Inbox, Search, ShieldAlert, SlidersHorizontal, Smartphone, Upload } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { AppLogo, Progress, SectionTitle, SlotBar, Sparkle, Stat, StatusBadge, TextLink } from "@/components/ui";
import { androidLabel } from "@/lib/android";
import { requireOnboardedUser } from "@/server/auth";
import { getDashboard } from "@/server/queries";

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
        <p className="mt-2 text-sm text-muted">How can we help you ship today?</p>

        <div className="mt-8 grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="card group p-4 text-left transition-transform hover:-translate-y-0.5">
              <span className="text-[28px] leading-none">{a.emoji}</span>
              <p className="mt-6 text-sm font-semibold text-ink">{a.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">{a.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <Alerts d={d} blockedUntil={user.blockedUntil} />

      <SectionTitle action={<TextLink href="/profile">Level details</TextLink>}>Your progress</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Level" value={user.level} hint={d.next ? `${d.next.completionsRequired - user.completedHandshakes} to level ${d.next.level}` : "Max level"}>
          {d.next && d.current && (
            <Progress
              className="mt-3"
              value={user.completedHandshakes - d.current.completionsRequired}
              max={d.next.completionsRequired - d.current.completionsRequired}
            />
          )}
        </Stat>
        <Stat label="Handshake slots" value={`${d.used}/${d.limit}`} hint="in use right now">
          <Progress className="mt-3" value={d.used} max={d.limit} />
        </Stat>
        <Stat label="Check-ins due" value={d.due.length} hint={`${d.sides.filter((s) => s.sideStatus === "active").length} apps you're testing`} />
        <Stat label="Reliability" value={`${user.reliabilityScore}`} hint={`${user.completedHandshakes} completed · ${user.failedHandshakes} failed`} />
      </div>

      <SectionTitle action={<TextLink href="/apps">All apps</TextLink>}>Your apps</SectionTitle>
      {d.myApps.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {d.myApps.slice(0, 4).map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="card flex items-center gap-4 p-4 hover:bg-white/80">
              <AppLogo name={app.name} src={app.logoUrl} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{app.name}</p>
                  <StatusBadge status={app.status} />
                </div>
                <div className="mt-2.5">
                  <SlotBar slots={app.slots} total={app.testerSlots} />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {app.slots.used}/{app.testerSlots} testers · {androidLabel(app.minAndroidApi)}+
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Link href="/apps/new" className="card block p-5 text-sm text-muted hover:text-ink">
          You haven&apos;t listed an app yet. <span className="font-medium text-ink underline">Submit your first app →</span>
        </Link>
      )}

      <div className="flex-1" />

      {/* Composer, as in the mockup: jump straight into Discover with a search. */}
      <form action="/discover" className="card mt-10 p-3">
        <label className="flex items-center gap-2 px-2 pt-1 text-sm">
          <Search size={15} className="text-muted" />
          <input name="q" placeholder="Search apps to test by name or package…" className="w-full bg-transparent py-1.5 outline-none placeholder:text-faint" />
        </label>
        <div className="mt-3 flex items-center gap-2">
          <span className="btn btn-soft btn-sm pointer-events-none">
            <Smartphone size={14} /> {androidLabel(user.deviceAndroidApi)}
          </span>
          <Link href="/discover" className="btn btn-soft btn-sm">
            <SlidersHorizontal size={14} /> Browse all
          </Link>
          <div className="flex-1" />
          <button className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white shadow-md" aria-label="Search">
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Alerts({ d, blockedUntil }: { d: Awaited<ReturnType<typeof getDashboard>>; blockedUntil: Date | null }) {
  const items: { icon: React.ReactNode; tone: string; text: React.ReactNode; href: string }[] = [];
  if (d.blocked) {
    items.push({
      icon: <ShieldAlert size={16} />,
      tone: "bg-bad-soft text-bad",
      text: (
        <>
          You&apos;re blocked from new handshakes until <b>{blockedUntil?.toUTCString().slice(0, 16)}</b>. Existing handshakes continue.
        </>
      ),
      href: "/profile",
    });
  }
  for (const s of d.needProof) {
    items.push({
      icon: <Upload size={16} />,
      tone: "bg-warn-soft text-warn",
      text: (
        <>
          Opt in to <b>{s.app.name}</b> and upload your screenshot
          {s.deadlineAt ? ` — ${Math.max(0, Math.round((s.deadlineAt.getTime() - d.now.getTime()) / 3_600_000))}h left` : ""}
        </>
      ),
      href: `/handshakes/${s.handshakeId}`,
    });
  }
  for (const s of d.atRisk) {
    items.push({
      icon: <AlertTriangle size={16} />,
      tone: "bg-bad-soft text-bad",
      text: (
        <>
          You missed {s.missedStreak} check-in{s.missedStreak > 1 ? "s" : ""} on <b>{s.app.name}</b>. 3 in a row breaks the handshake.
        </>
      ),
      href: `/handshakes/${s.handshakeId}`,
    });
  }
  if (d.incoming) {
    items.push({
      icon: <Inbox size={16} />,
      tone: "bg-info-soft text-info",
      text: (
        <>
          {d.incoming} developer{d.incoming > 1 ? "s want" : " wants"} to swap tests with you
        </>
      ),
      href: "/requests",
    });
  }
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>Needs your attention</SectionTitle>
      <div className="space-y-2">
        {items.map((it, i) => (
          <Link key={i} href={it.href} className="card flex items-center gap-3 p-3 text-sm hover:bg-white/80">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${it.tone}`}>{it.icon}</span>
            <span className="flex-1 text-ink-2">{it.text}</span>
            <span className="text-muted">→</span>
          </Link>
        ))}
      </div>
    </>
  );
}
