import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a name and a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${new URL(request.url).origin}/auth/callback`,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Could not send the invitation." }, { status: 400 });
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "owner", full_name: fullName })
    .eq("id", data.user.id);

  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "The account could not be assigned the owner role." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}