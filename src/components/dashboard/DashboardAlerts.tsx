import { AlertTriangle, Inbox, ShieldAlert, Upload } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
import { getDashboard } from "@/api/queries";

export function DashboardAlerts({ d, blockedUntil }: { d: Awaited<ReturnType<typeof getDashboard>>; blockedUntil: Date | null }) {
  const items: { icon: React.ReactNode; tone: string; text: React.ReactNode; href: string }[] = [];
  if (d.blocked) {
    items.push({
      icon: <ShieldAlert size={16} />,
      tone: "bg-bad-soft text-bad",
      text: (
        <>
          You&apos;re blocked from new handshakes until <b>{blockedUntil?.toUTCString().slice(0, 16)}</b>. Existing handshakes continue.
        </>
      ),
      href: "/profile",
    });
  }
  for (const s of d.needProof) {
    items.push({
      icon: <Upload size={16} />,
      tone: "bg-warn-soft text-warn",
      text: (
        <>
          Opt in to <b>{s.app.name}</b> and upload your screenshot
          {s.deadlineAt ? ` — ${Math.max(0, Math.round((s.deadlineAt.getTime() - d.now.getTime()) / 3_600_000))}h left` : ""}
        </>
      ),
      href: `/handshakes/${s.handshakeId}`,
    });
  }
  for (const s of d.atRisk) {
    items.push({
      icon: <AlertTriangle size={16} />,
      tone: "bg-bad-soft text-bad",
      text: (
        <>
          You missed {s.missedStreak} check-in{s.missedStreak > 1 ? "s" : ""} on <b>{s.app.name}</b>. 3 in a row breaks the handshake.
        </>
      ),
      href: `/handshakes/${s.handshakeId}`,
    });
  }
  if (d.incoming) {
    items.push({
      icon: <Inbox size={16} />,
      tone: "bg-info-soft text-info",
      text: (
        <>
          {d.incoming} developer{d.incoming > 1 ? "s want" : " wants"} to swap tests with you
        </>
      ),
      href: "/requests",
    });
  }
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>Needs your attention</SectionTitle>
      <div className="space-y-2">
        {items.map((it, i) => (
          <Link key={i} href={it.href} className="block">
            <Card className="flex-row items-center gap-3 p-3 text-sm hover:bg-white/80">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${it.tone}`}>{it.icon}</span>
              <span className="flex-1 text-ink-2">{it.text}</span>
              <span className="text-muted-foreground">→</span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
