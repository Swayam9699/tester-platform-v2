import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** One numbered step of a multi-step form, with a "Done" mark once it's complete. */
export function StepCard({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <Card className="block p-5 text-base">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          <span className="mr-2 text-muted-foreground">{n}.</span>
          {title}
        </h2>
        {done && <span className="text-xs font-medium text-ok">Done</span>}
      </div>
      {children}
    </Card>
  );
}
