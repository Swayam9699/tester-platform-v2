import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTestingLink } from "@/lib/playLinks";

test("parses the 'Join on web' link", () => {
  const r = parseTestingLink("https://play.google.com/apps/testing/com.acme.notes");
  assert.equal(r?.packageName, "com.acme.notes");
  assert.equal(r?.joinAndroidLink, "https://play.google.com/store/apps/details?id=com.acme.notes");
});

test("parses the Android link, with extra query params", () => {
  const r = parseTestingLink("play.google.com/store/apps/details?id=io.x.app_2&hl=en");
  assert.equal(r?.packageName, "io.x.app_2");
  assert.equal(r?.joinWebLink, "https://play.google.com/apps/testing/io.x.app_2");
});

test("rejects other links", () => {
  assert.equal(parseTestingLink("https://example.com/apps/testing/com.acme.notes"), null);
  assert.equal(parseTestingLink("https://play.google.com/apps/testing/notapackage"), null);
});
