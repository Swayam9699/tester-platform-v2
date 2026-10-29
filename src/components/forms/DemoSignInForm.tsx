"use client";

import { Controller } from "react-hook-form";
import { demoSignIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { demoSignInSchema } from "@/validation/auth";

/** Demo mode only: sign in as (or create) any user by email. */
export function DemoSignInForm({ next }: { next: string }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: demoSignInSchema,
    action: demoSignIn,
    defaultValues: { name: "", email: "" },
    extra: { next },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex items-start gap-2">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="w-28 shrink-0 gap-1">
            <FieldLabel htmlFor="demo-name" className="sr-only">
              Name
            </FieldLabel>
            <Input {...field} id="demo-name" aria-invalid={fieldState.invalid} className="h-10" placeholder="Name" autoComplete="off" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-xs" />}
          </Field>
        )}
      />
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="flex-1 gap-1">
            <FieldLabel htmlFor="demo-email" className="sr-only">
              Email
            </FieldLabel>
            <Input {...field} id="demo-email" type="email" aria-invalid={fieldState.invalid} className="h-10" placeholder="new@email.com" autoComplete="off" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-xs" />}
          </Field>
        )}
      />
      <Button type="submit" disabled={pending}>
        Go
      </Button>
    </form>
  );
}
