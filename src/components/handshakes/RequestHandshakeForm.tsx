"use client";

import { Controller } from "react-hook-form";
import { requestHandshakeAction } from "@/actions/handshakes";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { requestHandshakeSchema } from "@/validation/handshakes";

/** Pick one of my apps to offer in return and send the request; the action redirects to Requests on success. */
export function RequestHandshakeForm({
  targetAppId,
  offerable,
  onDone,
}: {
  targetAppId: string;
  offerable: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: requestHandshakeSchema,
    action: requestHandshakeAction,
    defaultValues: { targetAppId, offeredAppId: offerable[0]?.id ?? "", message: "" },
    onSuccess: onDone,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      <Controller
        name="offeredAppId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`offer-${targetAppId}`}>App you offer in return</FieldLabel>
            <Select
              name={field.name}
              items={offerable.map((a) => ({ value: a.id, label: a.name }))}
              value={field.value ? String(field.value) : null}
              onValueChange={(v) => field.onChange(v ?? "")}
            >
              <SelectTrigger id={`offer-${targetAppId}`} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                <SelectValue placeholder="Choose an app" />
              </SelectTrigger>
              <SelectContent>
                {offerable.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="message"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`msg-${targetAppId}`}>
              Message <span className="font-normal text-faint">(optional)</span>
            </FieldLabel>
            <Textarea
              {...field}
              id={`msg-${targetAppId}`}
              rows={3}
              maxLength={300}
              placeholder="Hi! Happy to test daily and leave detailed feedback."
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
