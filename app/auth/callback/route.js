import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/url";

// When verification fails we still want a booking-in-progress to survive: the
// intent travels inside `next` (/?resumeBooking=...), so hand it to /login.
function failureRedirect(origin, isInvite, message, targetNext) {
  const target = isInvite ? "/auth/set-password" : "/login";
  const redirectUrl = new URL(target, origin);
  redirectUrl.searchParams.set("error", message);
  if (!isInvite) {
    try {
      const intent = new URL(targetNext, origin).searchParams.get("resumeBooking");
      if (intent) redirectUrl.searchParams.set("bookingIntent", intent);
    } catch {
      // ignore malformed next
    }
  }
  return NextResponse.redirect(redirectUrl.toString());
}

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
    return failureRedirect(origin, isInvite, errorDescription || errorParam, targetNext);
  }

  const supabase = createClient();

  // 1. PKCE flow: Exchange authorization code for session
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback code exchange error:", exchangeError.message);
      return failureRedirect(origin, isInvite, exchangeError.message, targetNext);
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
      return failureRedirect(origin, isInvite, verifyError.message, targetNext);
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