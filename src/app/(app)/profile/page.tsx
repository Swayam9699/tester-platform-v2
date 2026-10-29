import { profileAction, signOut } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Avatar, cx, PageHeader, Progress, SectionTitle, Stat } from "@/components/ui";
import { ANDROID_VERSIONS } from "@/lib/android";
import { requireOnboardedUser } from "@/server/auth";
import { getProfile } from "@/server/queries";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const p = await getProfile(await getDb(), user);
  const current = p.levels.find((l) => l.level === user.level);
  const next = p.levels.find((l) => l.level === user.level + 1);

  return (
    <div>
      <PageHeader title="Profile" />
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={user.name} src={user.avatarUrl} size={56} ring={false} />
        <div className="flex-1">
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.googleEmail}</p>
          {user.playEmail !== user.googleEmail && <p className="text-xs text-faint">Google Play: {user.playEmail}</p>}
        </div>
        <form action={signOut}>
          <button className="btn btn-soft btn-sm">Sign out</button>
        </form>
      </div>

      {p.blocked && (
        <div className="mt-4 rounded-2xl bg-bad-soft p-4 text-sm text-bad">
          <b>Blocked until {user.blockedUntil!.toUTCString().slice(0, 22)}.</b> You can keep testing in your current handshakes, but can&apos;t send or accept new ones.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Level" value={user.level} hint={`${p.limit} handshake slots`}>
          {next && current && (
            <>
              <Progress className="mt-3" value={user.completedHandshakes - current.completionsRequired} max={next.completionsRequired - current.completionsRequired} />
              <p className="mt-1.5 text-[11px] text-muted">
                {next.completionsRequired - user.completedHandshakes} more to level {next.level}
              </p>
            </>
          )}
        </Stat>
        <Stat label="Slots in use" value={`${p.used}/${p.limit}`} />
        <Stat label="Reliability" value={user.reliabilityScore} hint="out of 100">
          <Progress className="mt-3" value={user.reliabilityScore} max={100} />
        </Stat>
        <Stat label="Completed / failed" value={`${user.completedHandshakes} / ${user.failedHandshakes}`} />
      </div>

      <SectionTitle>Levels</SectionTitle>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Level</th>
              <th className="px-4 py-2 font-medium">Active handshakes at once</th>
              <th className="px-4 py-2 font-medium">Completed handshakes needed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {p.levels.map((l) => (
              <tr key={l.level} className={cx(l.level === user.level && "bg-[#fff6f1] font-semibold")}>
                <td className="px-4 py-2.5">
                  {l.level}
                  {l.level === user.level && " (you)"}
                </td>
                <td className="px-4 py-2.5">{l.activeSlots}</td>
                <td className="px-4 py-2.5">{l.completionsRequired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Settings</SectionTitle>
      <ActionForm action={profileAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input id="name" name="name" className="field" defaultValue={user.name} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="playEmail">Google Play account</label>
          <input id="playEmail" name="playEmail" type="email" className="field" defaultValue={user.playEmail ?? ""} required />
          <p className="mt-1 text-xs text-muted">The account on your phone&apos;s Play Store. You opt in to tests with it.</p>
        </div>
        <div>
          <label className="label" htmlFor="deviceAndroidApi">Your device&apos;s Android version</label>
          <select id="deviceAndroidApi" name="deviceAndroidApi" className="field" defaultValue={user.deviceAndroidApi ?? undefined}>
            {ANDROID_VERSIONS.map((v) => (
              <option key={v.api} value={v.api}>
                {v.label} (API {v.api})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
        </div>
      </ActionForm>

      {p.blocks.length > 0 && (
        <>
          <SectionTitle>Block history</SectionTitle>
          <div className="card divide-y divide-line">
            {p.blocks.map((b) => (
              <div key={b.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-ink-2">{b.reason}</span>
                <span className="text-xs text-muted">
                  {b.startsAt.toISOString().slice(0, 10)} → {b.endsAt.toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
