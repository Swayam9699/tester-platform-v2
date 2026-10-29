import { Heart } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { AppLogo, EmptyState, PageHeader, SlotBar, Stat, StatusBadge } from "@/components/common";
import { InviteLink } from "@/components/handshakes/InviteLink";
import { SideRow } from "@/components/handshakes/SideRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireOnboardedUser } from "@/api/auth";
import { getOrigin } from "@/api/origin";
import { getFriendTesting } from "@/api/queries";
import { FriendRow } from "@/components/friends/FriendRow";
import { FriendHistory } from "@/components/friends/FriendHistory";

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
            className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-sm", tab === t.key ? "bg-white font-medium shadow-sm" : "text-muted-foreground hover:text-ink")}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span> : null}
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
        <FriendHistory d={d} />
      ) : d.apps.length ? (
        <div className="space-y-4">
          {d.apps.map(({ app, slots, friends }) => (
            <Card key={app.id} className="block p-5">
              <div className="flex items-center gap-3">
                <AppLogo name={app.name} src={app.logoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/apps/${app.id}`} className="truncate font-semibold hover:underline">
                      {app.name}
                    </Link>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
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
                <p className="mt-4 border-t border-line pt-4 text-sm text-muted-foreground">No friends testing yet. Send them the link above.</p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="mx-auto text-coral" size={28} />}
          title="Publish an app to invite friends"
          body="Every app open for testers gets its own invite link. Friends who join fill tester slots without you testing anything back."
          action={
            <Button nativeButton={false} render={<Link href="/apps/new" />}>
              Submit an app
            </Button>
          }
        />
      )}
    </div>
  );
}
