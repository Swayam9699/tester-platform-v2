import Link from "next/link";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

/** notFound() from an app page (an app, handshake or admin page you can't see) keeps the sidebar around it. */
export default function AppNotFound() {
  return (
    <EmptyState
      icon="🔍"
      title="Not found"
      body="It may have been removed, or it isn't yours to see."
      action={
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      }
    />
  );
}
