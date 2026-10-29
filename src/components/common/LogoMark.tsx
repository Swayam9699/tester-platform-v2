import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("h-7 w-7", className)} aria-hidden>
      <rect x="1" y="6" width="12" height="16" rx="6" fill="#0f1115" />
      <rect x="15" y="6" width="12" height="16" rx="6" fill="#0f1115" />
      <rect x="7" y="11" width="14" height="6" rx="3" fill="#fff" />
    </svg>
  );
}
