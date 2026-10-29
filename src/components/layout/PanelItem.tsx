"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import { checkInAction } from "@/actions/handshakes";
import type { MySide } from "@/api/queries";
import { AppLogo, AvatarStack } from "@/components/common";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckInBox } from "@/components/layout/CheckInBox";

type Me = { name: string; avatarUrl: string | null };

export function PanelItem({ side: s, me }: { side: MySide; me: Me }) {
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
            <Checkbox checked disabled className="disabled:cursor-default disabled:opacity-100" aria-label="Checked in today" />
          ) : (
            <ActionForm action={checkInAction} className="flex">
              <Input type="hidden" name="sideId" value={s.sideId} />
              <CheckInBox />
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
        <p className={cn("truncate text-[12.5px]", s.missedStreak > 0 || s.proofRejected ? "text-bad" : "text-muted-foreground")}>{subtitle}</p>
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
