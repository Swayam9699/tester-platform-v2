"use client";

import { useActionState } from "react";
import { emailSignInAction } from "@/app/actions";
import { cx } from "./ui";
import { SubmitButton } from "./ActionForm";

/** Two steps in one form slot: enter an email, then the one-time code Supabase emails to it. */
export function EmailSignIn({ next }: { next: string }) {
  const [state, action] = useActionState(emailSignInAction, null);
  const note = state?.message && (
    <p role={state.error ? "alert" : "status"} className={cx("text-xs", state.error ? "text-bad" : "text-muted")}>
      {state.message}
    </p>
  );

  if (state?.step === "code" && state.email) {
    return (
      <div className="space-y-3">
        <form action={action} className="space-y-2">
          <input type="hidden" name="step" value="code" />
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="next" value={next} />
          {note}
          <label className="label" htmlFor="code">
            Code from the email <span className="font-normal text-faint">(or tap the link in it on this device)</span>
          </label>
          <input
            id="code"
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,12}"
            maxLength={12}
            className="field h-12 text-center font-mono text-lg tracking-[0.35em]"
            placeholder="123456"
          />
          <SubmitButton className="btn btn-dark h-12 w-full" pendingText="Checking…">
            Sign in
          </SubmitButton>
        </form>
        <div className="flex justify-between text-xs text-muted">
          <form action={action}>
            <input type="hidden" name="step" value="reset" />
            <input type="hidden" name="email" value={state.email} />
            <button className="hover:text-ink">← Different email</button>
          </form>
          <form action={action}>
            <input type="hidden" name="step" value="send" />
            <input type="hidden" name="email" value={state.email} />
            <input type="hidden" name="next" value={next} />
            <SubmitButton className="hover:text-ink" pendingText="Sending…">
              Send a new code
            </SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="step" value="send" />
      <input type="hidden" name="next" value={next} />
      <label className="sr-only" htmlFor="signin-email">
        Email
      </label>
      <input id="signin-email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className="field h-12" placeholder="you@example.com" />
      {note}
      <SubmitButton className="btn btn-dark h-12 w-full" pendingText="Sending…">
        Email me a sign-in code
      </SubmitButton>
    </form>
  );
}
