"use client";

import { Check, Copy, Heart, RefreshCw, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { resetInviteAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "./ActionForm";

export function InviteCard({ appId, appName, url, open }: { appId: string; appName: string; url: string; open: boolean }) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-peach/20 text-coral">
          <Heart size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Invite friends to test</h2>
          <p className="mt-0.5 text-sm text-muted">
            Friends test {appName} without you testing anything back. Each one fills a tester slot, and they don&apos;t need an app of their own.{" "}
            <Link href="/friends" className="font-medium text-ink-2 underline-offset-4 hover:underline">
              All friend testing →
            </Link>
          </p>
        </div>
      </div>
      <InviteLink appId={appId} appName={appName} url={url} open={open} className="mt-4" />
    </section>
  );
}

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
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field h-10 min-w-0 flex-1 font-mono text-xs" aria-label={`Invite link for ${appName}`} />
        <button type="button" onClick={copy} className="btn btn-dark btn-sm h-10">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn btn-soft btn-sm h-10" aria-label="Share link">
            <Share2 size={14} />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{open ? "Anyone with the link can join while slots are free." : "All slots are taken. The link works again when one frees up."}</span>
        <ActionForm action={resetInviteAction} className="flex items-center gap-2" messageClassName="">
          <input type="hidden" name="appId" value={appId} />
          <SubmitButton className="inline-flex items-center gap-1 hover:text-ink" pendingText="Resetting…" title="Create a new link; the old one stops working">
            <RefreshCw size={12} /> New link
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
