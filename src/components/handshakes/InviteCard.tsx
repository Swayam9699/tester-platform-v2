"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { InviteLink } from "@/components/handshakes/InviteLink";

export function InviteCard({ appId, appName, url, open }: { appId: string; appName: string; url: string; open: boolean }) {
  return (
    <Card className="block p-5 text-base">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-peach/20 text-coral">
          <Heart size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Invite friends to test</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Friends test {appName} without you testing anything back. Each one fills a tester slot, and they don&apos;t need an app of their own.{" "}
            <Link href="/friends" className="font-medium text-ink-2 underline-offset-4 hover:underline">
              All friend testing →
            </Link>
          </p>
        </div>
      </div>
      <InviteLink appId={appId} appName={appName} url={url} open={open} className="mt-4" />
    </Card>
  );
}
