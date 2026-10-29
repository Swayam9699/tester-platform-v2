import { z } from "zod";
import { id, optionalText } from "./fields";

/** One schema for the admin panel's buttons: which ids are required depends on the action. */
export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["resolve", "dismiss"]), disputeId: id(), resolution: optionalText(500, "Resolution") }),
  z.object({
    action: z.literal("ban"),
    userId: id(),
    days: z.coerce.number<unknown>().int().positive("Ban length must be positive.").optional().default(30),
    reason: optionalText(500, "Reason"),
  }),
  z.object({ action: z.literal("unblock"), userId: id() }),
  z.object({ action: z.enum(["rejectProof", "markSkipped"]), sideId: id() }),
  z.object({ action: z.literal("clock"), days: z.coerce.number<unknown>().int() }),
  z.object({ action: z.literal("cron") }),
]);
export type AdminActionInput = z.input<typeof adminActionSchema>;
