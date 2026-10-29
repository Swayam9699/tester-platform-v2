"use client";

import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { resetInviteAction } from "@/actions/handshakes";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The copyable invite link, a share button where the browser supports it, and "New link" to revoke the old one. */
export function InviteLink({ appId, appName, url, open, className }: { appId: string; appName: string; url: string; open: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false); // only known in the browser; set after hydration
  useEffect(() => setCanShare("share" in navigator), []);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = () => navigator.share({ title: `Test ${appName}`, text: `Help me test ${appName} on Google Play`, url }).catch(() => {});

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-10 w-auto min-w-0 flex-1 font-mono text-xs" aria-label={`Invite link for ${appName}`} />
        <Button type="button" onClick={copy} size="sm" className="h-10">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
        </Button>
        {canShare && (
          <Button type="button" onClick={share} variant="outline" size="sm" className="h-10" aria-label="Share link">
            <Share2 size={14} />
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{open ? "Anyone with the link can join while slots are free." : "All slots are taken. The link works again when one frees up."}</span>
        <ActionForm action={resetInviteAction} className="flex items-center gap-2">
          <Input type="hidden" name="appId" value={appId} />
          <SubmitButton variant="ghost" size="xs" className="-mr-2 text-muted-foreground hover:text-ink" pendingText="Resetting…" title="Create a new link; the old one stops working">
            <RefreshCw size={12} /> New link
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
