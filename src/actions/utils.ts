import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/api/auth";
import { AppError } from "@/api/core";
import { ValidationError } from "@/api/handler";

// Shared by the Server Action modules in this folder. Deliberately not "use server": every export of such a file
// becomes a publicly callable endpoint, and run() must only be reached through an action.

/** What an action hands back to its form: a toast message, plus per-field errors when validation failed. */
export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

/** A plain form field that isn't part of a schema, such as the hidden `next` redirect target. */
export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/**
 * Validates a submitted form against its zod schema (src/validation). Forms re-check on the server because a
 * Server Action is a public endpoint: the browser-side check is only for quick feedback.
 */
export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): z.output<S> {
  const result = schema.safeParse(Object.fromEntries(fd));
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

/** Runs a mutation for the signed-in user and turns validation errors and rule violations into form feedback. */
export async function run(
  fn: (userId: string) => Promise<unknown>,
  success?: string,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await fn(user.id);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, message: err.message, fieldErrors: err.fieldErrors };
    if (err instanceof AppError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: success };
}
