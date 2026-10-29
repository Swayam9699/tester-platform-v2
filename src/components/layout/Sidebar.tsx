"use client";

import { Menu } from "lucide-react";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Brand } from "@/components/layout/Brand";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { UserCard } from "@/components/layout/UserCard";

export function Sidebar() {
  const open = useAppStore((s) => s.navOpen);
  const setOpen = useAppStore((s) => s.setNavOpen);
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Brand />
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Menu" aria-expanded={open}>
          <Menu size={18} />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] gap-0 bg-[#f6f6f7] px-4 py-6 lg:hidden">
          <SheetHeader className="p-0 px-2">
            <SheetTitle render={<div />}>
              <Brand />
            </SheetTitle>
          </SheetHeader>
          {/* Following a link closes the drawer. */}
          <div className="mt-6 flex-1 overflow-y-auto scroll-thin" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            <SidebarNav />
          </div>
          <UserCard />
        </SheetContent>
      </Sheet>

      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-black/[0.06] px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto scroll-thin">
          <SidebarNav />
        </div>
        <UserCard />
      </aside>
    </>
  );
}
