import Link from "next/link";
import type { ReactNode } from "react";

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
      {children}
    </Link>
  );
}
