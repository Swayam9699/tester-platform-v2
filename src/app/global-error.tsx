"use client";

import { ErrorView } from "@/components/feedback/ErrorView";
import "./globals.css";

/** Replaces the root layout when it fails itself, so it brings its own <html> and <body>. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="grid min-h-dvh place-items-center p-4">
          <ErrorView error={error} retry={retry} />
        </div>
      </body>
    </html>
  );
}
