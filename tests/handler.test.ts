import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/api/core";
import { apiHandler, HttpError, withValidation } from "@/api/handler";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const request = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`http://localhost${url}`, init);

test("thrown errors become JSON with the right status", async () => {
  const cases: [unknown, number, string][] = [
    [new HttpError(404, "Not found"), 404, "Not found"],
    [new AppError("You can't test your own app."), 400, "You can't test your own app."],
    [new Error("db exploded"), 500, "Something went wrong. Please try again."],
  ];
  const originalError = console.error;
  console.error = () => {}; // the 500 case logs on purpose
  try {
    for (const [err, status, message] of cases) {
      const res = await apiHandler(async () => {
        throw err;
      })(request("/api/x"), ctx());
      assert.equal(res.status, status);
      assert.deepEqual(await res.json(), { error: message });
    }
  } finally {
    console.error = originalError;
  }
});

test("withValidation parses params, query and body, and answers 422 with field errors", async () => {
  const route = apiHandler(
    withValidation(
      { params: z.object({ id: z.string().uuid("Bad id.") }), query: z.object({ page: z.coerce.number().int().min(1).default(1) }), body: z.object({ reason: z.string().min(10, "Too short.") }) },
      async (_req, { params, query, body }) => Response.json({ id: params.id, page: query.page, reason: body.reason }),
    ),
  );
  const id = "0b9c7a52-55a3-4bb5-9c0f-1b5a0a3f4b11";
  const post = (body: string) => request("/api/x?page=2", { method: "POST", body, headers: { "content-type": "application/json" } });

  const ok = await route(post(JSON.stringify({ reason: "long enough reason" })), ctx({ id }));
  assert.deepEqual(await ok.json(), { id, page: 2, reason: "long enough reason" });

  const invalid = await route(post(JSON.stringify({ reason: "short" })), ctx({ id }));
  assert.equal(invalid.status, 422);
  assert.deepEqual(await invalid.json(), { error: "Too short.", fieldErrors: { reason: ["Too short."] } });

  const badParams = await route(post("{}"), ctx({ id: "nope" }));
  assert.equal(badParams.status, 422);

  const notJson = await route(post("not json"), ctx({ id }));
  assert.equal(notJson.status, 400);
});
