import { z } from "zod";
import { parseTestingLink } from "@/lib/playLinks";
import { androidApi, checkbox, id, optionalText } from "./fields";

export const appSchema = z.object({
  appId: z.string().optional().default(""),
  name: z.string().trim().min(2, "App name must be 2–60 characters.").max(60, "App name must be 2–60 characters."),
  testingLink: z
    .string()
    .trim()
    .refine((v) => parseTestingLink(v) !== null, "That doesn't look like a Play testing link. Use play.google.com/apps/testing/<package> or …/store/apps/details?id=<package>."),
  logoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Logo URL must start with https://")
    .optional()
    .default(""),
  description: optionalText(200, "Description"),
  minAndroidApi: androidApi("Choose a minimum Android version."),
  groupAddedConfirmed: checkbox(),
  countriesAllConfirmed: checkbox(),
  releaseSentConfirmed: checkbox(),
  /** "publish" lists the app; anything else saves a draft. The three confirmations are enforced on publish. */
  intent: z.enum(["draft", "publish"]).default("draft"),
});
export type AppInput = z.input<typeof appSchema>;

export const appLifecycleSchema = z.object({
  appId: id(),
  action: z.enum(["archive", "complete", "reopen", "delete"]),
});
