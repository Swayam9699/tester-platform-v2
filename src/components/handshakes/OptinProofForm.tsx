"use client";

import { optinProofAction } from "@/actions/handshakes";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { optinProofSchema } from "@/validation/handshakes";

/** Upload the "You're a tester" screenshot that proves the opt-in. */
export function OptinProofForm({ sideId }: { sideId: string }) {
  const { form, onSubmit, pending } = useActionForm({ schema: optinProofSchema, action: optinProofAction, defaultValues: { sideId } });
  const error = form.formState.errors.proof;
  const id = `proof-${sideId}`;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id} className="sr-only">
          Opt-in screenshot
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-invalid={Boolean(error)}
            className="flex-1 pt-2 text-xs file:mr-3 file:h-auto file:rounded-full file:bg-ink file:px-3 file:py-1 file:text-xs file:text-white"
            {...form.register("proof")}
          />
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Uploading…" : "Upload proof"}
          </Button>
        </div>
        {error && <FieldError errors={[error]} />}
      </Field>
    </form>
  );
}
