import { ArrowLeftRight, Clock } from "lucide-react";
import { respondAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AppLogo, Avatar, EmptyState, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";
import { getRequests } from "@/server/queries";

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
            <div key={r.hs.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={r.userA.name} src={r.userA.avatarUrl} size={36} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <b>{r.userA.name}</b> wants to test <b>{r.appB.name}</b>
                  </p>
                  <p className="text-xs text-muted">
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
                <input type="hidden" name="handshakeId" value={r.hs.id} />
                <SubmitButton name="action" value="reject" className="btn btn-ghost btn-sm">
                  Decline
                </SubmitButton>
                <SubmitButton name="action" value="accept" className="btn btn-dark btn-sm" pendingText="Accepting…">
                  Accept handshake
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Outgoing ({outgoing.length})</SectionTitle>
      {outgoing.length === 0 ? (
        <p className="text-sm text-muted">No pending requests. Find apps in Discover.</p>
      ) : (
        <div className="space-y-3">
          {outgoing.map((r) => (
            <div key={r.hs.id} className="card flex flex-wrap items-center gap-4 p-4">
              <Swap you={r.appA} them={r.appB} youLabel="They test" themLabel="You test" compact />
              <div className="flex-1 text-xs text-muted">
                Waiting for <b className="text-ink-2">{r.userB.name}</b> · {hoursLeft(r)}h left
              </div>
              <ActionForm action={respondAction} className="flex items-center" messageClassName="ml-2">
                <input type="hidden" name="handshakeId" value={r.hs.id} />
                <SubmitButton name="action" value="cancel" className="btn btn-soft btn-sm">
                  Withdraw
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <SectionTitle>Recently closed</SectionTitle>
          <div className="card divide-y divide-line">
            {history.map((r) => (
              <div key={r.hs.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1 truncate text-ink-2">
                  {r.userA.id === user.id ? `You → ${r.userB.name}` : `${r.userA.name} → you`} · {r.appB.name}
                </span>
                <span className="hidden text-xs text-muted sm:inline">{r.hs.endedReason}</span>
                <StatusBadge status={r.hs.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Swap({
  you,
  them,
  youLabel,
  themLabel,
  compact,
}: {
  you: { name: string; logoUrl: string | null };
  them: { name: string; logoUrl: string | null };
  youLabel: string;
  themLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-3" : "mt-4 flex items-center gap-3 rounded-2xl bg-canvas p-3"}>
      <AppSlot label={themLabel} app={them} />
      <ArrowLeftRight size={16} className="shrink-0 text-muted" />
      <AppSlot label={youLabel} app={you} />
    </div>
  );
}

function AppSlot({ label, app }: { label: string; app: { name: string; logoUrl: string | null } }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <AppLogo name={app.name} src={app.logoUrl} size={32} />
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm font-medium">{app.name}</p>
      </div>
    </div>
  );
}
