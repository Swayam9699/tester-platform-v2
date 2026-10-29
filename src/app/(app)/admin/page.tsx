import { notFound } from "next/navigation";
import { adminAction } from "@/actions/admin";
import { getDb } from "@/db";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { EmptyState, PageHeader, SectionTitle, StatusBadge, UserAvatar } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/api/auth";
import { getAdmin } from "@/api/queries";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireOnboardedUser();
  if (!user.isAdmin) notFound();
  const a = await getAdmin(await getDb());

  return (
    <div>
      <PageHeader title="Admin" subtitle={`${a.openDisputes.length} open disputes · ${a.blockedCount} blocked users · daily job last ran for ${a.lastCron ?? "—"}`} />

      <Card className="flex-row flex-wrap items-center gap-3 p-4">
        <div className="flex-1 text-sm">
          <p className="font-medium">Daily job</p>
          <p className="text-xs text-muted-foreground">
            Platform time: {a.now.toUTCString().slice(0, 22)} UTC
            {a.demoMode ? ` · demo clock offset +${a.clockOffset}d` : ""}
          </p>
        </div>
        <ActionForm action={adminAction} className="flex flex-wrap items-center gap-2">
          <SubmitButton name="action" value="cron" variant="outline" size="sm">
            Run now
          </SubmitButton>
          {a.demoMode && (
            <>
              <Input type="hidden" name="days" value="1" />
              <SubmitButton name="action" value="clock" size="sm" title="Advance the demo clock one day and run the daily job">
                +1 day ▶
              </SubmitButton>
            </>
          )}
        </ActionForm>
        {a.demoMode && a.clockOffset !== 0 && (
          <ActionForm action={adminAction}>
            <Input type="hidden" name="days" value="0" />
            <SubmitButton name="action" value="clock" variant="ghost" size="sm">
              Reset clock
            </SubmitButton>
          </ActionForm>
        )}
      </Card>

      <SectionTitle>Disputes</SectionTitle>
      {a.openDisputes.length === 0 ? (
        <EmptyState icon="⚖️" title="No open disputes" />
      ) : (
        <div className="space-y-3">
          {a.openDisputes.map(({ d, reporter, hs }) => (
            <Card key={d.id} className="block p-4">
              <div className="flex items-center gap-2 text-sm">
                <UserAvatar name={reporter.name} size={22} ring={false} />
                <b>{reporter.name}</b>
                <span className="text-muted-foreground">reported handshake</span>
                <StatusBadge status={hs.status} />
              </div>
              <p className="mt-2 text-sm text-ink-2">“{d.reason}”</p>
              <ActionForm action={adminAction} className="mt-3 flex flex-wrap items-center gap-2">
                <Input type="hidden" name="disputeId" value={d.id} />
                <Input
                  name="resolution"
                  maxLength={500}
                  aria-label="Resolution note"
                  className="h-9 min-w-48 flex-1"
                  placeholder="Resolution note (sent to reporter)"
                />
                <SubmitButton name="action" value="dismiss" variant="ghost" size="sm">
                  Dismiss
                </SubmitButton>
                <SubmitButton name="action" value="resolve" size="sm">
                  Resolve
                </SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Opt-in proof review</SectionTitle>
      {a.proofs.length === 0 ? (
        <EmptyState icon="🖼️" title="No proofs to review" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {a.proofs.map(({ side, hs, tester, app }) => (
            <Card key={side.id} className="block py-0">
              <Button
                variant="ghost"
                className="block h-auto w-full rounded-none p-0"
                nativeButton={false}
                render={<a href={side.optinProofUrl!} target="_blank" rel="noreferrer" aria-label={`Open proof from ${tester.name}`} />}
              >
                <AspectRatio ratio={16 / 10} className="bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote screenshot of any size; shadcn has no image component */}
                  <img src={side.optinProofUrl!} alt={`Proof from ${tester.name}`} className="size-full object-cover object-top" />
                </AspectRatio>
              </Button>
              <div className="p-3 text-xs">
                <p className="truncate">
                  <b>{tester.name}</b> → {app.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <StatusBadge status={hs.status} />
                  <StatusBadge status={side.status} />
                </div>
                <ActionForm action={adminAction} className="mt-2">
                  <Input type="hidden" name="sideId" value={side.id} />
                  {hs.status === "accepted" ? (
                    <SubmitButton name="action" value="rejectProof" variant="outline" size="sm" className="w-full">
                      Reject proof
                    </SubmitButton>
                  ) : (
                    <SubmitButton name="action" value="markSkipped" variant="destructive" size="sm" className="w-full">
                      Mark as skipped
                    </SubmitButton>
                  )}
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Users & bans</SectionTitle>
      <Card className="block py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">User</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Reliability</TableHead>
              <TableHead>Tests ✓ / ✗</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.users.map((u) => {
              const blocked = u.blockedUntil && u.blockedUntil > a.now;
              return (
                <TableRow key={u.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} src={u.avatarUrl} size={28} ring={false} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {u.name} {u.isAdmin && <Badge variant="info">admin</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.googleEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>L{u.level}</TableCell>
                  <TableCell>{u.reliabilityScore}</TableCell>
                  <TableCell>
                    {u.completedHandshakes} / {u.failedHandshakes}
                  </TableCell>
                  <TableCell>
                    {blocked ? <Badge variant="destructive">blocked until {u.blockedUntil!.toISOString().slice(0, 10)}</Badge> : <Badge variant="success">active</Badge>}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <ActionForm action={adminAction} className="inline-flex justify-end gap-1">
                      <Input type="hidden" name="userId" value={u.id} />
                      {blocked ? (
                        <SubmitButton name="action" value="unblock" variant="outline" size="sm">
                          Unblock
                        </SubmitButton>
                      ) : (
                        <>
                          <Input type="hidden" name="days" value="30" />
                          <Input type="hidden" name="reason" value="Banned by an admin" />
                          {!u.isAdmin && (
                            <SubmitButton name="action" value="ban" variant="ghost" size="sm" className="text-bad">
                              Ban 30d
                            </SubmitButton>
                          )}
                        </>
                      )}
                    </ActionForm>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
