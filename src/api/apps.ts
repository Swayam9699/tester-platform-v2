import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { apps } from "@/db/schema";
import { isValidApi } from "@/lib/android";
import { RULES } from "@/lib/config";
import { parseTestingLink } from "@/lib/playLinks";
import { fail, getUser, refreshAppStatus } from "./core";

export type AppInput = {
  name: string;
  description?: string;
  testingLink: string;
  logoUrl?: string;
  minAndroidApi: number;
  groupAddedConfirmed: boolean;
  countriesAllConfirmed: boolean;
  releaseSentConfirmed: boolean;
};

function validate(input: AppInput) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) fail("App name must be 2–60 characters.");
  const links = parseTestingLink(input.testingLink);
  if (!links) {
    fail("That doesn't look like a Play testing link. Use play.google.com/apps/testing/<package> or …/store/apps/details?id=<package>.");
  }
  if (!isValidApi(input.minAndroidApi)) fail("Choose a minimum Android version.");
  const logoUrl = input.logoUrl?.trim() || null;
  if (logoUrl && !/^https:\/\/\S+$/i.test(logoUrl)) fail("Logo URL must start with https://");
  return { name, description: input.description?.trim() || null, logoUrl, minAndroidApi: input.minAndroidApi, ...links };
}

/** Publishing is blocked until every onboarding checklist step is done. */
function assertChecklist(input: AppInput, joinedGroup: boolean) {
  if (!joinedGroup) fail("Step 1: join the Google Group first.");
  if (!input.groupAddedConfirmed || !input.countriesAllConfirmed || !input.releaseSentConfirmed) {
    fail("Step 2: confirm all three Play Console steps.");
  }
}

async function assertPackageFree(db: Db, packageName: string, exceptAppId?: string) {
  const [existing] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(and(eq(apps.packageName, packageName), exceptAppId ? ne(apps.id, exceptAppId) : undefined));
  if (existing) fail(`${packageName} is already listed on the platform.`);
}

export async function saveApp(db: Db, userId: string, input: AppInput, opts: { publish: boolean; appId?: string }) {
  const user = await getUser(db, userId);
  const data = validate(input);
  if (opts.publish) assertChecklist(input, user.joinedGoogleGroup);
  await assertPackageFree(db, data.packageName, opts.appId);

  const values = {
    ...data,
    groupAddedConfirmed: input.groupAddedConfirmed,
    countriesAllConfirmed: input.countriesAllConfirmed,
    releaseSentConfirmed: input.releaseSentConfirmed,
  };

  if (opts.appId) {
    const [app] = await db.select().from(apps).where(eq(apps.id, opts.appId));
    if (!app || app.ownerId !== userId) fail("App not found.");
    // The package is the identity testers opted in to; don't let it change once testing started.
    if (app.status !== "draft" && app.packageName !== data.packageName) fail("You can't change the package of a published app.");
    await db
      .update(apps)
      .set({ ...values, status: app.status === "draft" && opts.publish ? "open" : app.status })
      .where(eq(apps.id, app.id));
    await refreshAppStatus(db, app.id);
    return app.id;
  }

  const [app] = await db
    .insert(apps)
    .values({
      ...values,
      ownerId: userId,
      testerSlots: RULES.testerSlots,
      durationDays: RULES.durationDays,
      status: opts.publish ? "open" : "draft",
    })
    .returning();
  return app.id;
}

export async function setAppLifecycle(db: Db, userId: string, appId: string, action: "archive" | "complete" | "reopen") {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId));
  if (!app || app.ownerId !== userId) fail("App not found.");
  const status = action === "archive" ? "archived" : action === "complete" ? "completed" : "open";
  if (action === "reopen" && app.status !== "completed" && app.status !== "archived") fail("App is already live.");
  await db.update(apps).set({ status }).where(eq(apps.id, app.id));
  await refreshAppStatus(db, app.id);
}

export async function deleteDraft(db: Db, userId: string, appId: string) {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId));
  if (!app || app.ownerId !== userId) fail("App not found.");
  if (app.status !== "draft") fail("Only drafts can be deleted. Archive published apps instead.");
  await db.delete(apps).where(eq(apps.id, app.id));
}

