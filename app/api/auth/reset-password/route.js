import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail, isValidEmail } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/auth/url";

/**
 * POST /api/auth/reset-password
 * Sends a password reset/recovery link to the user's email.
 * Routes to /auth/callback?next=/auth/setup-password so owners/players can set a new password.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const siteUrl = getSiteUrl(request);
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/setup-password`;

  try {
    const { error: resetErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (resetErr) {
      console.warn("Password reset link generation notice:", resetErr.message);
    }
  } catch (err) {
    console.error("Error generating reset password link:", err);
  }

  // Consistent message to prevent email enumeration attacks
  return NextResponse.json({
    success: true,
    message: "If an account exists for this email, we have sent password reset instructions.",
  });
}
