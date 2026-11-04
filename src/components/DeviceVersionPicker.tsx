"use client";

import { Smartphone } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { deviceVersionAction } from "@/app/actions";
import { ANDROID_VERSIONS, androidLabel } from "@/lib/android";
import { SubmitButton } from "./ActionForm";
import { cx } from "./ui";

/**
 * "Your phone: Android 14 · Change", for fixing a wrong pick from onboarding right where it matters
 * (Discover, invite links). Saving refreshes the page, so the apps and join options follow the new version.
 */
export function DeviceVersionPicker({ api, defaultOpen = false, className }: { api: number | null; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action] = useActionState(deviceVersionAction, null);
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <span className={cx("inline-flex flex-wrap items-center gap-1.5 text-xs text-muted", className)}>
        <Smartphone size={12} />
        Your phone: <b className="font-medium text-ink-2">{androidLabel(api)}</b>
        <button type="button" onClick={() => setOpen(true)} className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
          Change
        </button>
        {state?.ok && <span className="text-ok">✓ Saved</span>}
      </span>
    );
  }

  return (
    <form action={action} className={cx("flex flex-wrap items-center gap-2", className)}>
      <label className="sr-only" htmlFor="device-version">
        Your phone&apos;s Android version
      </label>
      <select id="device-version" name="deviceAndroidApi" defaultValue={api ?? undefined} className="field h-9 w-auto py-0 text-sm">
        {ANDROID_VERSIONS.map((v) => (
          <option key={v.api} value={v.api}>
            {v.label} (API {v.api})
          </option>
        ))}
      </select>
      <SubmitButton className="btn btn-dark btn-sm h-9" pendingText="Saving…">
        Save
      </SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9">
        Cancel
      </button>
      <span className="basis-full text-xs text-muted">Find it in Settings → About phone → Android version.</span>
      {state && !state.ok && <span className="basis-full text-xs text-bad">{state.message}</span>}
    </form>
  );
}
