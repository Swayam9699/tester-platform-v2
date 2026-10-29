"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef } from "react";
import { requestHandshakeAction } from "@/app/actions";
import { SubmitButton } from "./ActionForm";

type Props = {
  targetAppId: string;
  targetName: string;
  ownerName: string;
  offerable: { id: string; name: string }[];
  hasOpenApps: boolean;
  disabledReason?: string;
};

export function RequestDialog({ targetAppId, targetName, ownerName, offerable, hasOpenApps, disabledReason }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(requestHandshakeAction, null);
  if (disabledReason) {
    return (
      <button className="btn btn-dark btn-sm" disabled title={disabledReason}>
        Request handshake
      </button>
    );
  }

  return (
    <>
      <button className="btn btn-dark btn-sm" onClick={() => ref.current?.showModal()}>
        Request handshake
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-sm"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Test {targetName}</h3>
              <p className="mt-1 text-sm text-muted">
                You&apos;ll test {ownerName.split(" ")[0]}&apos;s app for 16 days. In return, they test one of yours.
              </p>
            </div>
            <button onClick={() => ref.current?.close()} className="rounded-full p-1 text-muted hover:bg-black/5" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {offerable.length ? (
            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="targetAppId" value={targetAppId} />
              <div>
                <label className="label" htmlFor={`offer-${targetAppId}`}>
                  App you offer in return
                </label>
                <select id={`offer-${targetAppId}`} name="offeredAppId" className="field" required defaultValue={offerable[0].id}>
                  {offerable.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`msg-${targetAppId}`}>
                  Message <span className="font-normal text-faint">(optional)</span>
                </label>
                <textarea id={`msg-${targetAppId}`} name="message" rows={3} maxLength={300} className="field" placeholder="Hi! Happy to test daily and leave detailed feedback." />
              </div>
              {state && !state.ok && <p className="text-sm text-bad">{state.message}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
                  Cancel
                </button>
                <SubmitButton pendingText="Sending…">Send request</SubmitButton>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm text-ink-2">
              {hasOpenApps ? (
                <>None of your open apps can be offered: either {ownerName.split(" ")[0]}&apos;s device runs an older Android version than they require, or they&apos;ve already tested them.</>
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
        </div>
      </dialog>
    </>
  );
}
