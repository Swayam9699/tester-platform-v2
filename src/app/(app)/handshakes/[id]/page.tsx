import { ArrowLeftRight, ExternalLink, Smartphone, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkInAction, feedbackAction, leaveFriendAction, optinProofAction, reportAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AppLogo, Avatar, Badge, cx, Progress, SectionTitle, StatusBadge } from "@/components/ui";
import { RULES } from "@/lib/config";
import { addDays, dayKey, daysBetween } from "@/lib/time";
import { requireOnboardedUser } from "@/server/auth";
import { getHandshakeDetail } from "@/server/queries";

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
      <Link href={friend ? "/friends?tab=testing" : "/handshakes"} className="text-sm text-muted hover:text-ink">
        ← {friend ? "Friend testing" : "Handshakes"}
      </Link>

      <div className="card mt-3 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <AppSide label="You test" name={testingApp.name} logo={testingApp.logoUrl} owner={partner.name} />
          {myApp && (
            <>
              <ArrowLeftRight className="text-muted" size={18} />
              <AppSide label={`${first} tests`} name={myApp.name} logo={myApp.logoUrl} owner="You" />
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {friend && <Badge tone="warn">friend test</Badge>}
            <StatusBadge status={hs.status} />
          </div>
        </div>
        <ol className={cx("mt-6 grid gap-2", friend ? "grid-cols-3" : "grid-cols-4")}>
          {timeline.map((t) => (
            <li key={t.label}>
              <div className={cx("h-1 rounded-full", t.bad ? "bg-bad" : t.done ? "bg-ink" : "bg-black/[0.08]")} />
              <p className={cx("mt-2 text-xs", t.done ? "font-medium text-ink" : "text-muted")}>{t.label}</p>
            </li>
          ))}
        </ol>
        {hs.endedReason && <p className="mt-4 text-sm text-muted">{hs.endedReason}</p>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Your side */}
        <section className="card p-5">
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
                  <b>1.</b> Open the test with your Play account <span className="text-muted">({user.playEmail})</span>:
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={testingApp.joinAndroidLink} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm">
                      <Smartphone size={13} /> Join on Android
                    </a>
                    <a href={testingApp.joinWebLink} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm">
                      Join on web <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
                <li>
                  <b>2.</b> Tap <i>Become a tester</i>, then install the app.
                </li>
                <li>
                  <b>3.</b> Screenshot the <i>“You&apos;re a tester”</i> page and upload it{hoursLeft != null ? ` — ${hoursLeft}h left` : ""}.
                </li>
              </ol>
              <ActionForm action={optinProofAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="sideId" value={mine.id} />
                <input name="proof" type="file" accept="image/png,image/jpeg,image/webp" required className="field flex-1 pt-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1 file:text-white" />
                <SubmitButton pendingText="Uploading…">Upload proof</SubmitButton>
              </ActionForm>
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
                    <span className="text-muted">{mine.checkinCount} check-ins</span>
                  </div>
                  <Progress value={day} max={totalDays} />
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
                      className={cx(
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
                  <ActionForm action={checkInAction} className="mt-4 space-y-2">
                    <input type="hidden" name="sideId" value={mine.id} />
                    {friend && <p className="text-xs text-muted">Check-ins are optional for friends. They show {first} you&apos;re still testing.</p>}
                    <input name="note" className="field" maxLength={200} placeholder="Optional note — what did you try today?" />
                    <div className="flex flex-wrap items-center gap-2">
                      <input name="proof" type="file" accept="image/png,image/jpeg,image/webp" className="flex-1 text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-black/[0.06] file:px-3 file:py-1" />
                      <SubmitButton pendingText="Saving…">I opened the app today</SubmitButton>
                    </div>
                  </ActionForm>
                ))}
            </>
          )}
        </section>

        {/* Partner side */}
        {friend ? (
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Testing for a friend</h2>
            <div className="flex items-center gap-3">
              <Avatar name={partner.name} src={partner.avatarUrl} size={40} ring={false} />
              <div className="text-sm">
                <p className="font-medium">{partner.name}</p>
                <p className="text-xs text-muted">Developer of {testingApp.name}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-2">
              You don&apos;t test anything in return, and there are no penalties. Stay opted in and keep the app installed for {totalDays} days so you count
              toward {first}&apos;s 12 testers.
            </p>
            {(hs.status === "accepted" || hs.status === "active") && (
              <ActionForm action={leaveFriendAction} className="mt-4">
                <input type="hidden" name="handshakeId" value={hs.id} />
                <SubmitButton className="btn btn-ghost btn-sm text-muted" pendingText="Leaving…">
                  Stop testing
                </SubmitButton>
              </ActionForm>
            )}
          </section>
        ) : (
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{partner.name.split(" ")[0]}&apos;s side</h2>
              {theirs && <StatusBadge status={theirs.status} />}
            </div>
            <div className="flex items-center gap-3">
              <Avatar name={partner.name} src={partner.avatarUrl} size={40} ring={false} />
              <div className="text-sm">
                <p className="font-medium">{partner.name}</p>
                <p className="text-xs text-muted">
                  Reliability {partner.reliabilityScore} · Level {partner.level}
                </p>
              </div>
            </div>
            {theirs && (
              <dl className="mt-4 space-y-2 text-sm">
                {myApp && <Row label="Testing" value={myApp.name} />}
                <Row label="Check-ins" value={String(theirs.checkinCount)} />
                <Row label="Checked in today" value={theirs.lastCheckinDate === today ? "Yes ✓" : "Not yet"} />
                {theirs.missedStreak > 0 && <Row label="Missed in a row" value={String(theirs.missedStreak)} bad />}
              </dl>
            )}
            {d.theirFeedback && (
              <div className="mt-4 rounded-xl bg-canvas p-3 text-sm">
                <Stars n={d.theirFeedback.rating} />
                {d.theirFeedback.bugs && <p className="mt-2"><b className="text-bad">Bugs:</b> {d.theirFeedback.bugs}</p>}
                {d.theirFeedback.comments && <p className="mt-1 text-ink-2">{d.theirFeedback.comments}</p>}
              </div>
            )}
          </section>
        )}
      </div>

      {mine.status !== "pending" && (
        <>
          <SectionTitle>Feedback for {testingApp.name}</SectionTitle>
          <ActionForm action={feedbackAction} className="card space-y-4 p-5">
            <input type="hidden" name="sideId" value={mine.id} />
            <fieldset>
              <legend className="label">Rating</legend>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name="rating" value={n} defaultChecked={d.myFeedback?.rating === n} required className="peer sr-only" />
                    <span className="grid h-10 w-12 place-items-center rounded-xl border border-line text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-coral">
                      {n}★
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="bugs">Bugs found</label>
              <textarea id="bugs" name="bugs" rows={2} className="field" defaultValue={d.myFeedback?.bugs ?? ""} placeholder="Steps to reproduce, device, what happened…" />
            </div>
            <div>
              <label className="label" htmlFor="comments">Comments</label>
              <textarea id="comments" name="comments" rows={2} className="field" defaultValue={d.myFeedback?.comments ?? ""} placeholder="What you liked, what was confusing…" />
            </div>
            <SubmitButton pendingText="Sending…">{d.myFeedback ? "Update feedback" : "Send feedback"}</SubmitButton>
          </ActionForm>
        </>
      )}

      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-muted hover:text-ink">Report a problem with this handshake</summary>
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
        <ActionForm action={reportAction} className="card mt-3 space-y-3 p-4" resetOnSuccess>
          <input type="hidden" name="handshakeId" value={hs.id} />
          <textarea name="reason" rows={3} className="field" required minLength={10} placeholder="e.g. their opt-in screenshot is for a different app, or they asked me to uninstall early." />
          <SubmitButton className="btn btn-soft btn-sm">Send to admins</SubmitButton>
        </ActionForm>
      </details>
    </div>
  );
}

function AppSide({ label, name, logo, owner }: { label: string; name: string; logo: string | null; owner: string }) {
  return (
    <div className="flex items-center gap-3">
      <AppLogo name={name} src={logo} size={48} />
      <div>
        <p className="text-[10.5px] uppercase tracking-wide text-muted">{label}</p>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted">by {owner}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={cx("font-medium", bad && "text-bad")}>{value}</dd>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < n ? "fill-[#f5b301] text-[#f5b301]" : "text-black/15"} />
      ))}
    </span>
  );
}
