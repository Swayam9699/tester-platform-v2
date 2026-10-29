import { ArrowLeftRight } from "lucide-react";
import { AppSlot } from "@/components/requests/AppSlot";

export function Swap({
  you,
  them,
  youLabel,
  themLabel,
  compact,
}: {
  you: { name: string; logoUrl: string | null };
  them: { name: string; logoUrl: string | null };
  youLabel: string;
  themLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-3" : "mt-4 flex items-center gap-3 rounded-2xl bg-canvas p-3"}>
      <AppSlot label={themLabel} app={them} />
      <ArrowLeftRight size={16} className="shrink-0 text-muted-foreground" />
      <AppSlot label={youLabel} app={you} />
    </div>
  );
}
