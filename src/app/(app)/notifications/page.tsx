import Link from "next/link";
import { readNotificationsAction } from "@/app/actions";
import { getDb } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { cx, EmptyState, PageHeader } from "@/components/ui";
import { relativeTime } from "@/lib/time";
import { requireOnboardedUser } from "@/server/auth";
import { getNow } from "@/server/core";
import { listNotifications } from "@/server/queries";

export const metadata = { title: "Notifications" };

const ICONS: Record<string, string> = {
  request: "📨",
  accepted: "🤝",
  rejected: "🙅",
  expired: "⌛",
  started: "🚦",
  partner_joined: "👋",
  warning: "⚠️",
  blocked: "⛔",
  unblocked: "✅",
  partner_skipped: "🪫",
  completed: "🎉",
  level_up: "⭐",
  feedback: "💬",
  proof_rejected: "🖼️",
  dispute: "⚖️",
  friend_joined: "💌",
  friend_ended: "👋",
};

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const db = await getDb();
  const [items, now] = await Promise.all([listNotifications(db, user.id), getNow(db)]);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        action={
          unread ? (
            <ActionForm action={readNotificationsAction} messageClassName="hidden">
              <SubmitButton className="btn btn-soft btn-sm">Mark all read</SubmitButton>
            </ActionForm>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="Nothing here yet" />
      ) : (
        <div className="card divide-y divide-line">
          {items.map((n) => {
            const body = (
              <div className={cx("flex gap-3 px-4 py-3.5", !n.readAt && "bg-[#fff8f4]")}>
                <span className="text-lg leading-6">{ICONS[n.kind] ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-sm", !n.readAt ? "font-semibold" : "font-medium text-ink-2")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-faint">{relativeTime(n.createdAt, now)}</span>
                {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-coral" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-black/[0.015]">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
