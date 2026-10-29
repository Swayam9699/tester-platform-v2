"use client";

import { Controller } from "react-hook-form";
import { profileAction } from "@/actions/profile";
import { AndroidVersionSelect } from "@/components/forms/AndroidVersionSelect";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { profileSchema } from "@/validation/profile";

export function ProfileForm({ name, playEmail, deviceAndroidApi }: { name: string; playEmail: string | null; deviceAndroidApi: number | null }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: profileSchema,
    action: profileAction,
    defaultValues: { name, playEmail: playEmail ?? "", deviceAndroidApi: deviceAndroidApi ?? undefined },
  });

  return (
    <Card className="block p-5">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Display name</FieldLabel>
              <Input {...field} id="name" autoComplete="name" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="playEmail"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor="playEmail">Google Play account</FieldLabel>
              <Input {...field} id="playEmail" type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription className="text-xs">The account on your phone&apos;s Play Store. You opt in to tests with it.</FieldDescription>
              )}
            </Field>
          )}
        />
        <Controller
          name="deviceAndroidApi"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="deviceAndroidApi">Your device&apos;s Android version</FieldLabel>
              <AndroidVersionSelect
                id="deviceAndroidApi"
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
