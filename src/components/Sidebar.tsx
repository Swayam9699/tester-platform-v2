"use client";

import {
  Bell,
  CalendarCheck,
  ChevronUp,
  Compass,
  Handshake,
  HeartHandshake,
  House,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  PlusSquare,
  Shield,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions";
import { APP_NAME } from "@/lib/config";
import { Avatar, cx, LogoMark } from "./ui";

type Props = {
  user: { name: string; email: string; avatarUrl: string | null; isAdmin: boolean; level: number };
  counts: { incoming: number; unread: number; due: number; used: number; limit: number };
};

export function Sidebar(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Brand />
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="border-b border-line px-3 pb-3 lg:hidden" onClick={() => setOpen(false)}>
          <Nav {...props} />
        </div>
      )}

      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-black/[0.06] px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto scroll-thin">
          <Nav {...props} />
        </div>
        <UserCard {...props} />
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">{APP_NAME.toUpperCase()}</span>
    </Link>
  );
}

function Nav({ user, counts }: Props) {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(true);
  const main = [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/apps", label: "My Apps", icon: LayoutGrid },
    { href: "/requests", label: "Requests", icon: Inbox, badge: counts.incoming },
    { href: "/handshakes", label: "Handshakes", icon: Handshake },
    { href: "/friends", label: "Friend testing", icon: HeartHandshake },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: counts.unread },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];
  const tools = [
    { href: "/apps/new", label: "Submit app", icon: PlusSquare },
    { href: "/handshakes?due=1", label: "Daily check-ins", icon: CalendarCheck, badge: counts.due },
    ...(user.isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/apps") return pathname === "/apps" || (pathname.startsWith("/apps/") && pathname !== "/apps/new");
    return pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"));
  };

  return (
    <nav className="space-y-0.5">
      {main.map((item) => (
        <NavItem key={item.href} {...item} active={isActive(item.href)} />
      ))}
      <button
        onClick={() => setToolsOpen(!toolsOpen)}
        className="mt-6 flex w-full items-center justify-between px-3 pb-2 text-[13px] font-semibold text-ink"
      >
        Testing tools
        <ChevronUp size={15} className={cx("text-muted transition-transform", !toolsOpen && "rotate-180")} />
      </button>
      {toolsOpen && tools.map((item) => <NavItem key={item.href} {...item} active={isActive(item.href) && item.href !== "/handshakes?due=1"} />)}
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, badge, active }: { href: string; label: string; icon: typeof House; badge?: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition-colors",
        active ? "bg-white font-semibold text-ink shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)]" : "text-ink-2/80 hover:bg-white/60 hover:text-ink",
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.4 : 2} className={active ? "text-ink" : "text-muted"} />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10.5px] font-semibold text-white">{badge}</span>
      ) : null}
    </Link>
  );
}

function UserCard({ user, counts }: Props) {
  return (
    <div className="mt-4 rounded-2xl bg-[#8e939b]/75 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Avatar name={user.name} src={user.avatarUrl} size={34} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#4ade80] ring-2 ring-[#8e939b]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.name}</p>
          <p className="truncate text-[11.5px] text-white/75">@{user.email.split("@")[0]}</p>
        </div>
        <form action={signOut}>
          <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/15 hover:text-white" title="Sign out" aria-label="Sign out">
            <LogOut size={14} />
          </button>
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
          Level {user.level} · {counts.used}/{counts.limit} slots
        </span>
      </Link>
    </div>
  );
}
