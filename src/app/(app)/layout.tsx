import { getDb } from "@/db";
import { RightPanel } from "@/components/RightPanel";
import { Sidebar } from "@/components/Sidebar";
import { demoMode } from "@/lib/config";
import { requireOnboardedUser } from "@/server/auth";
import { getNow, getSetting } from "@/server/core";
import { getShellData, handshakeCountForRequest, slotLimitForRequest } from "@/server/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const db = await getDb();
  const [shell, used, limit, offset, now] = await Promise.all([
    getShellData(db, user),
    handshakeCountForRequest(db, user.id),
    slotLimitForRequest(db, user.level),
    demoMode ? getSetting<number>(db, "clock_offset_days") : Promise.resolve(0),
    getNow(db),
  ]);
  const due = shell.sides.filter((s) => s.sideStatus === "active" && !s.checkedToday).length;

  return (
    <div className="min-h-dvh p-0 sm:p-4 lg:p-6">
      <div className="glass-shell mx-auto flex min-h-dvh max-w-[1480px] flex-col overflow-hidden sm:min-h-[calc(100dvh-2rem)] sm:rounded-[28px] lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:flex-row">
        <Sidebar
          user={{ name: user.name, email: user.googleEmail, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin, level: user.level }}
          counts={{ incoming: shell.incoming, unread: shell.unread, due, used, limit }}
        />
        <main className="relative min-w-0 flex-1 overflow-y-auto scroll-thin">
          {demoMode && offset ? (
            <div className="sticky top-0 z-10 bg-ink px-4 py-1.5 text-center text-xs text-white">
              Demo clock: {now.toUTCString().slice(0, 16)} (+{offset} day{offset === 1 ? "" : "s"})
            </div>
          ) : null}
          <div className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        </main>
        <RightPanel sides={shell.sides} me={{ name: user.name, avatarUrl: user.avatarUrl }} />
      </div>
    </div>
  );
}
