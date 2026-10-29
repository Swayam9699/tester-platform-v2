import { cn } from "@/lib/utils";

export function DetailRow({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", bad && "text-bad")}>{value}</dd>
    </div>
  );
}
