"use client";

import { useFormStatus } from "react-dom";
import { Checkbox } from "@/components/ui/checkbox";

/** Ticking the box submits its form (a check-in for today); it stays ticked while that is saving. */
export function CheckInBox() {
  const { pending } = useFormStatus();
  return (
    <Checkbox
      checked={pending}
      disabled={pending}
      title="Check in for today"
      aria-label="Check in for today"
      onClick={(e) => {
        e.preventDefault();
        e.currentTarget.closest("form")?.requestSubmit();
      }}
    />
  );
}
