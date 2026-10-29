import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { NEXT_COOKIE, safeNext } from "@/api/auth";

/** Google OAuth lands here; exchange the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${safeNext(request.cookies.get(NEXT_COOKIE)?.value)}`);
      response.cookies.delete(NEXT_COOKIE);
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
