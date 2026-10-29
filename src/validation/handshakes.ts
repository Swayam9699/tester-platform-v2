import { z } from "zod";
import { id, optionalScreenshot, optionalText, screenshot } from "./fields";

export const requestHandshakeSchema = z.object({
  targetAppId: id(),
  offeredAppId: id("Pick one of your apps to offer."),
  message: optionalText(300, "Message"),
});
export type RequestHandshakeInput = z.input<typeof requestHandshakeSchema>;

export const respondSchema = z.object({ handshakeId: id(), action: z.enum(["accept", "reject", "cancel"]) });

export const optinProofSchema = z.object({ sideId: id(), proof: screenshot() });
export type OptinProofInput = z.input<typeof optinProofSchema>;

export const checkInSchema = z.object({ sideId: id(), note: optionalText(200, "Note"), proof: optionalScreenshot() });
export type CheckInInput = z.input<typeof checkInSchema>;

export const feedbackSchema = z.object({
  sideId: id(),
  rating: z.coerce.number<unknown>({ error: "Pick a rating." }).int().min(1, "Pick a rating.").max(5, "Rating must be 1–5."),
  bugs: optionalText(1000, "Bugs"),
  comments: optionalText(1000, "Comments"),
});
export type FeedbackInput = z.input<typeof feedbackSchema>;

export const reportSchema = z.object({
  handshakeId: id(),
  reason: z.string().trim().min(10, "Please describe the problem (at least 10 characters).").max(1000),
});
export type ReportInput = z.input<typeof reportSchema>;

export const inviteCodeSchema = z.object({ code: id("This invite link is no longer valid.") });
export const handshakeIdSchema = z.object({ handshakeId: id() });
export const appIdSchema = z.object({ appId: id() });
