"use client";

import { ErrorView } from "@/components/feedback/ErrorView";
import { Card } from "@/components/ui/card";

/** Errors in a page keep the sidebar around them; errors in the shell itself fall through to app/error.tsx. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Card className="px-6 py-12">
      <ErrorView error={error} retry={retry} homeHref="/dashboard" />
    </Card>
  );
}
