"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NavItem({ href, label, icon: Icon, badge, active }: { href: string; label: string; icon: typeof House; badge?: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition-colors",
        active ? "bg-white font-semibold text-ink shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)]" : "text-ink-2/80 hover:bg-white/60 hover:text-ink",
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.4 : 2} className={active ? "text-ink" : "text-muted-foreground"} />
      <span className="flex-1">{label}</span>
      {badge ? <Badge className="h-5 min-w-5 px-1.5 text-[10.5px] font-semibold">{badge}</Badge> : null}
    </Link>
  );
}
