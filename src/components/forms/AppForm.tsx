"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { saveAppAction } from "@/actions/apps";
import { AppLogo } from "@/components/common";
import { AndroidVersionSelect } from "@/components/forms/AndroidVersionSelect";
import { StepCard } from "@/components/forms/StepCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { parseTestingLink } from "@/lib/playLinks";
import { cn } from "@/lib/utils";
import { appSchema } from "@/validation/apps";

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

const CONFIRMATIONS = [
  ["groupAddedConfirmed", "I added the group email to my closed track's testers"],
  ["countriesAllConfirmed", "I selected all countries / regions"],
  ["releaseSentConfirmed", "I sent the release for review"],
] as const;

export function AppForm({
  initial = {},
  joinedGroup,
  group,
}: {
  initial?: Initial;
  joinedGroup: boolean;
  group: { url: string; email: string };
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: appSchema,
    action: saveAppAction,
    defaultValues: {
      appId: initial.id ?? "",
      name: initial.name ?? "",
      testingLink: initial.testingLink ?? "",
      logoUrl: initial.logoUrl ?? "",
      description: initial.description ?? "",
      minAndroidApi: initial.minAndroidApi,
      groupAddedConfirmed: initial.groupAddedConfirmed ?? false,
      countriesAllConfirmed: initial.countriesAllConfirmed ?? false,
      releaseSentConfirmed: initial.releaseSentConfirmed ?? false,
      intent: "draft",
    },
  });
  const [name, link, logo, minApi, groupAdded, countriesAll, releaseSent, intent] = useWatch({
    control: form.control,
    name: ["name", "testingLink", "logoUrl", "minAndroidApi", "groupAddedConfirmed", "countriesAllConfirmed", "releaseSentConfirmed", "intent"],
  });
  const [logoBroken, setLogoBroken] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => (link?.trim() ? parseTestingLink(link) : null), [link]);
  const step2Done = Boolean(groupAdded && countriesAll && releaseSent);
  const step3Done = (name ?? "").trim().length >= 2 && Boolean(parsed) && Boolean(minApi) && !logoBroken;
  const canPublish = joinedGroup && step2Done && step3Done;
  const logoSrc = (logo ?? "").trim();

  const steps = [
    { title: "Join our Google Group", done: joinedGroup },
    { title: "Prepare in Play Console", done: step2Done },
    { title: "App details", done: step3Done },
    { title: "Publish", done: Boolean(initial.published) },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <ol className="space-y-1 lg:sticky lg:top-0 lg:self-start">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm">
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                s.done ? "bg-ink text-white" : "bg-black/[0.06] text-muted-foreground",
              )}
            >
              {s.done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className={s.done ? "font-medium text-ink" : "text-muted-foreground"}>{s.title}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        <StepCard n={1} title="Join our Google Group" done={joinedGroup}>
          <p className="text-sm text-ink-2">
            Every member joins one shared group. That&apos;s how testers get access to your closed track — and you to theirs.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={group.url} target="_blank" rel="noreferrer" />}>
              Open group <ExternalLink size={13} />
            </Button>
            <span className={cn("text-sm", joinedGroup ? "text-ok" : "text-warn")}>
              {joinedGroup ? "✓ You confirmed you joined" : "Confirm in onboarding first"}
            </span>
          </div>
        </StepCard>

        <StepCard n={2} title="Prepare in Play Console" done={step2Done}>
          <p className="text-sm text-ink-2">In your closed testing track, add this group as testers:</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2">
            <code className="flex-1 truncate font-mono text-[13px]">{group.email}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(group.email);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <FieldGroup className="mt-4 gap-2.5">
            {CONFIRMATIONS.map(([key, label]) => (
              <Controller
                key={key}
                name={key}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                    <Checkbox
                      id={key}
                      name={field.name}
                      ref={field.ref}
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={key} className="cursor-pointer text-sm font-normal text-foreground">
                        {label}
                      </FieldLabel>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </FieldContent>
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
        </StepCard>

        <StepCard n={3} title="App details" done={step3Done}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">App name</FieldLabel>
                  <Input {...field} id="name" maxLength={60} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="testingLink"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="testingLink">Testing link</FieldLabel>
                  <Input
                    {...field}
                    id="testingLink"
                    className="font-mono text-[13px]"
                    placeholder="https://play.google.com/apps/testing/com.example.app"
                    aria-invalid={fieldState.invalid}
                  />
                  {parsed ? (
                    <div className="rounded-xl bg-ok-soft px-3 py-2 text-xs text-ok">
                      ✓ Package <b className="font-mono">{parsed.packageName}</b>
                      <div className="mt-1 space-y-0.5 text-ink-2">
                        <div className="truncate">Web: {parsed.joinWebLink}</div>
                        <div className="truncate">Android: {parsed.joinAndroidLink}</div>
                      </div>
                    </div>
                  ) : fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    link?.trim() && (
                      <p className="text-xs text-bad">
                        Paste the “Join on web” link (play.google.com/apps/testing/&lt;package&gt;) or the Android link (…/details?id=&lt;package&gt;).
                      </p>
                    )
                  )}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Controller
                name="logoUrl"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || logoBroken}>
                    <FieldLabel htmlFor="logoUrl">
                      Logo URL <span className="font-normal text-faint">(optional)</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="logoUrl"
                      placeholder="https://…/icon.png"
                      aria-invalid={fieldState.invalid || logoBroken}
                      onChange={(e) => {
                        field.onChange(e);
                        setLogoBroken(false);
                      }}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      logoBroken && <FieldError>That image didn&apos;t load. Check the URL.</FieldError>
                    )}
                  </Field>
                )}
              />
              <Field className="w-auto">
                <FieldTitle className="text-[0.8125rem] text-ink-2">Preview</FieldTitle>
                {logoSrc && !logoBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt="Logo preview"
                    onError={() => setLogoBroken(true)}
                    className="h-11 w-11 rounded-xl bg-white object-cover ring-1 ring-black/5"
                  />
                ) : (
                  <AppLogo name={name || "?"} size={44} />
                )}
              </Field>
            </div>
            <Controller
              name="minAndroidApi"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="minAndroidApi">Minimum Android version</FieldLabel>
                  <AndroidVersionSelect
                    id="minAndroidApi"
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription className="text-xs">Only testers whose device runs this version or newer will see your app.</FieldDescription>
                  )}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="description">
                    Short description <span className="font-normal text-faint">(optional)</span>
                  </FieldLabel>
                  <Textarea {...field} id="description" rows={2} maxLength={200} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </StepCard>

        <StepCard n={4} title="Publish" done={Boolean(initial.published)}>
          <p className="text-sm text-ink-2">
            Publishing opens <b>16 tester slots</b> for <b>16 days</b> each — 4 spare testers and 2 spare days on top of Google&apos;s 12 × 14 requirement.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {initial.published ? (
              <Button type="submit" disabled={pending} onClick={() => form.setValue("intent", "publish")}>
                {pending && <Spinner />}
                {pending ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <>
                <Button type="submit" disabled={pending || !canPublish} onClick={() => form.setValue("intent", "publish")}>
                  {pending && intent === "publish" && <Spinner />}
                  {pending && intent === "publish" ? "Publishing…" : "Publish app"}
                </Button>
                <Button type="submit" variant="outline" disabled={pending} onClick={() => form.setValue("intent", "draft")}>
                  {pending && intent === "draft" && <Spinner />}
                  {pending && intent === "draft" ? "Saving…" : "Save draft"}
                </Button>
              </>
            )}
          </div>
          {!initial.published && !canPublish && <p className="mt-2 text-xs text-muted-foreground">Complete steps 1–3 to publish.</p>}
        </StepCard>
      </div>
    </form>
  );
}
