import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN, notifyUser } from "@/lib/admin/server";
import { validateMaintenanceTask, findConflictingBookings } from "@/lib/maintenance/policy";
import { hasStaffPermission } from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";
import { refundPackageSession } from "@/lib/package/service";

// Helper to check owner or staff authorization for a turf
async function authorizeTurfOperator(admin, profile, turfId, requiredPermission = "manage_maintenance") {
  if (!profile?.id) return { authorized: false, error: "Authentication required", status: 401 };

  const role = normalizeUserRole(profile.role);
  if (role === "admin") return { authorized: true, role: "admin" };

  // If owner, verify they own the turf
  if (role === "owner") {
    if (turfId) {
      const { data: turf } = await admin.from("turfs").select("id, owner_id").eq("id", turfId).maybeSingle();
      if (!turf || turf.owner_id !== profile.id) {
        return { authorized: false, error: "You can only manage your own turfs.", status: 403 };
      }
    }
    return { authorized: true, role: "owner" };
  }

  // If staff member, verify active membership and permission
  const { data: staffRec } = await admin
    .from("venue_staff")
    .select("id, owner_id, turf_id, role, permissions, status")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRec) {
    return { authorized: false, error: "Staff access not found or revoked.", status: 403 };
  }

  // Verify turf assignment (null means all owner's turfs)
  if (turfId && staffRec.turf_id && staffRec.turf_id !== turfId) {
    return { authorized: false, error: "You are not assigned to this venue.", status: 403 };
  }

  if (!hasStaffPermission(staffRec, requiredPermission)) {
    return { authorized: false, error: `Missing required permission: ${requiredPermission}`, status: 403 };
  }

  return { authorized: true, role: "staff", staff: staffRec };
}

// GET /api/owner/maintenance?turfId=uuid
export async function GET(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const turfId = searchParams.get("turfId");

  const authCheck = await authorizeTurfOperator(admin, profile, turfId, "view_schedule");
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  // Find turfs accessible to this actor
  let accessibleTurfIds = [];
  if (authCheck.role === "admin") {
    const { data: allTurfs } = await admin.from("turfs").select("id");
    accessibleTurfIds = (allTurfs || []).map((t) => t.id);
  } else if (authCheck.role === "owner") {
    const { data: myTurfs } = await admin.from("turfs").select("id").eq("owner_id", profile.id);
    accessibleTurfIds = (myTurfs || []).map((t) => t.id);
  } else {
    // staff
    if (authCheck.staff.turf_id) {
      accessibleTurfIds = [authCheck.staff.turf_id];
    } else {
      const { data: ownerTurfs } = await admin.from("turfs").select("id").eq("owner_id", authCheck.staff.owner_id);
      accessibleTurfIds = (ownerTurfs || []).map((t) => t.id);
    }
  }

  if (turfId && !accessibleTurfIds.includes(turfId)) {
    return NextResponse.json({ error: "Unauthorized access to this turf." }, { status: 403 });
  }

  const queryTurfIds = turfId ? [turfId] : accessibleTurfIds;
  if (queryTurfIds.length === 0) {
    return NextResponse.json({ tasks: [], windows: [] });
  }

  // Fetch tasks
  const { data: tasks, error: tasksError } = await admin
    .from("maintenance_tasks")
    .select(`
      id, turf_id, title, description, facility_type, priority, status,
      assigned_to, due_date, notes, completed_at, court_name,
      start_date, end_date, start_time, end_time, blocks_slots, created_at,
      assigned_profile:profiles!maintenance_tasks_assigned_to_fkey(id, full_name, email),
      turf:turfs(id, name)
    `)
    .in("turf_id", queryTurfIds)
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("fetch maintenance tasks error:", tasksError);
    return NextResponse.json({ error: "Failed to load maintenance tasks." }, { status: 500 });
  }

  // Fetch windows
  const { data: windows, error: windowsError } = await admin
    .from("maintenance_windows")
    .select("*")
    .in("turf_id", queryTurfIds)
    .order("window_date", { ascending: true });

  if (windowsError) {
    console.error("fetch maintenance windows error:", windowsError);
    return NextResponse.json({ error: "Failed to load maintenance windows." }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks || [], windows: windows || [] });
}

// POST /api/owner/maintenance
export async function POST(request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await readJson(request);
  const turfId = body?.turf_id || body?.turfId;

  if (!UUID_PATTERN.test(turfId)) {
    return NextResponse.json({ error: "Valid turf ID is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const authCheck = await authorizeTurfOperator(admin, profile, turfId, "manage_maintenance");
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const validation = validateMaintenanceTask(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }

  const title = String(body.title).trim();
  const description = String(body.description || "").trim();
  const facilityType = body.facility_type || body.facilityType;
  const priority = body.priority || "medium";
  const dueDate = body.due_date || body.dueDate || null;
  const assignedTo = body.assigned_to || body.assignedTo || null;
  const courtName = body.court_name || body.courtName || "All Courts";
  const blocksSlots = Boolean(body.blocks_slots || body.blocksSlots);
  const startDate = body.start_date || body.startDate || dueDate;
  const endDate = body.end_date || body.endDate || startDate;
  const startTime = body.start_time || body.startTime || null;
  const endTime = body.end_time || body.endTime || null;
  const notes = String(body.notes || "").trim();
  const cancelExistingBookings = Boolean(body.cancelExistingBookings);
  const cancellationReason = String(body.cancellationReason || "Pitch maintenance / turf repair").trim();

  // ── Handle Maintenance Window & Existing Booking Conflicts ──
  if (blocksSlots && startDate && startTime && endTime) {
    // Check for existing bookings on the scheduled date and overlapping time window
    const { data: existingBookings, error: bError } = await admin
      .from("bookings")
      .select("id, player_id, turf_id, booking_date, start_time, sport, price, status, package_redemption_id, turf:turfs(name)")
      .eq("turf_id", turfId)
      .eq("booking_date", startDate)
      .in("status", ["pending", "confirmed"]);

    if (bError) {
      console.error("conflict check error:", bError);
      return NextResponse.json({ error: "Could not inspect booking schedule." }, { status: 500 });
    }

    const conflicts = findConflictingBookings(existingBookings || [], startDate, startTime, endTime);

    if (conflicts.length > 0 && !cancelExistingBookings) {
      return NextResponse.json(
        {
          conflict: true,
          error: `Maintenance window conflicts with ${conflicts.length} confirmed booking(s). Never cancel confirmed bookings silently. Review and explicitly resolve conflicts.`,
          conflicts: conflicts.map((c) => ({
            id: c.id,
            booking_date: c.booking_date,
            start_time: c.start_time,
            sport: c.sport,
            status: c.status,
          })),
        },
        { status: 409 }
      );
    }

    // If explicit permission given to safely cancel conflicting bookings, execute standard cancellation policy
    if (conflicts.length > 0 && cancelExistingBookings) {
      for (const booking of conflicts) {
        const prevStatus = booking.status;
        await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);

        // Audit log
        await admin.from("booking_audit_log").insert({
          booking_id: booking.id,
          turf_id: booking.turf_id,
          player_id: booking.player_id,
          actor_id: profile.id,
          actor_role: authCheck.role,
          action: "cancelled",
          prev_status: prevStatus,
          new_status: "cancelled",
          reason: `Facility Maintenance: ${cancellationReason}`,
        });

        // Restore sports package session if applicable
        if (booking.package_redemption_id) {
          try {
            await refundPackageSession(admin, {
              redemptionId: booking.package_redemption_id,
              bookingId: booking.id,
              userId: booking.player_id,
              bookingDate: booking.booking_date,
              startTime: booking.start_time,
            });
          } catch (refundErr) {
            console.error("maintenance cancellation refund error:", refundErr);
          }
        }

        // Notify player with clear explanation
        const turfName = booking.turf?.name || "the turf";
        await sendSmartNotification(admin, {
          userId: booking.player_id,
          title: "Booking Cancelled for Facility Maintenance",
          body: `Your booking at ${turfName} on ${formatBookingDate(booking.booking_date)} at ${formatTime12(booking.start_time)} was cancelled due to scheduled maintenance (${title}). Any paid credits have been refunded.`,
          eventType: NOTIFICATION_EVENT_TYPES.BOOKING_CANCELLED,
          category: NOTIFICATION_CATEGORIES.BOOKINGS,
          dedupKey: buildDedupKey("maintenance_cancellation", booking.id, booking.player_id),
        });
      }
    }
  }

  // Insert maintenance task
  const { data: newTask, error: taskInsertError } = await admin
    .from("maintenance_tasks")
    .insert({
      turf_id: turfId,
      title,
      description,
      facility_type: facilityType,
      priority,
      status: "open",
      assigned_to: assignedTo && UUID_PATTERN.test(assignedTo) ? assignedTo : null,
      due_date: dueDate,
      notes,
      created_by: profile.id,
      court_name: courtName,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      blocks_slots: blocksSlots,
    })
    .select()
    .single();

  if (taskInsertError) {
    console.error("task insert error:", taskInsertError);
    return NextResponse.json({ error: "Failed to create maintenance task." }, { status: 500 });
  }

  // If blocks_slots, schedule maintenance window
  if (blocksSlots && startDate && startTime && endTime) {
    await admin.from("maintenance_windows").insert({
      turf_id: turfId,
      task_id: newTask.id,
      court_name: courtName,
      window_date: startDate,
      start_time: startTime,
      end_time: endTime,
      reason: title,
      status: "scheduled",
    });
  }

  // If assigned to a staff member, send smart notification
  if (assignedTo && UUID_PATTERN.test(assignedTo)) {
    await sendSmartNotification(admin, {
      userId: assignedTo,
      title: "New Maintenance Task Assigned",
      body: `You have been assigned to maintenance task: "${title}" (${facilityType}) at the venue. Priority: ${priority.toUpperCase()}.`,
      eventType: NOTIFICATION_EVENT_TYPES.MAINTENANCE_ASSIGNMENT,
      category: NOTIFICATION_CATEGORIES.FACILITY,
      link: "/owner",
      metadata: { taskId: newTask.id, turfId },
      dedupKey: buildDedupKey("task_assigned", newTask.id, assignedTo),
    });
  }

  // Audit log for staff action
  await admin.from("staff_audit_log").insert({
    turf_id: turfId,
    actor_id: profile.id,
    actor_role: authCheck.role,
    action: "create_maintenance_task",
    target_type: "maintenance_task",
    target_id: newTask.id,
    details: { title, priority, blocks_slots: blocksSlots, facility_type: facilityType },
  });

  return NextResponse.json({ success: true, task: newTask });
}

