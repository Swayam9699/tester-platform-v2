"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { emailSignInAction, type EmailSignInState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { EMAIL_CODE_LENGTH } from "@/lib/config";
import { emailCodeSchema, emailSignInSchema, type EmailCodeInput, type EmailSignInInput } from "@/validation/auth";

type Step = "send" | "code" | "resend";

/** Two steps in one form slot: enter an email, then the one-time code Supabase emails to it. */
export function EmailSignIn({ next }: { next: string }) {
  // Set once a code was sent: the form then asks for the code.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<Step | null>(null);
  const [pending, startTransition] = useTransition();

  const emailForm = useForm<EmailSignInInput>({ resolver: zodResolver(emailSignInSchema), defaultValues: { email: "" } });
  const codeForm = useForm<EmailCodeInput, unknown, { email: string; code: string }>({
    resolver: zodResolver(emailCodeSchema),
    defaultValues: { email: "", code: "" },
  });

  function apply(state: EmailSignInState) {
    if (!state) return;
    if (state.message) (state.error ? toast.error : toast.success)(state.message);
    if (state.step === "code" && state.email) {
      if (state.email !== sentTo) codeForm.reset({ email: state.email, code: "" });
      setSentTo(state.email);
    } else {
      setSentTo(null);
      if (state.email) emailForm.reset({ email: state.email });
    }
  }

  function submit(step: Step, fields: { email: string; code?: string }) {
    setBusy(step);
    return new Promise<void>((resolve) =>
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set("step", step === "resend" ? "send" : step);
          fd.set("email", fields.email);
          if (fields.code) fd.set("code", fields.code);
          fd.set("next", next);
          // A correct code redirects, so there's no state to apply.
          apply(await emailSignInAction(null, fd));
        } finally {
          setBusy(null);
          resolve();
        }
      }),
    );
  }

  if (sentTo) {
    return (
      <div className="space-y-3">
        <form onSubmit={codeForm.handleSubmit((v) => submit("code", v))} noValidate className="space-y-2">
          <Controller
            name="code"
            control={codeForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor="code">
                  <span>
                    Code from the email <span className="font-normal text-faint">(or tap the link in it on this device)</span>
                  </span>
                </FieldLabel>
                <FieldDescription className="text-xs">
                  Sent to <b className="font-medium text-ink-2">{sentTo}</b>
                </FieldDescription>
                <InputOTP
                  {...field}
                  id="code"
                  aria-invalid={fieldState.invalid}
                  maxLength={EMAIL_CODE_LENGTH}
                  pattern="^[0-9]+$"
                  autoComplete="one-time-code"
                  autoFocus
                  containerClassName="justify-center"
                  onComplete={() => codeForm.handleSubmit((v) => submit("code", v))()}
                >
                  <InputOTPGroup>
                    {Array.from({ length: EMAIL_CODE_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} aria-invalid={fieldState.invalid} className="size-12 bg-white font-mono text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-xs" />}
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {busy === "code" && <Spinner />}
            {busy === "code" ? "Checking…" : "Sign in"}
          </Button>
        </form>
        <div className="flex justify-between">
          <Button
            type="button"
            variant="link"
            size="xs"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => {
              setSentTo(null);
              emailForm.reset({ email: sentTo });
            }}
          >
            ← Different email
          </Button>
          <Button type="button" variant="link" size="xs" className="text-muted-foreground" disabled={pending} onClick={() => submit("resend", { email: sentTo })}>
            {busy === "resend" && <Spinner />}
            {busy === "resend" ? "Sending…" : "Send a new code"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={emailForm.handleSubmit((v) => submit("send", v))} noValidate className="space-y-2">
      <Controller
        name="email"
        control={emailForm.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1.5">
            <FieldLabel htmlFor="signin-email" className="sr-only">
              Email
            </FieldLabel>
            <Input {...field} id="signin-email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} className="h-12" placeholder="you@example.com" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-xs" />}
          </Field>
        )}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {busy === "send" && <Spinner />}
        {busy === "send" ? "Sending…" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}
