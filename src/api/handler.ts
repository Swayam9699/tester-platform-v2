import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getSessionUser } from "./auth";
import { AppError } from "./core";

/** Throw from a route handler to answer with this status and `{ error: message }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Input that failed its zod schema: a 422 whose `fieldErrors` map each field to its messages. */
export class ValidationError extends HttpError {
  constructor(
    readonly fieldErrors: Record<string, string[] | undefined>,
    message = firstMessage(fieldErrors) ?? "Invalid request.",
  ) {
    super(422, message, { fieldErrors });
    this.name = "ValidationError";
  }

  static fromZod(error: ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(error);
    return new ValidationError(fieldErrors as Record<string, string[] | undefined>, formErrors[0]);
  }
}

const firstMessage = (fieldErrors: Record<string, string[] | undefined>) => Object.values(fieldErrors).find((m) => m?.length)?.[0];

/**
 * Wraps a route handler so whatever it throws becomes a JSON error in the `{ error }` shape src/lib/axios.ts reads:
 * HttpError (and ValidationError) keep their status, AppError (a broken business rule) is a 400, and anything else a
 * logged 500 whose details stay on the server. notFound() and redirect() keep their usual Next.js behaviour.
 */
export function apiHandler<Ctx>(handler: (request: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      unstable_rethrow(err);
      return errorResponse(err, request);
    }
  };
}

function errorResponse(err: unknown, request: NextRequest) {
  if (err instanceof ZodError) err = ValidationError.fromZod(err);
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, ...(err.details !== undefined && (err.details as object)) }, { status: err.status });
  }
  if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: 400 });
  console.error(`${request.method} ${request.nextUrl.pathname} failed:`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

type Schemas = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };
type Parsed<S extends Schemas> = { [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never };
type RouteCtx = { params: Promise<Record<string, string | string[] | undefined>> };

/**
 * Validation middleware for route handlers: parses the JSON body, the query string and the route params with the
 * given zod schemas (see src/validation) before the handler runs, and throws a ValidationError (422) if any fails.
 *
 *   export const POST = apiHandler(withValidation({ body: reportSchema }, async (request, { body }) => { … }));
 */
export function withValidation<S extends Schemas, Ctx extends RouteCtx = RouteCtx>(
  schemas: S,
  handler: (request: NextRequest, input: Parsed<S>, ctx: Ctx) => Promise<Response>,
) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    const input: Record<string, unknown> = {};
    if (schemas.params) input.params = parse(schemas.params, await ctx.params);
    if (schemas.query) input.query = parse(schemas.query, Object.fromEntries(request.nextUrl.searchParams));
    if (schemas.body) input.body = parse(schemas.body, await readJson(request));
    return handler(request, input as Parsed<S>, ctx);
  };
}

function parse(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "The request body must be JSON.");
  }
}

/** The signed-in user, or a 401. Route handlers' counterpart to requireUser, which redirects instead. */
export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}
