"use client";

import { ExternalLink } from "lucide-react";
import { Controller } from "react-hook-form";
import { onboardAction } from "@/actions/profile";
import { AndroidVersionSelect } from "@/components/forms/AndroidVersionSelect";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { onboardingSchema } from "@/validation/profile";

export function OnboardingForm({ next, playEmail, group }: { next: string; playEmail: string; group: { url: string; email: string } }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: onboardingSchema,
    action: onboardAction,
    defaultValues: { joinedGoogleGroup: false, playEmail, deviceAndroidApi: undefined },
    extra: { next },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
      <Card className="block p-5 text-base">
        <p className="font-semibold">
          <span className="mr-2 text-muted-foreground">1.</span>Join our Google Group
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every developer adds this one group to their closed track, so joining once gives you access to every app on the platform. Join with the Google account you use on Google Play (step 2).
        </p>
        <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<a href={group.url} target="_blank" rel="noreferrer" />}>
          Open {group.email} <ExternalLink size={12} />
        </Button>
        <Controller
          name="joinedGoogleGroup"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid} className="mt-4">
              <Checkbox
                id="joinedGoogleGroup"
                name={field.name}
                ref={field.ref}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldLabel htmlFor="joinedGoogleGroup" className="cursor-pointer text-sm font-normal text-foreground">
                  I&apos;ve joined the group
                </FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </Card>

      <Controller
        name="playEmail"
        control={form.control}
        render={({ field, fieldState }) => (
          <Card className="block p-5 text-base">
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="playEmail" className="text-base font-semibold text-foreground">
                <span className="text-muted-foreground">2.</span>Your Google Play account
              </FieldLabel>
              <FieldDescription>The Google account signed in to the Play Store on your phone. You opt in to tests with it, and it must be the one in the group.</FieldDescription>
              <Input {...field} id="playEmail" type="email" autoComplete="email" placeholder="you@gmail.com" className="mt-1" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          </Card>
        )}
      />

      <Controller
        name="deviceAndroidApi"
        control={form.control}
        render={({ field, fieldState }) => (
          <Card className="block p-5 text-base">
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="deviceAndroidApi" className="text-base font-semibold text-foreground">
                <span className="text-muted-foreground">3.</span>Your phone&apos;s Android version
              </FieldLabel>
              <FieldDescription>Settings → About phone → Android version. We only show you apps your phone can run.</FieldDescription>
              <AndroidVersionSelect
                id="deviceAndroidApi"
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                className="mt-1"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          </Card>
        )}
      />

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending && <Spinner />}
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
