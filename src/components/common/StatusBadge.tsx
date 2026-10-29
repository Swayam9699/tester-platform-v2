import { Badge } from "@/components/ui/badge";

type Variant = "neutral" | "success" | "warning" | "destructive" | "info" | "default";

const STATUS_VARIANT: Record<string, Variant> = {
  draft: "neutral",
  in_review: "info",
  open: "success",
  full: "default",
  completed: "info",
  archived: "neutral",
  requested: "warning",
  accepted: "info",
  rejected: "neutral",
  active: "success",
  broken: "destructive",
  cancelled: "neutral",
  pending: "warning",
  joined: "info",
  skipped: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}
