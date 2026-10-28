import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { readJson } from "@/lib/admin/server";

export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const notificationId = body?.notificationId;
  const markAll = Boolean(body?.markAll);

  const admin = createAdminClient();

  if (markAll) {
    const { error } = await admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);

    if (error) {
      console.error("mark all read error:", error);
      return NextResponse.json({ error: "Failed to mark notifications read." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (notificationId) {
    const { error } = await admin
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", profile.id);

    if (error) {
      console.error("mark one read error:", error);
      return NextResponse.json({ error: "Failed to mark notification read." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
}

