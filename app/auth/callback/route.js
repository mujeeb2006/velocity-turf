import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { sanitizeRedirectPath } from "@/lib/auth/url";

function failureRedirect(origin, isSetupOrInvite, message, targetNext) {
  const target = isSetupOrInvite ? "/auth/setup-password" : "/login";
  const redirectUrl = new URL(target, origin);
  if (message) {
    redirectUrl.searchParams.set("error", message);
  }
  if (!isSetupOrInvite && targetNext) {
    try {
      const intent = new URL(targetNext, origin).searchParams.get("resumeBooking");
      if (intent) redirectUrl.searchParams.set("bookingIntent", intent);
      const matchIntent = new URL(targetNext, origin).searchParams.get("resumeMatch");
      if (matchIntent) redirectUrl.searchParams.set("matchIntent", matchIntent);
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

  const isSetupOrInvite =
    type === "invite" ||
    type === "recovery" ||
    rawNext?.includes("/auth/setup-password") ||
    rawNext?.includes("/auth/set-password");

  const targetNext = sanitizeRedirectPath(
    rawNext,
    isSetupOrInvite ? "/auth/setup-password" : "/"
  );

  // If Supabase Auth redirected with an error (e.g. invalid or expired invite link)
  if (errorParam) {
    console.error("Auth callback received error from Supabase:", errorParam, errorDescription);
    return failureRedirect(
      origin,
      isSetupOrInvite,
      errorDescription || errorParam,
      targetNext
    );
  }

  // Determine initial destination: setup flows always route to setup-password
  const initialDestination = isSetupOrInvite ? "/auth/setup-password" : targetNext;
  const redirectResponse = NextResponse.redirect(new URL(initialDestination, origin));

  const { url, anonKey } = getSupabaseEnv();

  // Create server client that sets cookies directly on the redirect response headers
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // 1. PKCE flow: Exchange authorization code for session
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback code exchange error:", exchangeError.message);
      return failureRedirect(origin, isSetupOrInvite, exchangeError.message, targetNext);
    }

    if (data?.user) {
      const destination = isSetupOrInvite ? "/auth/setup-password" : targetNext;
      redirectResponse.headers.set("Location", new URL(destination, origin).toString());
      return redirectResponse;
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
      return failureRedirect(origin, isSetupOrInvite, verifyError.message, targetNext);
    }

    if (data?.user) {
      const destination = isSetupOrInvite ? "/auth/setup-password" : targetNext;
      redirectResponse.headers.set("Location", new URL(destination, origin).toString());
      return redirectResponse;
    }
  }

  // 3. Fallback: If neither code nor token_hash was in query parameters,
  // the client browser might be carrying an implicit hash fragment (#access_token=...).
  // Redirecting preserves the hash fragment in the browser where the browser SDK can establish the session.
  if (isSetupOrInvite) {
    return NextResponse.redirect(new URL("/auth/setup-password", origin).toString());
  }

  if (rawNext) {
    return NextResponse.redirect(new URL(targetNext, origin).toString());
  }

  // Default fallback for ambiguous callback hits
  return NextResponse.redirect(new URL("/auth/setup-password", origin).toString());
}