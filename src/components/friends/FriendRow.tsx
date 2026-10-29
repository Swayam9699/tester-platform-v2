import { leaveFriendAction } from "@/actions/handshakes";
import { StatusBadge, UserAvatar } from "@/components/common";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { percent } from "@/lib/utils";
import { type FriendTester } from "@/api/queries";

export function FriendRow({ f, now }: { f: FriendTester; now: Date }) {
  const hoursLeft = f.deadlineAt ? Math.max(0, Math.round((f.deadlineAt.getTime() - now.getTime()) / 3_600_000)) : null;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm sm:flex-nowrap">
      <UserAvatar name={f.tester.name} src={f.tester.avatarUrl} size={32} ring={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{f.tester.name}</p>
        <p className="text-xs text-muted-foreground">
          {f.sideStatus === "pending"
            ? `Needs to opt in on Google Play${hoursLeft != null ? ` · ${hoursLeft}h left` : ""}`
            : `${f.checkinCount} check-in${f.checkinCount === 1 ? "" : "s"}${f.checkedToday ? " · opened today ✓" : ""}`}
        </p>
      </div>
      {f.sideStatus === "active" && (
        <div className="w-full sm:w-36">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              Day {f.day}/{f.totalDays}
            </span>
            <span>{f.totalDays - f.day}d left</span>
          </div>
          <Progress value={percent(f.day, f.totalDays)} />
        </div>
      )}
      <StatusBadge status={f.sideStatus} />
      <ActionForm action={leaveFriendAction}>
        <Input type="hidden" name="handshakeId" value={f.handshakeId} />
        <SubmitButton variant="ghost" size="sm" className="text-muted-foreground" pendingText="…" title={`Remove ${f.tester.name} and free the slot`}>
          Remove
        </SubmitButton>
      </ActionForm>
    </li>
  );
}
