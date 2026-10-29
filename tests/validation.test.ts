import assert from "node:assert/strict";
import { test } from "node:test";
import { adminActionSchema } from "@/validation/admin";
import { appSchema } from "@/validation/apps";
import { emailCodeSchema } from "@/validation/auth";
import { checkInSchema, feedbackSchema, optinProofSchema } from "@/validation/handshakes";
import { onboardingSchema } from "@/validation/profile";

/** What a Server Action receives: every value a string (or a File). */
function formData(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return Object.fromEntries(fd);
}

test("schemas accept both react-hook-form values and submitted form data", () => {
  const typed = onboardingSchema.parse({ joinedGoogleGroup: true, playEmail: " Me@Example.com ", deviceAndroidApi: 34 });
  const submitted = onboardingSchema.parse(formData({ joinedGoogleGroup: "on", playEmail: "me@example.com", deviceAndroidApi: "34" }));
  assert.deepEqual(typed, { joinedGoogleGroup: true, playEmail: "me@example.com", deviceAndroidApi: 34 });
  assert.deepEqual(submitted, typed);
});

test("onboarding needs the group ticked, a Play email and a known Android version", () => {
  const r = onboardingSchema.safeParse(formData({ playEmail: "nope", deviceAndroidApi: "3" }));
  assert.equal(r.success, false);
  assert.deepEqual(r.error!.issues.map((i) => i.path[0]).sort(), ["deviceAndroidApi", "joinedGoogleGroup", "playEmail"]);
});

test("apps need a Play testing link and an https logo", () => {
  const ok = appSchema.parse(formData({ name: "Notes", testingLink: "https://play.google.com/apps/testing/com.acme.notes", minAndroidApi: "26", intent: "publish" }));
  assert.equal(ok.intent, "publish");
  assert.equal(ok.groupAddedConfirmed, false);
  const bad = appSchema.safeParse({ name: "Notes", testingLink: "https://example.com", logoUrl: "http://x.png", minAndroidApi: 26 });
  assert.deepEqual(bad.error!.issues.map((i) => i.path[0]).sort(), ["logoUrl", "testingLink"]);
});

test("screenshots: required for opt-in, optional for check-ins, images only", () => {
  const empty = new File([], "");
  assert.equal(optinProofSchema.safeParse(formData({ sideId: "s", proof: empty })).success, false);
  assert.equal(checkInSchema.safeParse(formData({ sideId: "s", proof: empty })).success, true);
  const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
  assert.equal(optinProofSchema.safeParse(formData({ sideId: "s", proof: pdf })).error?.issues[0].message, "Screenshots must be PNG, JPG or WebP.");
});

test("ratings are 1–5 and sign-in codes ignore spaces", () => {
  assert.equal(feedbackSchema.safeParse(formData({ sideId: "s", rating: "0" })).success, false);
  assert.equal(feedbackSchema.parse(formData({ sideId: "s", rating: "5" })).rating, 5);
  assert.equal(emailCodeSchema.parse({ email: "a@b.co", code: "123 456" }).code, "123456");
});

test("admin actions are checked per action", () => {
  assert.deepEqual(adminActionSchema.parse(formData({ action: "ban", userId: "u" })), { action: "ban", userId: "u", days: 30, reason: "" });
  assert.equal(adminActionSchema.safeParse(formData({ action: "unblock" })).success, false);
  assert.equal(adminActionSchema.safeParse(formData({ action: "drop-tables" })).success, false);
});
