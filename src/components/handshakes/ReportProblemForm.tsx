"use client";

import { Controller } from "react-hook-form";
import { reportAction } from "@/actions/handshakes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { reportSchema } from "@/validation/handshakes";

/** Flag a handshake for the admins. */
export function ReportProblemForm({ handshakeId }: { handshakeId: string }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: reportSchema,
    action: reportAction,
    defaultValues: { handshakeId, reason: "" },
    resetOnSuccess: true,
  });

  return (
    <Card className="mt-3 block p-4">
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`reason-${handshakeId}`} className="sr-only">
                What went wrong
              </FieldLabel>
              <Textarea
                {...field}
                id={`reason-${handshakeId}`}
                rows={3}
                placeholder="e.g. their opt-in screenshot is for a different app, or they asked me to uninstall early."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Send to admins
        </Button>
      </form>
    </Card>
  );
}
