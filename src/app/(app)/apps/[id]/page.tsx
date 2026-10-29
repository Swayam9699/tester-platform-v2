import { ExternalLink, Pencil, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appLifecycleAction, leaveFriendAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { InviteCard } from "@/components/InviteCard";
import { AppLogo, Avatar, Badge, EmptyState, SectionTitle, SlotBar, StatusBadge } from "@/components/ui";
import { androidLabel } from "@/lib/android";
import { requireOnboardedUser } from "@/server/auth";
import { getOrigin } from "@/server/origin";
import { getAppDetail } from "@/server/queries";

export default async function AppDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ published?: string }> }) {
  const [{ id }, { published }] = await Promise.all([params, searchParams]);
  const user = await requireOnboardedUser();
  const d = await getAppDetail(await getDb(), user.id, id);
  if (!d) notFound();
  const { app, slots, testers, reviews } = d;
  const completedCount = slots.completed;
  const inviteUrl = `${await getOrigin()}/invite/${app.inviteCode}`;
  const live = app.status === "open" || app.status === "full";

  const lifecycle = (action: string, label: string, cls = "btn btn-soft btn-sm") => (
    <ActionForm action={appLifecycleAction} messageClassName="hidden">
      <input type="hidden" name="appId" value={app.id} />
      <SubmitButton name="action" value={action} className={cls}>
        {label}
      </SubmitButton>
    </ActionForm>
  );

  return (
    <div>
      {published && (
        <div className="mb-5 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          🎉 {app.name} is live in Discover. Requests will appear under Requests. Have friends who can help? Send them your invite link below.
        </div>
      )}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <AppLogo name={app.name} src={app.logoUrl} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{app.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="font-mono text-xs text-muted">{app.packageName}</p>
            {app.description && <p className="mt-2 text-sm text-ink-2">{app.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{androidLabel(app.minAndroidApi)}+</span>
              <span>{app.durationDays}-day campaign</span>
              <a href={app.joinWebLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                Join link <ExternalLink size={11} />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/apps/${app.id}/edit`} className="btn btn-soft btn-sm">
              <Pencil size={13} /> Edit
            </Link>
            {app.status === "draft" && lifecycle("delete", "Delete draft", "btn btn-danger btn-sm")}
            {(app.status === "open" || app.status === "full") && lifecycle("complete", "Got production access")}
            {(app.status === "open" || app.status === "full") && lifecycle("archive", "Archive")}
            {(app.status === "completed" || app.status === "archived") && lifecycle("reopen", "Reopen")}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Testers</span>
            <span className="text-muted">
              {slots.used}/{app.testerSlots} slots · {completedCount >= 12 ? "✓ Google's 12-tester bar reached" : `${Math.max(0, 12 - completedCount)} more completions to reach 12`}
            </span>
          </div>
          <SlotBar slots={slots} total={app.testerSlots} showLegend />
        </div>
      </div>

      {live && (
        <div className="mt-4">
          <InviteCard appId={app.id} appName={app.name} url={inviteUrl} open={app.status === "open"} />
        </div>
      )}

      <SectionTitle>Testers ({testers.length})</SectionTitle>
      {testers.length === 0 ? (
        <EmptyState icon="🤝" title="No testers yet" body="Accept incoming requests, request handshakes from Discover, or invite friends with your link. Each one brings a tester." />
      ) : (
        <div className="card divide-y divide-line">
          {testers.map(({ side, hs, tester }) => (
            <div key={side.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Avatar name={tester.name} src={tester.avatarUrl} size={32} ring={false} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {tester.name}
                  {hs.kind === "friend" && <Badge tone="warn">friend</Badge>}
                </p>
                <p className="text-xs text-muted">
                  {side.checkinCount} check-ins{side.lastCheckinDate ? ` · last ${side.lastCheckinDate}` : ""}
                  {side.missedStreak > 0 ? ` · missed ${side.missedStreak}` : ""}
                </p>
              </div>
              <StatusBadge status={side.status} />
              <span className="hidden w-20 text-right text-xs text-muted sm:block">{hs.status}</span>
              {hs.kind === "friend" && (hs.status === "accepted" || hs.status === "active") && (
                <ActionForm action={leaveFriendAction} messageClassName="hidden">
                  <input type="hidden" name="handshakeId" value={hs.id} />
                  <SubmitButton className="btn btn-ghost btn-sm text-muted" pendingText="…" title={`Remove ${tester.name} and free the slot`}>
                    Remove
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      )}

      <SectionTitle>Feedback ({reviews.length})</SectionTitle>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted">Testers can leave a rating, bug reports and comments at any point during their 16 days.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map(({ fb, tester }) => (
            <div key={fb.id} className="card p-4">
              <div className="flex items-center gap-2">
                <Avatar name={tester.name} src={tester.avatarUrl} size={24} ring={false} />
                <span className="text-sm font-medium">{tester.name}</span>
                <span className="ml-auto flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < fb.rating ? "fill-[#f5b301] text-[#f5b301]" : "text-black/15"} />
                  ))}
                </span>
              </div>
              {fb.bugs && (
                <p className="mt-3 text-sm">
                  <span className="font-medium text-bad">Bugs: </span>
                  {fb.bugs}
                </p>
              )}
              {fb.comments && <p className="mt-2 text-sm text-ink-2">{fb.comments}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
