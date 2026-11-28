import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function middleware(request) {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touching getUser() is what actually refreshes the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Early route protection for /admin and /owner page paths (Defense-in-depth).
  // Unauthenticated visitors are bounced to /login with the return destination preserved.
  const isProtectedPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/owner" ||
    pathname.startsWith("/owner/");

  if (isProtectedPage && !user) {
    const loginUrl = new URL("/login", request.url);
    const returnTarget = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set("next", returnTarget);

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Propagate refreshed cookies to redirect response if any were set
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
