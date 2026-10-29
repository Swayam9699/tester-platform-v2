"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { saveAppAction } from "@/app/actions";
import { ANDROID_VERSIONS } from "@/lib/android";
import { parseTestingLink } from "@/lib/playLinks";
import { SubmitButton } from "./ActionForm";
import { AppLogo, cx } from "./ui";

type Initial = {
  id?: string;
  name?: string;
  description?: string | null;
  testingLink?: string;
  logoUrl?: string | null;
  minAndroidApi?: number;
  groupAddedConfirmed?: boolean;
  countriesAllConfirmed?: boolean;
  releaseSentConfirmed?: boolean;
  published?: boolean;
};

export function AppForm({
  initial = {},
  joinedGroup,
  group,
}: {
  initial?: Initial;
  joinedGroup: boolean;
  group: { url: string; email: string };
}) {
  const [state, formAction] = useActionState(saveAppAction, null);
  const [checks, setChecks] = useState({
    groupAddedConfirmed: initial.groupAddedConfirmed ?? false,
    countriesAllConfirmed: initial.countriesAllConfirmed ?? false,
    releaseSentConfirmed: initial.releaseSentConfirmed ?? false,
  });
  const [name, setName] = useState(initial.name ?? "");
  const [link, setLink] = useState(initial.testingLink ?? "");
  const [logo, setLogo] = useState(initial.logoUrl ?? "");
  const [logoBroken, setLogoBroken] = useState(false);
  const [minApi, setMinApi] = useState(initial.minAndroidApi ? String(initial.minAndroidApi) : "");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => (link.trim() ? parseTestingLink(link) : null), [link]);
  const step2Done = checks.groupAddedConfirmed && checks.countriesAllConfirmed && checks.releaseSentConfirmed;
  const step3Done = name.trim().length >= 2 && Boolean(parsed) && Boolean(minApi) && !logoBroken;
  const canPublish = joinedGroup && step2Done && step3Done;

  const steps = [
    { title: "Join our Google Group", done: joinedGroup },
    { title: "Prepare in Play Console", done: step2Done },
    { title: "App details", done: step3Done },
    { title: "Publish", done: Boolean(initial.published) },
  ];

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[200px_1fr]">
      {initial.id && <input type="hidden" name="appId" value={initial.id} />}

      <ol className="space-y-1 lg:sticky lg:top-0 lg:self-start">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm">
            <span
              className={cx(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                s.done ? "bg-ink text-white" : "bg-black/[0.06] text-muted",
              )}
            >
              {s.done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className={s.done ? "font-medium text-ink" : "text-muted"}>{s.title}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        <Section n={1} title="Join our Google Group" done={joinedGroup}>
          <p className="text-sm text-ink-2">
            Every member joins one shared group. That&apos;s how testers get access to your closed track — and you to theirs.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a href={group.url} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm">
              Open group <ExternalLink size={13} />
            </a>
            <span className={cx("text-sm", joinedGroup ? "text-ok" : "text-warn")}>
              {joinedGroup ? "✓ You confirmed you joined" : "Confirm in onboarding first"}
            </span>
          </div>
        </Section>

        <Section n={2} title="Prepare in Play Console" done={step2Done}>
          <p className="text-sm text-ink-2">In your closed testing track, add this group as testers:</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2">
            <code className="flex-1 truncate font-mono text-[13px]">{group.email}</code>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(group.email);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {(
              [
                ["groupAddedConfirmed", "I added the group email to my closed track's testers"],
                ["countriesAllConfirmed", "I selected all countries / regions"],
                ["releaseSentConfirmed", "I sent the release for review"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name={key}
                  className="check"
                  checked={checks[key]}
                  onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </Section>

        <Section n={3} title="App details" done={step3Done}>
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="name">
                App name
              </label>
              <input id="name" name="name" className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="testingLink">
                Testing link
              </label>
              <input
                id="testingLink"
                name="testingLink"
                className="field font-mono text-[13px]"
                placeholder="https://play.google.com/apps/testing/com.example.app"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              {link.trim() &&
                (parsed ? (
                  <div className="mt-2 rounded-xl bg-ok-soft px-3 py-2 text-xs text-ok">
                    ✓ Package <b className="font-mono">{parsed.packageName}</b>
                    <div className="mt-1 space-y-0.5 text-ink-2">
                      <div className="truncate">Web: {parsed.joinWebLink}</div>
                      <div className="truncate">Android: {parsed.joinAndroidLink}</div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-bad">
                    Paste the “Join on web” link (play.google.com/apps/testing/&lt;package&gt;) or the Android link (…/details?id=&lt;package&gt;).
                  </p>
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="label" htmlFor="logoUrl">
                  Logo URL <span className="font-normal text-faint">(optional)</span>
                </label>
                <input
                  id="logoUrl"
                  name="logoUrl"
                  className="field"
                  placeholder="https://…/icon.png"
                  value={logo}
                  onChange={(e) => {
                    setLogo(e.target.value);
                    setLogoBroken(false);
                  }}
                />
                {logoBroken && <p className="mt-2 text-xs text-bad">That image didn&apos;t load. Check the URL.</p>}
              </div>
              <div>
                <span className="label">Preview</span>
                {logo.trim() && !logoBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.trim()}
                    alt="Logo preview"
                    onError={() => setLogoBroken(true)}
                    className="h-11 w-11 rounded-xl bg-white object-cover ring-1 ring-black/5"
                  />
                ) : (
                  <AppLogo name={name || "?"} size={44} />
                )}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="minAndroidApi">
                Minimum Android version
              </label>
              <select id="minAndroidApi" name="minAndroidApi" className="field" required value={minApi} onChange={(e) => setMinApi(e.target.value)}>
                <option value="" disabled>
                  Choose…
                </option>
                {ANDROID_VERSIONS.map((v) => (
                  <option key={v.api} value={v.api}>
                    {v.label} (API {v.api})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">Only testers whose device runs this version or newer will see your app.</p>
            </div>
            <div>
              <label className="label" htmlFor="description">
                Short description <span className="font-normal text-faint">(optional)</span>
              </label>
              <textarea id="description" name="description" rows={2} maxLength={200} className="field" defaultValue={initial.description ?? ""} />
            </div>
          </div>
        </Section>

        <Section n={4} title="Publish" done={Boolean(initial.published)}>
          <p className="text-sm text-ink-2">
            Publishing opens <b>16 tester slots</b> for <b>16 days</b> each — 4 spare testers and 2 spare days on top of Google&apos;s 12 × 14 requirement.
          </p>
          {state && !state.ok && <p className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{state.message}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {initial.published ? (
              <SubmitButton name="intent" value="publish" pendingText="Saving…">
                Save changes
              </SubmitButton>
            ) : (
              <>
                <SubmitButton name="intent" value="publish" disabled={!canPublish} pendingText="Publishing…">
                  Publish app
                </SubmitButton>
                <SubmitButton name="intent" value="draft" className="btn btn-soft" pendingText="Saving…">
                  Save draft
                </SubmitButton>
              </>
            )}
          </div>
          {!initial.published && !canPublish && <p className="mt-2 text-xs text-muted">Complete steps 1–3 to publish.</p>}
        </Section>
      </div>
    </form>
  );
}

function Section({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          <span className="mr-2 text-muted">{n}.</span>
          {title}
        </h2>
        {done && <span className="text-xs font-medium text-ok">Done</span>}
      </div>
      {children}
    </section>
  );
}
