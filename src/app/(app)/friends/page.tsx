import { Heart } from "lucide-react";
import Link from "next/link";
import { leaveFriendAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { InviteLink } from "@/components/InviteCard";
import { SideRow } from "@/components/SideRow";
import { AppLogo, Avatar, cx, EmptyState, PageHeader, Progress, SectionTitle, SlotBar, Stat, StatusBadge } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";
import { getOrigin } from "@/server/origin";
import { getFriendTesting, type FriendTester } from "@/server/queries";

export const metadata = { title: "Friend testing" };

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "apps" } = await searchParams;
  const user = await requireOnboardedUser();
  const [d, origin] = await Promise.all([getFriendTesting(await getDb(), user.id), getOrigin()]);

  const tabs = [
    { key: "apps", label: "Your apps", count: d.stats.activeFriends },
    { key: "testing", label: "Testing for friends", count: d.testing.length },
    { key: "history", label: "History" },
  ];

  return (
    <div>
      <PageHeader
        title="Friend testing"
        subtitle="Testers who help without a swap. Share an invite link with friends, or follow the apps you're testing for them."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Friends testing your apps" value={d.stats.activeFriends} hint="Each one fills a tester slot" />
        <Stat label="Finished by friends" value={d.stats.completedFriends} hint="Count toward Google's 12 testers" />
        <Stat label="You're testing for friends" value={d.testing.length} hint="No swap, no penalties" />
      </div>

      <div className="mb-5 mt-8 inline-flex max-w-full overflow-x-auto rounded-full bg-black/[0.05] p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "apps" ? "/friends" : `/friends?tab=${t.key}`}
            className={cx("whitespace-nowrap rounded-full px-4 py-1.5 text-sm", tab === t.key ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink")}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-xs text-muted">{t.count}</span> : null}
          </Link>
        ))}
      </div>

      {tab === "testing" ? (
        d.testing.length ? (
          <div className="space-y-3">
            {d.testing.map((s) => (
              <SideRow key={s.sideId} s={s} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="💌"
            title="You're not testing for any friends"
            body="When a developer sends you their invite link and you accept, their app shows up here."
          />
        )
      ) : tab === "history" ? (
        <History d={d} />
      ) : d.apps.length ? (
        <div className="space-y-4">
          {d.apps.map(({ app, slots, friends }) => (
            <section key={app.id} className="card p-5">
              <div className="flex items-center gap-3">
                <AppLogo name={app.name} src={app.logoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/apps/${app.id}`} className="truncate font-semibold hover:underline">
                      {app.name}
                    </Link>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-muted">
                    {slots.used}/{app.testerSlots} testers · {friends.length} friend{friends.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <SlotBar slots={slots} total={app.testerSlots} />
              </div>

              {(app.status === "open" || app.status === "full") && (
                <InviteLink appId={app.id} appName={app.name} url={`${origin}/invite/${app.inviteCode}`} open={app.status === "open"} className="mt-4" />
              )}

              {friends.length ? (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {friends.map((f) => (
                    <FriendRow key={f.handshakeId} f={f} now={d.now} />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-line pt-4 text-sm text-muted">No friends testing yet. Send them the link above.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="mx-auto text-coral" size={28} />}
          title="Publish an app to invite friends"
          body="Every app open for testers gets its own invite link. Friends who join fill tester slots without you testing anything back."
          action={
            <Link href="/apps/new" className="btn btn-dark">
              Submit an app
            </Link>
          }
        />
      )}
    </div>
  );
}

function FriendRow({ f, now }: { f: FriendTester; now: Date }) {
  const hoursLeft = f.deadlineAt ? Math.max(0, Math.round((f.deadlineAt.getTime() - now.getTime()) / 3_600_000)) : null;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm sm:flex-nowrap">
      <Avatar name={f.tester.name} src={f.tester.avatarUrl} size={32} ring={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{f.tester.name}</p>
        <p className="text-xs text-muted">
          {f.sideStatus === "pending"
            ? `Needs to opt in on Google Play${hoursLeft != null ? ` · ${hoursLeft}h left` : ""}`
            : `${f.checkinCount} check-in${f.checkinCount === 1 ? "" : "s"}${f.checkedToday ? " · opened today ✓" : ""}`}
        </p>
      </div>
      {f.sideStatus === "active" && (
        <div className="w-full sm:w-36">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>
              Day {f.day}/{f.totalDays}
            </span>
            <span>{f.totalDays - f.day}d left</span>
          </div>
          <Progress value={f.day} max={f.totalDays} />
        </div>
      )}
      <StatusBadge status={f.sideStatus} />
      <ActionForm action={leaveFriendAction} messageClassName="hidden">
        <input type="hidden" name="handshakeId" value={f.handshakeId} />
        <SubmitButton className="btn btn-ghost btn-sm text-muted" pendingText="…" title={`Remove ${f.tester.name} and free the slot`}>
          Remove
        </SubmitButton>
      </ActionForm>
    </li>
  );
}

function History({ d }: { d: Awaited<ReturnType<typeof getFriendTesting>> }) {
  if (!d.tested.length && !d.pastFriends.length) {
    return <EmptyState icon="🌱" title="No finished friend tests yet" body="Friend tests that complete or end early show up here." />;
  }
  return (
    <>
      {d.pastFriends.length > 0 && (
        <>
          <SectionTitle>Friends who tested your apps</SectionTitle>
          <div className="card divide-y divide-line">
            {d.pastFriends.map((f) => (
              <div key={f.handshakeId} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Avatar name={f.tester.name} src={f.tester.avatarUrl} size={32} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.tester.name}</p>
                  <p className="truncate text-xs text-muted">
                    {f.appName} · {f.checkinCount} check-in{f.checkinCount === 1 ? "" : "s"}
                    {f.endedReason ? ` · ${f.endedReason}` : ""}
                  </p>
                </div>
                <StatusBadge status={f.hsStatus} />
              </div>
            ))}
          </div>
        </>
      )}
      {d.tested.length > 0 && (
        <>
          <SectionTitle>Apps you tested for friends</SectionTitle>
          <div className="space-y-3">
            {d.tested.map((s) => (
              <SideRow key={s.sideId} s={s} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
