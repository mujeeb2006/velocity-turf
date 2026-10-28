import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { processScheduledReminders } from "@/lib/notifications/service";

// POST /api/notifications/reminders
// Triggered by server cron or authorized admin/system call
export async function POST(request) {
  // Allow bearer token for background cron jobs or authenticated admin/owner
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  let authorized = false;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    const profile = await getProfile();
    if (profile) {
      const role = normalizeUserRole(profile.role);
      if (role === "admin" || role === "owner") {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized reminder trigger." }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = await processScheduledReminders(admin);

  return NextResponse.json({
    success: true,
    summary,
  });
}

