import Link from "next/link";
import { checkInAction } from "@/app/actions";
import type { MySide } from "@/server/queries";
import { ActionForm, SubmitButton } from "./ActionForm";
import { AppLogo, Avatar, Badge, Progress, StatusBadge } from "./ui";

/** One app I'm testing: progress, today's check-in, or the next step. */
export function SideRow({ s }: { s: MySide }) {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <Link href={`/handshakes/${s.handshakeId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <AppLogo name={s.app.name} src={s.app.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold hover:underline">{s.app.name}</p>
            <StatusBadge status={s.sideStatus} />
            {s.kind === "friend" && <Badge tone="warn">friend</Badge>}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Avatar name={s.partner.name} src={s.partner.avatarUrl} size={16} ring={false} />
            {s.partner.name}
            {s.missedStreak > 0 && <span className="text-bad">· missed {s.missedStreak} day{s.missedStreak > 1 ? "s" : ""}</span>}
            {s.endedReason && <span>· {s.endedReason}</span>}
          </p>
        </div>
      </Link>
      {s.sideStatus === "active" && (
        <div className="sm:w-40">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>
              Day {s.day}/{s.totalDays}
            </span>
            <span>{s.daysLeft}d left</span>
          </div>
          <Progress value={s.day} max={s.totalDays} />
        </div>
      )}
      <div className="flex shrink-0 justify-end sm:w-36">
        {s.sideStatus === "active" ? (
          s.checkedToday ? (
            <span className="btn btn-soft btn-sm pointer-events-none text-ok">✓ Checked in</span>
          ) : (
            <ActionForm action={checkInAction} className="flex flex-col items-end" messageClassName="mt-1">
              <input type="hidden" name="sideId" value={s.sideId} />
              <SubmitButton className="btn btn-dark btn-sm" pendingText="Saving…">
                Opened today
              </SubmitButton>
            </ActionForm>
          )
        ) : s.sideStatus === "pending" ? (
          <Link href={`/handshakes/${s.handshakeId}`} className="btn btn-dark btn-sm">
            Upload proof
          </Link>
        ) : (
          <Link href={`/handshakes/${s.handshakeId}`} className="btn btn-soft btn-sm">
            Details
          </Link>
        )}
      </div>
    </div>
  );
}
