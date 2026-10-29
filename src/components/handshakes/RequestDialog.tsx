"use client";

import Link from "next/link";
import { useState } from "react";
import { RequestHandshakeForm } from "@/components/handshakes/RequestHandshakeForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  targetAppId: string;
  targetName: string;
  ownerName: string;
  offerable: { id: string; name: string }[];
  hasOpenApps: boolean;
  disabledReason?: string;
};

export function RequestDialog({ targetAppId, targetName, ownerName, offerable, hasOpenApps, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const firstName = ownerName.split(" ")[0];
  if (disabledReason) {
    return (
      <Button size="sm" disabled title={disabledReason}>
        Request handshake
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Request handshake</DialogTrigger>
      <DialogContent className="block rounded-3xl bg-white p-6 shadow-2xl ring-0 sm:max-w-md">
        <DialogHeader className="gap-1 pr-6">
          <DialogTitle className="text-lg font-semibold">Test {targetName}</DialogTitle>
          <DialogDescription>
            You&apos;ll test {firstName}&apos;s app for 16 days. In return, they test one of yours.
          </DialogDescription>
        </DialogHeader>

        {offerable.length ? (
          <RequestHandshakeForm targetAppId={targetAppId} offerable={offerable} onDone={() => setOpen(false)} />
        ) : (
          <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm text-ink-2">
            {hasOpenApps ? (
              <>None of your open apps can be offered: either {firstName}&apos;s device runs an older Android version than they require, or they&apos;ve already tested them.</>
            ) : (
              <>
                You need a published app to offer in return.{" "}
                <Link href="/apps/new" className="font-medium text-ink underline">
                  Submit an app →
                </Link>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
