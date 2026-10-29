import { Clock } from "lucide-react";
import { respondAction } from "@/actions/handshakes";
import { getDb } from "@/db";
import { EmptyState, PageHeader, SectionTitle, StatusBadge, UserAvatar } from "@/components/common";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireOnboardedUser } from "@/api/auth";
import { getRequests } from "@/api/queries";
import { Swap } from "@/components/requests/Swap";

export const metadata = { title: "Requests" };

type Row = Awaited<ReturnType<typeof getRequests>>["incoming"][number];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const user = await requireOnboardedUser();
  const { incoming, outgoing, history, now } = await getRequests(await getDb(), user.id);
  const hoursLeft = (r: Row) => Math.max(0, Math.round(((r.hs.deadlineAt?.getTime() ?? 0) - now.getTime()) / 3_600_000));

  return (
    <div>
      <PageHeader title="Requests" subtitle="Requests expire after 48 hours. Accepting checks both sides' free slots at once." />
      {sent && (
        <div className="mb-2 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          ✓ Request sent. The developer has 48 hours to accept — you&apos;ll get a notification either way.
        </div>
      )}

      <SectionTitle>Incoming ({incoming.length})</SectionTitle>
      {incoming.length === 0 ? (
        <EmptyState icon="📬" title="No incoming requests" body="When someone wants to test your app in exchange for theirs, it shows up here." />
      ) : (
        <div className="space-y-3">
          {incoming.map((r) => (
            <Card key={r.hs.id} className="block p-5">
              <div className="flex flex-wrap items-center gap-3">
                <UserAvatar name={r.userA.name} src={r.userA.avatarUrl} size={36} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <b>{r.userA.name}</b> wants to test <b>{r.appB.name}</b>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reliability {r.userA.reliabilityScore} · {r.userA.completedHandshakes} completed · Level {r.userA.level}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-warn">
                  <Clock size={12} /> {hoursLeft(r)}h left
                </span>
              </div>
              <Swap you={r.appB} them={r.appA} youLabel="They test" themLabel="You test" />
              {r.hs.message && <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm text-ink-2">“{r.hs.message}”</p>}
              <ActionForm action={respondAction} className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Input type="hidden" name="handshakeId" value={r.hs.id} />
                <SubmitButton name="action" value="reject" variant="ghost" size="sm">
                  Decline
                </SubmitButton>
                <SubmitButton name="action" value="accept" size="sm" pendingText="Accepting…">
                  Accept handshake
                </SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Outgoing ({outgoing.length})</SectionTitle>
      {outgoing.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests. Find apps in Discover.</p>
      ) : (
        <div className="space-y-3">
          {outgoing.map((r) => (
            <Card key={r.hs.id} className="flex-row flex-wrap items-center gap-4 p-4">
              <Swap you={r.appA} them={r.appB} youLabel="They test" themLabel="You test" compact />
              <div className="flex-1 text-xs text-muted-foreground">
                Waiting for <b className="text-ink-2">{r.userB.name}</b> · {hoursLeft(r)}h left
              </div>
              <ActionForm action={respondAction} className="flex items-center">
                <Input type="hidden" name="handshakeId" value={r.hs.id} />
                <SubmitButton name="action" value="cancel" variant="outline" size="sm">
                  Withdraw
                </SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <SectionTitle>Recently closed</SectionTitle>
          <Card className="gap-0 divide-y divide-line py-0">
            {history.map((r) => (
              <div key={r.hs.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1 truncate text-ink-2">
                  {r.userA.id === user.id ? `You → ${r.userB.name}` : `${r.userA.name} → you`} · {r.appB.name}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{r.hs.endedReason}</span>
                <StatusBadge status={r.hs.status} />
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
