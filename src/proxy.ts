import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, demoMode, supabaseEnabled, supabaseKey } from "@/lib/config";

/** Reachable signed out. Every other page and /api route needs a session (/api/cron has its own secret). */
const PUBLIC_PATHS = new Set(["/", "/login", "/auth/callback"]);
const PUBLIC_PREFIXES = ["/invite/"];

const isPublic = (pathname: string) => PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

/**
 * Keeps the Supabase session fresh and turns away signed-out requests: pages redirect to /login?next=…, API routes
 * get a 401. This is an optimistic check on the cookie alone; pages, actions and routes still load the user from the
 * database (requireUser / requireApiUser) before touching any data.
 */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await refreshSession(request);
  const { pathname, search } = request.nextUrl;
  // Server Actions post to the page they were rendered on and check the user themselves; sign-in must work signed out.
  if (signedIn || isPublic(pathname) || request.headers.has("next-action")) return response;

  if (pathname.startsWith("/api/")) return withCookies(NextResponse.json({ error: "Please sign in." }, { status: 401 }), response);
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return withCookies(NextResponse.redirect(login), response);
}

async function refreshSession(request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });
  if (!supabaseEnabled) {
    // Same format check as getSessionUser; the demo cookie only means something against the local demo database.
    const id = request.cookies.get(DEMO_COOKIE)?.value;
    return { response, signedIn: demoMode && !!id && /^[0-9a-f-]{36}$/.test(id) };
  }

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refreshes the session cookie when it's about to expire. getClaims verifies the token locally against the
  // project's public signing key (fetched once and cached), so this usually makes no network call.
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.email) };
}

/** A redirect or 401 still has to carry any refreshed (or cleared) session cookies. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
