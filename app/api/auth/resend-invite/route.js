import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail, isValidEmail, normalizeUserRole } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/auth/url";

/**
 * POST /api/auth/resend-invite
 * Resends a fresh invitation or password reset link for invited Turf Owners whose links expired.
 * Security: Strictly prevents converting ordinary player accounts into owners.
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
    // 1. Inspect profiles table
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", email)
      .maybeSingle();

    // Security: Do NOT automatically convert player accounts into owner accounts
    if (profile && normalizeUserRole(profile.role) !== "owner") {
      return NextResponse.json({
        success: true,
        message: "If this email belongs to an invited Turf Owner, a new invitation has been sent.",
      });
    }

    // 2. Query Auth user state reliably using profile.id if available
    let authUser = null;
    if (profile?.id) {
      try {
        const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.id);
        if (!userErr && userData?.user) {
          authUser = userData.user;
        }
      } catch (userLookupErr) {
        console.warn("Could not query auth user by profile id for resend invite:", userLookupErr);
      }
    }

    // Fallback: If no profile ID or user wasn't found by ID, inspect user list
    if (!authUser) {
      try {
        const { data: listData } = await admin.auth.admin.listUsers();
        if (listData?.users) {
          authUser = listData.users.find((u) => normalizeEmail(u.email) === email) || null;
        }
      } catch (listErr) {
        console.warn("Could not query auth user list for resend invite fallback:", listErr);
      }
    }

    const isOwnerInAuth =
      authUser?.app_metadata?.role === "owner" ||
      profile?.role === "owner";

    if (!isOwnerInAuth) {
      return NextResponse.json({
        success: true,
        message: "If this email belongs to an invited Turf Owner, a new invitation has been sent.",
      });
    }

    const isConfirmed = Boolean(authUser?.confirmed_at);

    if (isConfirmed) {
      // Owner has already confirmed account, send recovery link so they can reset/set password
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
    } else {
      // Pending invite: send fresh invite link
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          role: "owner",
          full_name: profile?.full_name || authUser?.user_metadata?.full_name || email.split("@")[0],
        },
        redirectTo,
      });
    }
  } catch (err) {
    console.error("Resend invite error:", err);
  }

  return NextResponse.json({
    success: true,
    message: "If this email belongs to an invited Turf Owner, a new invitation has been sent.",
  });
}
