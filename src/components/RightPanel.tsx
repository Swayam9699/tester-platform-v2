"use client";

import { CalendarCheck, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { checkInAction } from "@/app/actions";
import type { MySide } from "@/server/queries";
import { ActionForm, SubmitButton } from "./ActionForm";
import { AppLogo, AvatarStack, cx } from "./ui";

type Me = { name: string; avatarUrl: string | null };

export function RightPanel({ sides, me }: { sides: MySide[]; me: Me }) {
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
          <p className="text-xs text-muted">{due ? `${due} check-in${due > 1 ? "s" : ""} due` : "All caught up ✓"}</p>
        </div>
        <Link href="/handshakes" className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] text-ink-2 hover:bg-black/10" title="All handshakes">
          <CalendarCheck size={16} />
        </Link>
      </div>

      <label className="mt-4 flex h-10 items-center gap-2 rounded-full border border-line px-3.5 text-sm focus-within:border-[#c9cbd0]">
        <Search size={15} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full bg-transparent outline-none placeholder:text-faint" />
      </label>

      <ul className="-mx-1 mt-3 flex-1 space-y-0 overflow-y-auto px-1 scroll-thin">
        {filtered.map((s) => (
          <PanelItem key={s.sideId} side={s} me={me} />
        ))}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">{sides.length ? "No matches." : "You aren't testing any apps yet."}</li>
        )}
      </ul>

      <Link href="/discover" className="btn btn-dark mt-4 h-11 w-full">
        Find apps to test
      </Link>
    </aside>
  );
}

function PanelItem({ side: s, me }: { side: MySide; me: Me }) {
  const pending = s.sideStatus === "pending";
  const waiting = s.sideStatus === "joined";
  const active = s.sideStatus === "active";
  const subtitle = pending
    ? s.proofRejected
      ? "Proof rejected — upload again"
      : "Opt in & upload your proof"
    : waiting
      ? `Waiting for ${s.partner.name.split(" ")[0]} to opt in`
      : s.missedStreak > 0
        ? `Missed ${s.missedStreak} day${s.missedStreak > 1 ? "s" : ""} — check in today!`
        : s.kind === "friend"
          ? `Day ${s.day} of ${s.totalDays} · for ${s.partner.name.split(" ")[0]}`
          : `Day ${s.day} of ${s.totalDays}${s.partnerCheckedToday ? ` · ${s.partner.name.split(" ")[0]} checked in` : ""}`;

  return (
    <li className="flex gap-3 border-b border-line py-3.5 last:border-0">
      <div className="pt-0.5">
        {active ? (
          s.checkedToday ? (
            <input type="checkbox" className="check" checked readOnly aria-label="Checked in today" />
          ) : (
            <ActionForm action={checkInAction} messageClassName="hidden">
              <input type="hidden" name="sideId" value={s.sideId} />
              <SubmitButton className="check" title="Check in for today" pendingText="">
                <span className="sr-only">Check in for today</span>
              </SubmitButton>
            </ActionForm>
          )
        ) : pending ? (
          <Link href={`/handshakes/${s.handshakeId}`} className="grid h-[1.05rem] w-[1.05rem] place-items-center rounded-[5px] bg-peach text-white" title="Upload proof">
            <Upload size={10} strokeWidth={3} />
          </Link>
        ) : (
          <span className="block h-[1.05rem] w-[1.05rem] rounded-[5px] border-[1.5px] border-dashed border-[#c9cbd0]" />
        )}
      </div>
      <Link href={`/handshakes/${s.handshakeId}`} className="min-w-0 flex-1 group">
        <p className="truncate text-[13.5px] font-semibold text-ink group-hover:underline">{s.app.name}</p>
        <p className={cx("truncate text-[12.5px]", s.missedStreak > 0 || s.proofRejected ? "text-bad" : "text-muted")}>{subtitle}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarStack people={[s.partner, me]} size={26} />
            <AppLogo name={s.app.name} src={s.app.logoUrl} size={22} />
          </div>
          <span className="text-[11px] text-faint">{active ? `${s.daysLeft}d left` : pending || waiting ? "joining" : ""}</span>
        </div>
      </Link>
    </li>
  );
}
