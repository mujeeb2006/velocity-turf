import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStrongPassword } from "@/lib/auth/validation";

/**
 * POST /api/auth/setup-password
 * Authoritative server-side password establishment for invited owners and staff.
 * Uses admin client to guarantee the password is saved, email is marked confirmed,
 * and the owner role in profiles is permanently verified.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { password } = body || {};
  if (!password || !isStrongPassword(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 }
    );
  }

  // 1. Identify caller from server session
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "No active invitation session found. Please open the link directly from your invitation email.",
      },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // 2. Set password and confirm email in auth.users via service role
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    console.error("setup-password Auth update failed:", updateError);
    return NextResponse.json(
      { error: updateError.message || "Could not set your password. Please try again." },
      { status: 500 }
    );
  }

  // 3. Inspect application profile and authorized roles
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isInvitedOwner =
    user.app_metadata?.role === "owner" ||
    user.user_metadata?.role === "owner" ||
    profile?.role === "owner";

  if (isInvitedOwner) {
    // Finalize owner role in public.profiles
    await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || profile?.email || "",
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        role: "owner",
      },
      { onConflict: "id" }
    );

    // Sync app_metadata
    try {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { role: "owner" },
        user_metadata: { ...user.user_metadata, role: "owner" },
      });
    } catch (metaErr) {
      console.warn("Could not sync app_metadata on password setup:", metaErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Password established successfully.",
    role: isInvitedOwner ? "owner" : (profile?.role || "player"),
  });
}
