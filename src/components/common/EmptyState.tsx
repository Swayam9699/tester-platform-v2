import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <Empty className="px-6 py-12">
        <EmptyHeader>
          {icon && <EmptyMedia className="mb-1 text-3xl">{icon}</EmptyMedia>}
          <EmptyTitle className="text-base text-ink">{title}</EmptyTitle>
          {body && <EmptyDescription>{body}</EmptyDescription>}
        </EmptyHeader>
        {action && <EmptyContent className="mt-1">{action}</EmptyContent>}
      </Empty>
    </Card>
  );
}
