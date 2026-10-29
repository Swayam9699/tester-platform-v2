import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { AppLogo, EmptyState, PageHeader, SlotBar, StatusBadge } from "@/components/ui";
import { androidLabel } from "@/lib/android";
import { requireOnboardedUser } from "@/server/auth";
import { getMyApps } from "@/server/queries";

export const metadata = { title: "My Apps" };

export default async function MyAppsPage() {
  const user = await requireOnboardedUser();
  const rows = await getMyApps(await getDb(), user.id);
  const submit = (
    <Link href="/apps/new" className="btn btn-dark">
      <Plus size={16} /> Submit app
    </Link>
  );
  return (
    <div>
      <PageHeader title="My Apps" subtitle="Each app gets 16 tester slots. Google needs 12 of them opted in for 14 days." action={submit} />
      {rows.length === 0 ? (
        <EmptyState icon="📱" title="No apps yet" body="Submit your app to start trading tests with other developers." action={submit} />
      ) : (
        <div className="space-y-3">
          {rows.map(({ app, slots, rating, reviews }) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="card flex flex-col gap-4 p-5 hover:bg-white/80 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:w-72">
                <AppLogo name={app.name} src={app.logoUrl} size={46} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{app.name}</p>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="truncate font-mono text-[11.5px] text-muted">{app.packageName}</p>
                </div>
              </div>
              <div className="flex-1">
                <SlotBar slots={slots} total={app.testerSlots} showLegend />
              </div>
              <div className="flex shrink-0 gap-5 text-right text-xs text-muted sm:w-36 sm:flex-col sm:gap-1">
                <span>{androidLabel(app.minAndroidApi)}+</span>
                <span className="inline-flex items-center gap-1 sm:justify-end">
                  <Star size={12} className={rating ? "fill-[#f5b301] text-[#f5b301]" : ""} />
                  {rating ? `${rating.toFixed(1)} (${reviews})` : "No feedback yet"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
