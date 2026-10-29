"use client";

import { LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { UserAvatar } from "@/components/common";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function UserCard() {
  const user = useAppStore((s) => s.user);
  const { used, limit } = useAppStore((s) => s.counts);
  return (
    <div className="mt-4 rounded-2xl bg-[#8e939b]/75 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <UserAvatar name={user.name} src={user.avatarUrl} size={34} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#4ade80] ring-2 ring-[#8e939b]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.name}</p>
          <p className="truncate text-[11.5px] text-white/75">@{user.email.split("@")[0]}</p>
        </div>
        <form action={signOut}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="submit" variant="ghost" size="icon-sm" className="size-7 rounded-lg text-white/70 hover:not-disabled:bg-white/15 hover:not-disabled:text-white" aria-label="Sign out" />
              }
            >
              <LogOut size={14} />
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </form>
      </div>
      <Link
        href="/profile"
        className="mt-3 flex h-10 items-center gap-2 rounded-full bg-white/20 pl-1 pr-4 text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-white/30"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink">
          <Sparkles size={14} />
        </span>
        <span className="flex-1 text-center">
          Level {user.level} · {used}/{limit} slots
        </span>
      </Link>
    </div>
  );
}
