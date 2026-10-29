"use client";

import { Controller } from "react-hook-form";
import { checkInAction } from "@/actions/handshakes";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { checkInSchema } from "@/validation/handshakes";

/** Today's check-in: an optional note and an optional screenshot. */
export function CheckInForm({ sideId }: { sideId: string }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: checkInSchema,
    action: checkInAction,
    defaultValues: { sideId, note: "" },
    resetOnSuccess: true,
  });
  const proofError = form.formState.errors.proof;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <Controller
        name="note"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`note-${sideId}`} className="sr-only">
              Note
            </FieldLabel>
            <Input
              {...field}
              id={`note-${sideId}`}
              maxLength={200}
              placeholder="Optional note — what did you try today?"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Field data-invalid={Boolean(proofError)}>
        <FieldLabel htmlFor={`checkin-proof-${sideId}`} className="sr-only">
          Screenshot (optional)
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={`checkin-proof-${sideId}`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-invalid={Boolean(proofError)}
            className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 text-xs text-muted-foreground file:mr-2 file:h-auto file:rounded-full file:bg-black/[0.06] file:px-3 file:py-1 file:text-xs file:font-normal"
            {...form.register("proof")}
          />
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Saving…" : "I opened the app today"}
          </Button>
        </div>
        {proofError && <FieldError errors={[proofError]} />}
      </Field>
    </form>
  );
}
