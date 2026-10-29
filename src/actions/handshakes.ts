"use server";

import { redirect } from "next/navigation";
import * as hs from "@/api/handshakes";
import { saveScreenshot } from "@/api/storage";
import { getDb } from "@/db";
import {
  appIdSchema,
  checkInSchema,
  feedbackSchema,
  handshakeIdSchema,
  inviteCodeSchema,
  optinProofSchema,
  reportSchema,
  requestHandshakeSchema,
  respondSchema,
} from "@/validation/handshakes";
import { parseForm, run, type ActionState } from "./utils";

export async function requestHandshakeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const result = await run((uid) => hs.requestHandshake(db, uid, parseForm(requestHandshakeSchema, fd)));
  if (result?.ok) redirect("/requests?sent=1");
  return result;
}

const RESPONSE_MESSAGES = { accept: undefined, reject: "Request declined.", cancel: "Request withdrawn." } as const;

export async function respondAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  let accepted = "";
  let message: string | undefined;
  const result = await run(async (uid) => {
    const { handshakeId, action } = parseForm(respondSchema, fd);
    message = RESPONSE_MESSAGES[action];
    if (action === "accept") {
      await hs.acceptHandshake(db, uid, handshakeId);
      accepted = handshakeId;
    } else if (action === "reject") {
      await hs.rejectHandshake(db, uid, handshakeId);
    } else {
      await hs.cancelHandshake(db, uid, handshakeId);
    }
  });
  if (result?.ok && accepted) redirect(`/handshakes/${accepted}`);
  return result?.ok ? { ...result, message } : result;
}

export async function optinProofAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const { sideId, proof } = parseForm(optinProofSchema, fd);
    const url = await saveScreenshot(proof ?? null, "optin");
    await hs.submitOptinProof(db, uid, sideId, url);
  }, "Proof uploaded. Your 16 days start as soon as your partner opts in too.");
}

export async function checkInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const { sideId, note, proof } = parseForm(checkInSchema, fd);
    const proofUrl = proof && proof.size > 0 ? await saveScreenshot(proof, "checkins") : undefined;
    await hs.checkIn(db, uid, sideId, { note, proofUrl });
  }, "Checked in for today ✓");
}

export async function feedbackAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const { sideId, ...feedback } = parseForm(feedbackSchema, fd);
    await hs.submitFeedback(db, uid, sideId, feedback);
  }, "Thanks! Feedback sent to the developer.");
}

export async function reportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run(async (uid) => {
    const { handshakeId, reason } = parseForm(reportSchema, fd);
    await hs.reportIssue(db, uid, handshakeId, reason);
  }, "Report sent to the admins.");
}

// ---------- friend tests ----------

export async function joinFriendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  let handshakeId = "";
  const result = await run(async (uid) => {
    handshakeId = (await hs.joinAsFriend(db, uid, parseForm(inviteCodeSchema, fd).code)).id;
  });
  if (result?.ok) redirect(`/handshakes/${handshakeId}`);
  return result;
}

export async function leaveFriendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => hs.leaveFriendTest(db, uid, parseForm(handshakeIdSchema, fd).handshakeId), "Friend test ended.");
}

export async function resetInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => hs.resetInviteCode(db, uid, parseForm(appIdSchema, fd).appId), "New link created. The old one no longer works.");
}
