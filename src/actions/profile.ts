"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/api/auth";
import { completeOnboarding, markNotificationsRead, updateProfile } from "@/api/users";
import { getDb } from "@/db";
import { onboardingSchema, profileSchema } from "@/validation/profile";
import { parseForm, run, str, type ActionState } from "./utils";

export async function onboardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const result = await run((uid) => completeOnboarding(db, uid, parseForm(onboardingSchema, fd)));
  if (result?.ok) redirect(safeNext(str(fd, "next")));
  return result;
}

export async function profileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => updateProfile(db, uid, parseForm(profileSchema, fd)), "Profile saved.");
}

export async function readNotificationsAction(): Promise<ActionState> {
  const db = await getDb();
  return run((uid) => markNotificationsRead(db, uid), "All caught up.");
}
