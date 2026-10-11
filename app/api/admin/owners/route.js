import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole, normalizeEmail, isValidEmail } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/auth/url";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (normalizeUserRole(profile.role) !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = normalizeEmail(body.email);
  if (!fullName || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a name and a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const siteUrl = getSiteUrl(request);
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: "owner" },
    redirectTo,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Could not send the invitation." }, { status: 400 });
  }

  // Set tamper-proof app_metadata on the auth user record
  try {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "owner" },
      user_metadata: { full_name: fullName, role: "owner" },
    });
  } catch (metaErr) {
    console.warn("Could not set app_metadata on invited user:", metaErr);
  }

  // Idempotently create or update the profile with owner role
  const { error: roleError } = await admin
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        role: "owner",
      },
      { onConflict: "id" }
    );

  if (roleError) {
    console.error("The account could not be assigned the owner role:", roleError);
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "The account could not be assigned the owner role." }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invitation sent successfully." });
}