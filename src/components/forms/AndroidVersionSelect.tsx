"use client";

import type { Ref } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANDROID_VERSIONS } from "@/lib/android";
import { cn } from "@/lib/utils";

// Base UI's Select shows the selected item's label (not its raw value) when it is given the items up front.
const ITEMS = ANDROID_VERSIONS.map((v) => ({ value: String(v.api), label: `${v.label} (API ${v.api})` }));

/** An Android version picker for a react-hook-form Controller. Values are API levels as strings; the schemas coerce them. */
export function AndroidVersionSelect({
  id,
  value,
  onChange,
  onBlur,
  ref,
  invalid,
  className,
}: {
  id: string;
  value: unknown;
  onChange: (value: string) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLButtonElement>;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <Select items={ITEMS} value={value == null || value === "" ? null : String(value)} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger ref={ref} id={id} onBlur={onBlur} aria-invalid={invalid} className={cn("w-full", className)}>
        <SelectValue placeholder="Choose…" />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
