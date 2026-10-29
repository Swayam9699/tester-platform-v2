import { EmptyState, SectionTitle, StatusBadge, UserAvatar } from "@/components/common";
import { SideRow } from "@/components/handshakes/SideRow";
import { Card } from "@/components/ui/card";
import { getFriendTesting } from "@/api/queries";

export function FriendHistory({ d }: { d: Awaited<ReturnType<typeof getFriendTesting>> }) {
  if (!d.tested.length && !d.pastFriends.length) {
    return <EmptyState icon="🌱" title="No finished friend tests yet" body="Friend tests that complete or end early show up here." />;
  }
  return (
    <>
      {d.pastFriends.length > 0 && (
        <>
          <SectionTitle>Friends who tested your apps</SectionTitle>
          <Card className="gap-0 divide-y divide-line py-0">
            {d.pastFriends.map((f) => (
              <div key={f.handshakeId} className="flex items-center gap-3 px-4 py-3 text-sm">
                <UserAvatar name={f.tester.name} src={f.tester.avatarUrl} size={32} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.tester.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.appName} · {f.checkinCount} check-in{f.checkinCount === 1 ? "" : "s"}
                    {f.endedReason ? ` · ${f.endedReason}` : ""}
                  </p>
                </div>
                <StatusBadge status={f.hsStatus} />
              </div>
            ))}
          </Card>
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
