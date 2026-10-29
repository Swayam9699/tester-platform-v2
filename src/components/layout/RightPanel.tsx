"use client";

import { CalendarCheck, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PanelItem } from "@/components/layout/PanelItem";

export function RightPanel() {
  const sides = useAppStore((s) => s.sides);
  const me = useAppStore((s) => s.user);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sides;
    return sides.filter((s) => s.app.name.toLowerCase().includes(term) || s.partner.name.toLowerCase().includes(term));
  }, [q, sides]);
  const due = sides.filter((s) => s.sideStatus === "active" && !s.checkedToday).length;

  return (
    <aside className="m-3 hidden w-[300px] shrink-0 flex-col rounded-[22px] bg-white p-5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.2)] xl:flex">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Testing today</h2>
          <p className="text-xs text-muted-foreground">{due ? `${due} check-in${due > 1 ? "s" : ""} due` : "All caught up ✓"}</p>
        </div>
        <Link href="/handshakes" className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] text-ink-2 hover:bg-black/10" title="All handshakes">
          <CalendarCheck size={16} />
        </Link>
      </div>

      <InputGroup className="mt-4 h-10 rounded-full">
        <InputGroupAddon className="pl-3.5">
          <Search size={15} />
        </InputGroupAddon>
        <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search your tests" />
      </InputGroup>

      <ul className="-mx-1 mt-3 flex-1 space-y-0 overflow-y-auto px-1 scroll-thin">
        {filtered.map((s) => (
          <PanelItem key={s.sideId} side={s} me={me} />
        ))}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">{sides.length ? "No matches." : "You aren't testing any apps yet."}</li>
        )}
      </ul>

      <Button className="mt-4 h-11 w-full" nativeButton={false} render={<Link href="/discover" />}>
        Find apps to test
      </Button>
    </aside>
  );
}
