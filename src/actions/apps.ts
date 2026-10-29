"use server";

import { redirect } from "next/navigation";
import { deleteDraft, saveApp, setAppLifecycle } from "@/api/apps";
import { getDb } from "@/db";
import { appLifecycleSchema, appSchema } from "@/validation/apps";
import { parseForm, run, type ActionState } from "./utils";

export async function saveAppAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  let target = "";
  const result = await run(async (uid) => {
    const { appId, intent, ...input } = parseForm(appSchema, fd);
    const publish = intent === "publish";
    const savedId = await saveApp(db, uid, input, { publish, appId: appId || undefined });
    target = `/apps/${savedId}${publish && !appId ? "?published=1" : ""}`;
  });
  if (result?.ok) redirect(target);
  return result;
}

export async function appLifecycleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  let deleted = false;
  const result = await run(async (uid) => {
    const { appId, action } = parseForm(appLifecycleSchema, fd);
    if (action === "delete") {
      await deleteDraft(db, uid, appId);
      deleted = true;
    } else {
      await setAppLifecycle(db, uid, appId, action);
    }
  }, "Updated.");
  if (result?.ok && deleted) redirect("/apps");
  return result;
}
