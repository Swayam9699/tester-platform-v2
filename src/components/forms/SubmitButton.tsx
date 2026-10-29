"use client";

import { type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** A submit button that disables itself and can swap its label while its form is pending. */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && pendingText ? (
        <>
          <Spinner />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
