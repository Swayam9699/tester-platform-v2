"use client";

import { ErrorView } from "@/components/feedback/ErrorView";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <ErrorView error={error} retry={retry} />
    </div>
  );
}
