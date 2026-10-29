"use client";

import clsx from "clsx";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  messageClassName,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  messageClassName?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={clsx("text-xs", state.ok ? "text-ok" : "text-bad", messageClassName ?? "mt-2 basis-full")}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn btn-dark",
  name,
  value,
  pendingText,
  disabled,
  title,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingText?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={className} title={title}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
