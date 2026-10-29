import { AppLogo } from "@/components/common";

export function AppSide({ label, name, logo, owner }: { label: string; name: string; logo: string | null; owner: string }) {
  return (
    <div className="flex items-center gap-3">
      <AppLogo name={name} src={logo} size={48} />
      <div>
        <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">by {owner}</p>
      </div>
    </div>
  );
}
