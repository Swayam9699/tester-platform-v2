import { z } from "zod";
import { isValidApi } from "@/lib/android";

// Field builders shared by the schemas in this folder. Each accepts both the typed value react-hook-form holds and the
// string a FormData entry carries, so one schema validates the form in the browser and the action on the server.

export const email = (message = "Enter a valid email.") => z.string().trim().toLowerCase().pipe(z.email(message));

/** A ticked checkbox: `true` from react-hook-form, "on" (or "true") from a submitted form. */
export const checkbox = () => z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

/** Same, but it has to be ticked. */
export const requiredCheckbox = (message: string) => checkbox().refine(Boolean, message);

export const androidApi = (message = "Choose an Android version.") =>
  z.coerce.number<unknown>({ error: message }).int().refine(isValidApi, message);

export const id = (message = "Missing id.") => z.string().trim().min(1, message);

export const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters.`).optional().default("");

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // matches src/api/storage.ts (under Vercel's 4.5 MB request limit)

/** A screenshot from a file input: a File (FormData) or the first file of a FileList (react-hook-form). */
const imageFile = z.preprocess(
  (v) => (typeof FileList !== "undefined" && v instanceof FileList ? (v[0] ?? undefined) : v),
  z
    .instanceof(File)
    .refine((f) => f.size === 0 || IMAGE_TYPES.includes(f.type), "Screenshots must be PNG, JPG or WebP.")
    .refine((f) => f.size <= MAX_IMAGE_BYTES, "Screenshots must be under 4 MB.")
    .optional(),
);

export const screenshot = () => imageFile.refine((f) => f && f.size > 0, "Attach a screenshot.");
export const optionalScreenshot = () => imageFile;
