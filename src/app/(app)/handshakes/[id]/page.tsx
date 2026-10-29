import { ArrowLeftRight, ExternalLink, Smartphone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leaveFriendAction } from "@/actions/handshakes";
import { getDb } from "@/db";
import { SectionTitle, StatusBadge, UserAvatar } from "@/components/common";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { CheckInForm } from "@/components/handshakes/CheckInForm";
import { FeedbackForm } from "@/components/handshakes/FeedbackForm";
import { OptinProofForm } from "@/components/handshakes/OptinProofForm";
import { ReportProblemForm } from "@/components/handshakes/ReportProblemForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { RULES } from "@/lib/config";
import { addDays, dayKey, daysBetween } from "@/lib/time";
import { cn, percent } from "@/lib/utils";
import { requireOnboardedUser } from "@/api/auth";
import { getHandshakeDetail } from "@/api/queries";
import { AppSide } from "@/components/handshakes/AppSide";
import { DetailRow } from "@/components/handshakes/DetailRow";
import { Stars } from "@/components/handshakes/Stars";

export default async function HandshakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const d = await getHandshakeDetail(await getDb(), user.id, id);
  if (!d) notFound();
  const { hs, mine, theirs, partner, testingApp, myApp, now } = d;
  const friend = hs.kind === "friend";
  const first = partner.name.split(" ")[0];

  const totalDays = hs.startedAt && hs.endsAt ? daysBetween(hs.startedAt, hs.endsAt) : RULES.durationDays;
  const day = hs.startedAt ? Math.min(totalDays, daysBetween(hs.startedAt, now) + 1) : 0;
  const today = dayKey(now);
  const checked = new Set(d.myCheckins.map((c) => c.date));
  const hoursLeft = hs.deadlineAt ? Math.max(0, Math.round((hs.deadlineAt.getTime() - now.getTime()) / 3_600_000)) : null;

  const ended = hs.status === "broken" || hs.status === "cancelled";
  const timeline = [
    ...(friend
      ? [{ label: "Joined", done: true }, { label: "Opted in", done: Boolean(hs.startedAt) }]
      : [
          { label: "Requested", done: true },
          { label: "Accepted", done: Boolean(hs.acceptedAt) },
          { label: "Both opted in", done: Boolean(hs.startedAt) },
        ]),
    { label: ended ? (friend ? "Ended" : "Broken") : `${totalDays} days`, done: hs.status === "completed" || ended, bad: hs.status === "broken" },
  ];

  return (
    <div>
      <Link href={friend ? "/friends?tab=testing" : "/handshakes"} className="text-sm text-muted-foreground hover:text-ink">
        ← {friend ? "Friend testing" : "Handshakes"}
      </Link>

      <Card className="mt-3 block p-6">
        <div className="flex flex-wrap items-center gap-4">
          <AppSide label="You test" name={testingApp.name} logo={testingApp.logoUrl} owner={partner.name} />
          {myApp && (
            <>
              <ArrowLeftRight className="text-muted-foreground" size={18} />
              <AppSide label={`${first} tests`} name={myApp.name} logo={myApp.logoUrl} owner="You" />
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {friend && <Badge variant="warning">friend test</Badge>}
            <StatusBadge status={hs.status} />
          </div>
        </div>
        <ol className={cn("mt-6 grid gap-2", friend ? "grid-cols-3" : "grid-cols-4")}>
          {timeline.map((t) => (
            <li key={t.label}>
              <div className={cn("h-1 rounded-full", t.bad ? "bg-bad" : t.done ? "bg-ink" : "bg-black/[0.08]")} />
              <p className={cn("mt-2 text-xs", t.done ? "font-medium text-ink" : "text-muted-foreground")}>{t.label}</p>
            </li>
          ))}
        </ol>
        {hs.endedReason && <p className="mt-4 text-sm text-muted-foreground">{hs.endedReason}</p>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Your side */}
        <Card className="block p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Your side</h2>
            <StatusBadge status={mine.status} />
          </div>

          {mine.status === "pending" && hs.status === "accepted" && (
            <div className="space-y-4">
              {mine.proofRejected && (
                <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">An admin rejected your last screenshot. Please upload a clear one.</p>
              )}
              <ol className="space-y-3 text-sm text-ink-2">
                <li>
                  <b>1.</b> Open the test with your Play account <span className="text-muted-foreground">({user.playEmail})</span>:
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" nativeButton={false} render={<a href={testingApp.joinAndroidLink} target="_blank" rel="noreferrer" />}>
                      <Smartphone size={13} /> Join on Android
                    </Button>
                    <Button variant="outline" size="sm" nativeButton={false} render={<a href={testingApp.joinWebLink} target="_blank" rel="noreferrer" />}>
                      Join on web <ExternalLink size={12} />
                    </Button>
                  </div>
                </li>
                <li>
                  <b>2.</b> Tap <i>Become a tester</i>, then install the app.
                </li>
                <li>
                  <b>3.</b> Screenshot the <i>“You&apos;re a tester”</i> page and upload it{hoursLeft != null ? ` — ${hoursLeft}h left` : ""}.
                </li>
              </ol>
              <OptinProofForm sideId={mine.id} />
            </div>
          )}

          {mine.status === "joined" && myApp && (
            <p className="text-sm text-ink-2">
              ✓ You opted in. Waiting for {first} to opt in to {myApp.name}
              {hoursLeft != null ? ` (${hoursLeft}h left)` : ""}. Your {totalDays} days start the moment they do.
            </p>
          )}

          {(mine.status === "active" || mine.status === "completed" || mine.status === "skipped") && hs.startedAt && (
            <>
              {mine.status === "active" && (
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">
                      Day {day} of {totalDays}
                    </span>
                    <span className="text-muted-foreground">{mine.checkinCount} check-ins</span>
                  </div>
                  <Progress value={percent(day, totalDays)} />
                </div>
              )}
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: totalDays }, (_, i) => {
                  const key = dayKey(addDays(hs.startedAt!, i));
                  const isChecked = checked.has(key);
                  const isToday = key === today && mine.status === "active";
                  const past = key < today;
                  return (
                    <div
                      key={key}
                      title={key}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg text-[11px] font-medium",
                        isChecked
                          ? "bg-ink text-white"
                          : isToday
                            ? "ring-2 ring-coral text-ink"
                            : past && !friend
                              ? "bg-bad-soft text-bad"
                              : "bg-black/[0.04] text-faint",
                      )}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
              {mine.status === "active" &&
                (mine.lastCheckinDate === today ? (
                  <p className="mt-4 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">✓ Checked in for today. See you tomorrow.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {friend && <p className="text-xs text-muted-foreground">Check-ins are optional for friends. They show {first} you&apos;re still testing.</p>}
                    <CheckInForm sideId={mine.id} />
                  </div>
                ))}
            </>
          )}
        </Card>

        {/* Partner side */}
        {friend ? (
          <Card className="block p-5">
            <h2 className="mb-4 font-semibold">Testing for a friend</h2>
            <div className="flex items-center gap-3">
              <UserAvatar name={partner.name} src={partner.avatarUrl} size={40} ring={false} />
              <div className="text-sm">
                <p className="font-medium">{partner.name}</p>
                <p className="text-xs text-muted-foreground">Developer of {testingApp.name}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-2">
              You don&apos;t test anything in return, and there are no penalties. Stay opted in and keep the app installed for {totalDays} days so you count
              toward {first}&apos;s 12 testers.
            </p>
            {(hs.status === "accepted" || hs.status === "active") && (
              <ActionForm action={leaveFriendAction} className="mt-4">
                <Input type="hidden" name="handshakeId" value={hs.id} />
                <SubmitButton variant="ghost" size="sm" className="text-muted-foreground" pendingText="Leaving…">
                  Stop testing
                </SubmitButton>
              </ActionForm>
            )}
          </Card>
        ) : (
          <Card className="block p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{partner.name.split(" ")[0]}&apos;s side</h2>
              {theirs && <StatusBadge status={theirs.status} />}
            </div>
            <div className="flex items-center gap-3">
              <UserAvatar name={partner.name} src={partner.avatarUrl} size={40} ring={false} />
              <div className="text-sm">
                <p className="font-medium">{partner.name}</p>
                <p className="text-xs text-muted-foreground">
                  Reliability {partner.reliabilityScore} · Level {partner.level}
                </p>
              </div>
            </div>
            {theirs && (
              <dl className="mt-4 space-y-2 text-sm">
                {myApp && <DetailRow label="Testing" value={myApp.name} />}
                <DetailRow label="Check-ins" value={String(theirs.checkinCount)} />
                <DetailRow label="Checked in today" value={theirs.lastCheckinDate === today ? "Yes ✓" : "Not yet"} />
                {theirs.missedStreak > 0 && <DetailRow label="Missed in a row" value={String(theirs.missedStreak)} bad />}
              </dl>
            )}
            {d.theirFeedback && (
              <div className="mt-4 rounded-xl bg-canvas p-3 text-sm">
                <Stars n={d.theirFeedback.rating} />
                {d.theirFeedback.bugs && <p className="mt-2"><b className="text-bad">Bugs:</b> {d.theirFeedback.bugs}</p>}
                {d.theirFeedback.comments && <p className="mt-1 text-ink-2">{d.theirFeedback.comments}</p>}
              </div>
            )}
          </Card>
        )}
      </div>

      {mine.status !== "pending" && (
        <>
          <SectionTitle>Feedback for {testingApp.name}</SectionTitle>
          <FeedbackForm
            sideId={mine.id}
            initial={d.myFeedback ? { rating: d.myFeedback.rating, bugs: d.myFeedback.bugs, comments: d.myFeedback.comments } : null}
          />
        </>
      )}

      <Collapsible className="mt-8">
        <CollapsibleTrigger render={<Button variant="link" className="text-sm text-muted-foreground hover:text-ink" />}>
          Report a problem with this handshake
        </CollapsibleTrigger>
        <CollapsibleContent>
          {d.myDisputes.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-ink-2">
              {d.myDisputes.map((x) => (
                <li key={x.id}>
                  • {x.reason} — <b>{x.status}</b>
                  {x.resolution ? `: ${x.resolution}` : ""}
                </li>
              ))}
            </ul>
          )}
          <ReportProblemForm handshakeId={hs.id} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
