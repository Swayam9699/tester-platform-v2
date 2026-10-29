import { Search, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { getDb } from "@/db";
import { RequestDialog } from "@/components/RequestDialog";
import { AppLogo, Avatar, Badge, EmptyState, PageHeader, SlotBar } from "@/components/ui";
import { androidLabel } from "@/lib/android";
import { requireOnboardedUser } from "@/server/auth";
import { getDiscover } from "@/server/queries";

export const metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await requireOnboardedUser();
  const db = await getDb();
  const d = await getDiscover(db, user, q);
  const noSlots = d.used >= d.limit;
  const disabledReason = d.blocked
    ? `You're blocked until ${d.blockedUntil?.toUTCString().slice(0, 16)}`
    : noSlots
      ? `All ${d.limit} handshake slots are in use`
      : undefined;

  return (
    <div>
      <PageHeader
        title="Discover"
        subtitle={
          <>
            Apps that run on your {androidLabel(user.deviceAndroidApi)} device and still need testers. {d.used}/{d.limit} handshake slots in use.
          </>
        }
      />

      <form className="mb-6 flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm focus-within:border-[#c9cbd0]">
          <Search size={16} className="text-muted" />
          <input name="q" defaultValue={q} placeholder="Search by app name or package…" className="w-full bg-transparent outline-none placeholder:text-faint" />
        </label>
        <button className="btn btn-dark h-11">Search</button>
      </form>

      {disabledReason && (
        <div className="mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">{disabledReason}. You can still browse.</div>
      )}

      {d.cards.length === 0 ? (
        <EmptyState
          icon="🔭"
          title={q ? `No open apps match “${q}”` : "No apps to test right now"}
          body="You've either requested every compatible app already, or new apps haven't been listed yet. Check back soon."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {d.cards.map(({ app, owner, slots, priority, offerable }) => (
            <article key={app.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <AppLogo name={app.name} src={app.logoUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{app.name}</h3>
                    {priority && (
                      <Badge tone="warn">
                        <Zap size={10} /> Needs a tester
                      </Badge>
                    )}
                  </div>
                  <p className="truncate font-mono text-[11.5px] text-muted">{app.packageName}</p>
                </div>
              </div>
              {app.description && <p className="mt-3 line-clamp-2 text-sm text-ink-2">{app.description}</p>}

              <div className="mt-4">
                <SlotBar slots={slots} total={app.testerSlots} />
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {slots.used}/{app.testerSlots} testers
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Smartphone size={12} /> {androidLabel(app.minAndroidApi)}+
                  </span>
                  <span>{app.durationDays} days</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={owner.name} src={owner.avatarUrl} size={28} ring={false} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{owner.name}</p>
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <ShieldCheck size={11} /> {owner.reliability} reliability
                    </p>
                  </div>
                </div>
                <RequestDialog
                  targetAppId={app.id}
                  targetName={app.name}
                  ownerName={owner.name}
                  offerable={offerable}
                  hasOpenApps={d.myOpenApps.length > 0}
                  disabledReason={disabledReason}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
