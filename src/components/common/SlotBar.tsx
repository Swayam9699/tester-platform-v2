import type { SlotBreakdown } from "@/api/queries";
import { cn } from "@/lib/utils";
import { SlotLegend } from "@/components/common/SlotLegend";

/** 16 segments: completed, active, joined/pending, free. */
export function SlotBar({ slots, total = 16, showLegend = false }: { slots: SlotBreakdown; total?: number; showLegend?: boolean }) {
  const segs = [
    ...Array(slots.completed).fill("bg-ok"),
    ...Array(slots.active).fill("bg-ink"),
    ...Array(slots.pending).fill("bg-peach"),
  ].slice(0, total);
  while (segs.length < total) segs.push("bg-black/[0.07]");
  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label={`${slots.used} of ${total} tester slots used`}>
        {segs.map((c, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full", c)} />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <SlotLegend className="bg-ok" label={`${slots.completed} completed`} />
          <SlotLegend className="bg-ink" label={`${slots.active} active`} />
          <SlotLegend className="bg-peach" label={`${slots.pending} joining`} />
          <SlotLegend className="bg-black/10" label={`${Math.max(0, total - slots.used)} free`} />
        </div>
      )}
    </div>
  );
}
