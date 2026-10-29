"use client";

import { Controller } from "react-hook-form";
import { feedbackAction } from "@/actions/handshakes";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { feedbackSchema } from "@/validation/handshakes";

type Feedback = { rating: number; bugs: string | null; comments: string | null };

/** A 1–5 rating plus bugs and comments for the app being tested; sending again updates it. */
export function FeedbackForm({ sideId, initial }: { sideId: string; initial: Feedback | null }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: feedbackSchema,
    action: feedbackAction,
    defaultValues: {
      sideId,
      rating: initial ? String(initial.rating) : "",
      bugs: initial?.bugs ?? "",
      comments: initial?.comments ?? "",
    },
  });

  return (
    <Card className="block p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Controller
          name="rating"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid} className="gap-0">
              <FieldLegend variant="label" className="text-[0.8125rem] text-ink-2">
                Rating
              </FieldLegend>
              <RadioGroup
                name={field.name}
                value={field.value == null ? "" : String(field.value)}
                onValueChange={field.onChange}
                aria-invalid={fieldState.invalid}
                className="flex gap-2"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <FieldLabel
                    key={n}
                    htmlFor={`rating-${sideId}-${n}`}
                    className="grid h-10 w-12 cursor-pointer place-items-center gap-0 rounded-xl border border-line text-sm font-normal text-ink has-data-checked:border-ink has-data-checked:bg-ink has-data-checked:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-coral"
                  >
                    <RadioGroupItem value={String(n)} id={`rating-${sideId}-${n}`} aria-invalid={fieldState.invalid} className="sr-only" />
                    {n}★
                  </FieldLabel>
                ))}
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} className="mt-2" />}
            </FieldSet>
          )}
        />
        <Controller
          name="bugs"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`bugs-${sideId}`}>Bugs found</FieldLabel>
              <Textarea
                {...field}
                id={`bugs-${sideId}`}
                rows={2}
                placeholder="Steps to reproduce, device, what happened…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="comments"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`comments-${sideId}`}>Comments</FieldLabel>
              <Textarea
                {...field}
                id={`comments-${sideId}`}
                rows={2}
                placeholder="What you liked, what was confusing…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Sending…" : initial ? "Update feedback" : "Send feedback"}
        </Button>
      </form>
    </Card>
  );
}
