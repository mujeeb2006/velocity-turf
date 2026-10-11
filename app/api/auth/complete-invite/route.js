import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole } from "@/lib/auth/validation";

/**
 * Validates and finalizes owner activation after password setup.
 * Ensures the profile role is 'owner' only if authorized by admin invitation.
 * Idempotent: safe to invoke repeatedly without corrupting data or turfs.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Look up existing profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  const currentRole = profile ? normalizeUserRole(profile.role) : null;

  if (currentRole === "owner") {
    return NextResponse.json({ success: true, role: "owner" });
  }

  // Check if this user was legitimately invited or designated as an owner by admin
  const isInvitedOwner =
    user.app_metadata?.role === "owner" ||
    user.user_metadata?.role === "owner";

  if (!isInvitedOwner) {
    // Ordinary player attempting privilege escalation
    return NextResponse.json(
      { error: "User is not authorized for owner access." },
      { status: 403 }
    );
  }

  // Use admin client to finalize owner role assignment in profiles
  const admin = createAdminClient();
  const fullName = user.user_metadata?.full_name || profile?.full_name || "";
  const email = user.email || profile?.email || "";

  const { error: upsertError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
        role: "owner",
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.error("complete-invite failed to assign owner role:", upsertError);
    return NextResponse.json(
      { error: "Could not activate owner role." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, role: "owner" });
}
