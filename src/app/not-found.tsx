import Link from "next/link";
import { Sparkle } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4 text-center">
      <div>
        <Sparkle size={80} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be broken, or the page may have moved.</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          Back home
        </Button>
      </div>
    </div>
  );
}
