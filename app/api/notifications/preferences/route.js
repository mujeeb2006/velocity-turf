import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { readJson } from "@/lib/admin/server";
import { getUserPreferences } from "@/lib/notifications/service";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminClient();
  const prefs = await getUserPreferences(admin, profile.id);

  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const admin = createAdminClient();

  const current = await getUserPreferences(admin, profile.id);

  const updates = {
    user_id: profile.id,
    in_app: body?.in_app !== undefined ? Boolean(body.in_app) : current.in_app,
    email: body?.email !== undefined ? Boolean(body.email) : current.email,
    whatsapp: body?.whatsapp !== undefined ? Boolean(body.whatsapp) : current.whatsapp,
    reminders_24h: body?.reminders_24h !== undefined ? Boolean(body.reminders_24h) : current.reminders_24h,
    reminders_2h: body?.reminders_2h !== undefined ? Boolean(body.reminders_2h) : current.reminders_2h,
    promotional: body?.promotional !== undefined ? Boolean(body.promotional) : current.promotional,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await admin
    .from("notification_preferences")
    .upsert(updates)
    .select()
    .single();

  if (error) {
    console.error("update notification preferences error:", error);
    return NextResponse.json({ error: "Failed to update notification preferences." }, { status: 500 });
  }

  return NextResponse.json({ success: true, preferences: saved });
}

