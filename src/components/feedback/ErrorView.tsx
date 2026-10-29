"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Sparkle } from "@/components/common";
import { Button } from "@/components/ui/button";

/** Shared body of the error boundaries (app/error.tsx, app/(app)/error.tsx, app/global-error.tsx). */
export function ErrorView({ error, retry, homeHref = "/" }: { error: unknown; retry: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  // Server errors reach the browser with a generic message and a digest that matches the server log entry.
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="text-center">
      <Sparkle size={72} className="mx-auto" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        That didn&apos;t load. It&apos;s usually temporary, so try again in a moment.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-faint">Error ID: {digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href={homeHref} />}>
          Go home
        </Button>
      </div>
    </div>
  );
}
