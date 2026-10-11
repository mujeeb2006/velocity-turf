import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/url";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const isInvite = type === "invite" || rawNext?.startsWith("/auth/set-password");
  const targetNext = sanitizeRedirectPath(
    rawNext,
    isInvite ? "/auth/set-password" : "/"
  );

  // If Supabase redirected with an error (e.g. invalid or expired invite link)
  if (errorParam) {
    console.error("Auth callback received error from Supabase:", errorParam, errorDescription);
    const target = isInvite ? "/auth/set-password" : "/login";
    const redirectUrl = new URL(target, origin);
    redirectUrl.searchParams.set("error", errorDescription || errorParam);
    return NextResponse.redirect(redirectUrl.toString());
  }

  const supabase = createClient();

  // 1. PKCE flow: Exchange authorization code for session
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback code exchange error:", exchangeError.message);
      const target = isInvite ? "/auth/set-password" : "/login";
      const redirectUrl = new URL(target, origin);
      redirectUrl.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(redirectUrl.toString());
    }

    if (data?.user) {
      return NextResponse.redirect(new URL(targetNext, origin).toString());
    }
  }

  // 2. Token hash / OTP verification flow (e.g. type=invite or type=recovery)
  if (tokenHash && type) {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      console.error("Auth callback verifyOtp error:", verifyError.message);
      const target = isInvite ? "/auth/set-password" : "/login";
      const redirectUrl = new URL(target, origin);
      redirectUrl.searchParams.set("error", verifyError.message);
      return NextResponse.redirect(redirectUrl.toString());
    }

    if (data?.user) {
      return NextResponse.redirect(new URL(targetNext, origin).toString());
    }
  }

  // 3. Fallback: If neither code nor token_hash was in query parameters,
  // the client browser might be carrying an implicit hash fragment (#access_token=...).
  // Redirecting to /auth/set-password preserves the hash fragment in the browser
  // where the browser client SDK will detect it and establish the session.
  if (isInvite || rawNext) {
    return NextResponse.redirect(new URL(targetNext, origin).toString());
  }

  // Otherwise, fallback to /auth/set-password so user isn't stuck on generic login with no context
  return NextResponse.redirect(new URL("/auth/set-password", origin).toString());
}