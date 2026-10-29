"use client";

import { Bell, CalendarCheck, ChevronUp, Compass, Handshake, HeartHandshake, House, Inbox, LayoutGrid, PlusSquare, Shield, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavItem } from "@/components/layout/NavItem";

export function SidebarNav() {
  const isAdmin = useAppStore((s) => s.user.isAdmin);
  const counts = useAppStore((s) => s.counts);
  const pathname = usePathname();
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
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
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
      <Collapsible defaultOpen>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="group/tools mt-6 h-auto w-full justify-between rounded-xl px-3 pt-1 pb-2 text-[13px] font-semibold text-ink hover:not-disabled:bg-transparent"
            />
          }
        >
          Testing tools
          <ChevronUp size={15} className="rotate-180 text-muted-foreground transition-transform group-data-[panel-open]/tools:rotate-0" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5">
          {tools.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href) && item.href !== "/handshakes?due=1"} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );
}
