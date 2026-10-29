"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/actions/utils";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * For one-click actions (accept, decline, mark read, admin buttons): a plain <form> posting hidden fields to a Server
 * Action, so it works before hydration too. The result shows as a toast. Forms with inputs use useActionForm instead.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.message) (state.ok ? toast.success : toast.error)(state.message);
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
    </form>
  );
}
