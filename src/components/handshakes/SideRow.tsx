import Link from "next/link";
import { checkInAction } from "@/actions/handshakes";
import type { MySide } from "@/api/queries";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { AppLogo, StatusBadge, UserAvatar } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { percent } from "@/lib/utils";

/** One app I'm testing: progress, today's check-in, or the next step. */
export function SideRow({ s }: { s: MySide }) {
  return (
    <Card className="gap-4 p-4 sm:flex-row sm:items-center">
      <Link href={`/handshakes/${s.handshakeId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <AppLogo name={s.app.name} src={s.app.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold hover:underline">{s.app.name}</p>
            <StatusBadge status={s.sideStatus} />
            {s.kind === "friend" && <Badge variant="warning">friend</Badge>}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={s.partner.name} src={s.partner.avatarUrl} size={16} ring={false} />
            {s.partner.name}
            {s.missedStreak > 0 && <span className="text-bad">· missed {s.missedStreak} day{s.missedStreak > 1 ? "s" : ""}</span>}
            {s.endedReason && <span>· {s.endedReason}</span>}
          </p>
        </div>
      </Link>
      {s.sideStatus === "active" && (
        <div className="sm:w-40">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              Day {s.day}/{s.totalDays}
            </span>
            <span>{s.daysLeft}d left</span>
          </div>
          <Progress value={percent(s.day, s.totalDays)} />
        </div>
      )}
      <div className="flex shrink-0 justify-end sm:w-36">
        {s.sideStatus === "active" ? (
          s.checkedToday ? (
            <Button variant="outline" size="sm" className="pointer-events-none text-ok" nativeButton={false} render={<span />}>
              ✓ Checked in
            </Button>
          ) : (
            <ActionForm action={checkInAction} className="flex flex-col items-end">
              <Input type="hidden" name="sideId" value={s.sideId} />
              <SubmitButton size="sm" pendingText="Saving…">
                Opened today
              </SubmitButton>
            </ActionForm>
          )
        ) : s.sideStatus === "pending" ? (
          <Button size="sm" nativeButton={false} render={<Link href={`/handshakes/${s.handshakeId}`} />}>
            Upload proof
          </Button>
        ) : (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/handshakes/${s.handshakeId}`} />}>
            Details
          </Button>
        )}
      </div>
    </Card>
  );
}
