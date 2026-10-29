import Link from "next/link";
import { getDb } from "@/db";
import { SideRow } from "@/components/SideRow";
import { cx, EmptyState, PageHeader } from "@/components/ui";
import { requireOnboardedUser } from "@/server/auth";
import { listHandshakeHistory, listMySides } from "@/server/queries";

export const metadata = { title: "Handshakes" };

export default async function HandshakesPage({ searchParams }: { searchParams: Promise<{ tab?: string; due?: string }> }) {
  const { tab, due } = await searchParams;
  const user = await requireOnboardedUser();
  const db = await getDb();
  const history = tab === "history";
  let rows = (history ? await listHandshakeHistory(db, user.id) : await listMySides(db, user.id)).filter((s) => s.kind === "exchange");
  if (due) rows = rows.filter((s) => s.sideStatus === "active" && !s.checkedToday);

  const tabs = [
    { href: "/handshakes", label: "Active", on: !history && !due },
    { href: "/handshakes?due=1", label: "Due today", on: Boolean(due) },
    { href: "/handshakes?tab=history", label: "History", on: history },
  ];

  return (
    <div>
      <PageHeader title="Handshakes" subtitle={
          <>
            One row per app you&apos;re swapping tests on. Check in every day — 3 misses in a row breaks the handshake. Testing for a friend?{" "}
            <Link href="/friends?tab=testing" className="font-medium text-ink-2 underline-offset-4 hover:underline">
              Friend testing →
            </Link>
          </>
        } />
      <div className="mb-5 inline-flex rounded-full bg-black/[0.05] p-1">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={cx("rounded-full px-4 py-1.5 text-sm", t.on ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={due ? "🎉" : "🤝"}
          title={due ? "All checked in for today" : history ? "No finished handshakes yet" : "No active handshakes"}
          body={due ? "Come back tomorrow." : "Request a handshake from Discover, or accept one under Requests."}
          action={!due && !history ? <Link href="/discover" className="btn btn-dark">Discover apps</Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <SideRow key={s.sideId} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
