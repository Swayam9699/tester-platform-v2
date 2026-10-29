import { notFound } from "next/navigation";
import { adminAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Avatar, Badge, EmptyState, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";
import { getAdmin } from "@/server/queries";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireOnboardedUser();
  if (!user.isAdmin) notFound();
  const a = await getAdmin(await getDb());

  return (
    <div>
      <PageHeader title="Admin" subtitle={`${a.openDisputes.length} open disputes · ${a.blockedCount} blocked users · daily job last ran for ${a.lastCron ?? "—"}`} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1 text-sm">
          <p className="font-medium">Daily job</p>
          <p className="text-xs text-muted">
            Platform time: {a.now.toUTCString().slice(0, 22)} UTC
            {a.demoMode ? ` · demo clock offset +${a.clockOffset}d` : ""}
          </p>
        </div>
        <ActionForm action={adminAction} className="flex flex-wrap items-center gap-2" messageClassName="basis-full text-right">
          <SubmitButton name="action" value="cron" className="btn btn-soft btn-sm">
            Run now
          </SubmitButton>
          {a.demoMode && (
            <>
              <input type="hidden" name="days" value="1" />
              <SubmitButton name="action" value="clock" className="btn btn-dark btn-sm" title="Advance the demo clock one day and run the daily job">
                +1 day ▶
              </SubmitButton>
            </>
          )}
        </ActionForm>
        {a.demoMode && a.clockOffset !== 0 && (
          <ActionForm action={adminAction} messageClassName="hidden">
            <input type="hidden" name="days" value="0" />
            <SubmitButton name="action" value="clock" className="btn btn-ghost btn-sm">
              Reset clock
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      <SectionTitle>Disputes</SectionTitle>
      {a.openDisputes.length === 0 ? (
        <EmptyState icon="⚖️" title="No open disputes" />
      ) : (
        <div className="space-y-3">
          {a.openDisputes.map(({ d, reporter, hs }) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-center gap-2 text-sm">
                <Avatar name={reporter.name} size={22} ring={false} />
                <b>{reporter.name}</b>
                <span className="text-muted">reported handshake</span>
                <StatusBadge status={hs.status} />
              </div>
              <p className="mt-2 text-sm text-ink-2">“{d.reason}”</p>
              <ActionForm action={adminAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="disputeId" value={d.id} />
                <input name="resolution" className="field h-9 flex-1" placeholder="Resolution note (sent to reporter)" />
                <SubmitButton name="action" value="dismiss" className="btn btn-ghost btn-sm">Dismiss</SubmitButton>
                <SubmitButton name="action" value="resolve" className="btn btn-dark btn-sm">Resolve</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Opt-in proof review</SectionTitle>
      {a.proofs.length === 0 ? (
        <EmptyState icon="🖼️" title="No proofs to review" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {a.proofs.map(({ side, hs, tester, app }) => (
            <div key={side.id} className="card overflow-hidden">
              <a href={side.optinProofUrl!} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={side.optinProofUrl!} alt={`Proof from ${tester.name}`} className="h-40 w-full bg-canvas object-cover object-top" />
              </a>
              <div className="p-3 text-xs">
                <p className="truncate">
                  <b>{tester.name}</b> → {app.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <StatusBadge status={hs.status} />
                  <StatusBadge status={side.status} />
                </div>
                <ActionForm action={adminAction} className="mt-2">
                  <input type="hidden" name="sideId" value={side.id} />
                  {hs.status === "accepted" ? (
                    <SubmitButton name="action" value="rejectProof" className="btn btn-soft btn-sm w-full">Reject proof</SubmitButton>
                  ) : (
                    <SubmitButton name="action" value="markSkipped" className="btn btn-danger btn-sm w-full">Mark as skipped</SubmitButton>
                  )}
                </ActionForm>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Users & bans</SectionTitle>
      <div className="card divide-y divide-line">
        {a.users.map((u) => {
          const blocked = u.blockedUntil && u.blockedUntil > a.now;
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <Avatar name={u.name} src={u.avatarUrl} size={28} ring={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.name} {u.isAdmin && <Badge tone="info">admin</Badge>}
                </p>
                <p className="truncate text-xs text-muted">
                  {u.googleEmail} · L{u.level} · reliability {u.reliabilityScore} · {u.completedHandshakes}✓ {u.failedHandshakes}✗
                </p>
              </div>
              {blocked && <Badge tone="bad">blocked until {u.blockedUntil!.toISOString().slice(0, 10)}</Badge>}
              <ActionForm action={adminAction} className="flex gap-1" messageClassName="hidden">
                <input type="hidden" name="userId" value={u.id} />
                {blocked ? (
                  <SubmitButton name="action" value="unblock" className="btn btn-soft btn-sm">Unblock</SubmitButton>
                ) : (
                  <>
                    <input type="hidden" name="days" value="30" />
                    <input type="hidden" name="reason" value="Banned by an admin" />
                    {!u.isAdmin && <SubmitButton name="action" value="ban" className="btn btn-ghost btn-sm text-bad">Ban 30d</SubmitButton>}
                  </>
                )}
              </ActionForm>
            </div>
          );
        })}
      </div>
    </div>
  );
}
