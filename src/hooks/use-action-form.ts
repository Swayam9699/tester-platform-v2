"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionState } from "@/actions/utils";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * react-hook-form + zod for a form that submits to a Server Action. The schema (src/validation) checks input in the
 * browser; the action validates the same schema again on the server and its answer comes back as a toast, with any
 * server-side field errors attached to their fields. Actions that redirect on success simply navigate away.
 */
export function useActionForm<S extends z.ZodType<FieldValues, FieldValues>>({
  schema,
  action,
  defaultValues,
  extra,
  resetOnSuccess = false,
  onSuccess,
}: {
  schema: S;
  action: Action;
  defaultValues?: DefaultValues<z.input<S>>;
  /** Sent along but not part of the schema, e.g. a `next` redirect target. */
  extra?: Record<string, string>;
  resetOnSuccess?: boolean;
  onSuccess?: (state: NonNullable<ActionState>) => void;
}) {
  // zodResolver can't infer through a generic schema type; it does resolve to exactly these input/output types.
  const resolver = zodResolver(schema) as unknown as Resolver<z.input<S>, unknown, z.output<S>>;
  const form = useForm<z.input<S>, unknown, z.output<S>>({ resolver, defaultValues });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit(
    (values) =>
      new Promise<void>((resolve) =>
        startTransition(async () => {
          try {
            const state = await action(null, toFormData({ ...values, ...extra }));
            if (!state) return;
            if (state.ok) {
              if (state.message) toast.success(state.message);
              if (resetOnSuccess) form.reset();
              onSuccess?.(state);
              return;
            }
            for (const [name, messages] of Object.entries(state.fieldErrors ?? {})) {
              if (messages?.[0]) form.setError(name as Path<z.input<S>>, { type: "server", message: messages[0] });
            }
            toast.error(state.message ?? "Something went wrong. Please try again.");
          } finally {
            resolve();
          }
        }),
      ),
  );

  return { form, onSubmit, pending: pending || form.formState.isSubmitting };
}

function toFormData(values: Record<string, unknown>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    fd.append(key, value instanceof Blob ? value : String(value));
  }
  return fd;
}
