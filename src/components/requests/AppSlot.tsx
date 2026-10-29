import { AppLogo } from "@/components/common";

export function AppSlot({ label, app }: { label: string; app: { name: string; logoUrl: string | null } }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <AppLogo name={app.name} src={app.logoUrl} size={32} />
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{app.name}</p>
      </div>
    </div>
  );
}
