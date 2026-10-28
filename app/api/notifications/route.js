import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";

export async function GET(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const admin = createAdminClient();
  let query = admin
    .from("notifications")
    .select("id, user_id, title, body, read, category, event_type, link, metadata, delivery_status, channel, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data: notifications, error } = await query;
  if (error) {
    console.error("fetch notifications error:", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: notifications || [] });
}

