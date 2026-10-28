import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { readJson, UUID_PATTERN } from "@/lib/admin/server";
import { canTransitionMaintenanceStatus, MAINTENANCE_STATUSES, MAINTENANCE_PRIORITIES } from "@/lib/maintenance/policy";
import { hasStaffPermission } from "@/lib/staff/policy";
import { sendSmartNotification, NOTIFICATION_EVENT_TYPES, NOTIFICATION_CATEGORIES, buildDedupKey } from "@/lib/notifications/service";

export async function PATCH(request, { params }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const taskId = params.taskId;
  if (!UUID_PATTERN.test(taskId)) {
    return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: task, error: lookupErr } = await admin
    .from("maintenance_tasks")
    .select("*, turf:turfs(owner_id, name)")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupErr || !task) {
    return NextResponse.json({ error: "Maintenance task not found." }, { status: 404 });
  }

  // Check authorization
  const role = normalizeUserRole(profile.role);
  let authorized = false;
  let actorRole = role;

  if (role === "admin" || (role === "owner" && task.turf?.owner_id === profile.id)) {
    authorized = true;
  } else {
    // Check staff permissions
    const { data: staffRec } = await admin
      .from("venue_staff")
      .select("id, owner_id, turf_id, role, permissions, status")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .maybeSingle();

    if (staffRec && (!staffRec.turf_id || staffRec.turf_id === task.turf_id)) {
      if (hasStaffPermission(staffRec, "manage_maintenance")) {
        authorized = true;
        actorRole = "staff";
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized to update this task." }, { status: 403 });
  }

  const body = await readJson(request);
  const updates = {};

  if (body.status) {
    const nextStatus = String(body.status).toLowerCase();
    if (!MAINTENANCE_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: `Invalid status: ${nextStatus}` }, { status: 400 });
    }
    if (!canTransitionMaintenanceStatus(task.status, nextStatus)) {
      return NextResponse.json({ error: `Cannot transition task from ${task.status} to ${nextStatus}.` }, { status: 409 });
    }
    updates.status = nextStatus;
    if (nextStatus === "completed") {
      updates.completed_at = new Date().toISOString();
      // Also update linked maintenance window if any
      await admin.from("maintenance_windows").update({ status: "completed" }).eq("task_id", taskId);
    } else if (nextStatus === "cancelled") {
      await admin.from("maintenance_windows").update({ status: "cancelled" }).eq("task_id", taskId);
    } else if (nextStatus === "in_progress") {
      await admin.from("maintenance_windows").update({ status: "in_progress" }).eq("task_id", taskId);
    }
  }

  if (body.notes !== undefined) {
    updates.notes = String(body.notes || "");
  }

  if (body.priority) {
    const nextPriority = String(body.priority).toLowerCase();
    if (MAINTENANCE_PRIORITIES.includes(nextPriority)) {
      updates.priority = nextPriority;
    }
  }

  if (body.assigned_to !== undefined || body.assignedTo !== undefined) {
    const assignee = body.assigned_to || body.assignedTo;
    updates.assigned_to = assignee && UUID_PATTERN.test(assignee) ? assignee : null;
    if (updates.assigned_to && updates.assigned_to !== task.assigned_to) {
      await sendSmartNotification(admin, {
        userId: updates.assigned_to,
        title: "Maintenance Task Re-assigned",
        body: `You have been assigned to maintenance task: "${task.title}".`,
        eventType: NOTIFICATION_EVENT_TYPES.MAINTENANCE_ASSIGNMENT,
        category: NOTIFICATION_CATEGORIES.FACILITY,
        link: "/owner",
        metadata: { taskId: task.id, turfId: task.turf_id },
        dedupKey: buildDedupKey("task_reassigned", task.id, updates.assigned_to),
      });
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await admin
    .from("maintenance_tasks")
    .update(updates)
    .eq("id", taskId)
    .select(`
      id, turf_id, title, description, facility_type, priority, status,
      assigned_to, due_date, notes, completed_at, court_name,
      start_date, end_date, start_time, end_time, blocks_slots, created_at,
      assigned_profile:profiles!maintenance_tasks_assigned_to_fkey(id, full_name, email),
      turf:turfs(id, name)
    `)
    .single();

  if (updateError) {
    console.error("update maintenance task error:", updateError);
    return NextResponse.json({ error: "Failed to update maintenance task." }, { status: 500 });
  }

  // Audit log
  await admin.from("staff_audit_log").insert({
    turf_id: task.turf_id,
    actor_id: profile.id,
    actor_role: actorRole,
    action: "update_maintenance_task",
    target_type: "maintenance_task",
    target_id: taskId,
    details: { prev_status: task.status, new_status: updates.status, updates },
  });

  return NextResponse.json({ success: true, task: updated });
}

export async function DELETE(request, { params }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const taskId = params.taskId;
  if (!UUID_PATTERN.test(taskId)) {
    return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: task, error: lookupErr } = await admin
    .from("maintenance_tasks")
    .select("*, turf:turfs(owner_id)")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupErr || !task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const role = normalizeUserRole(profile.role);
  if (role !== "admin" && (role !== "owner" || task.turf?.owner_id !== profile.id)) {
    return NextResponse.json({ error: "Only owners or admins can delete tasks." }, { status: 403 });
  }

  await admin.from("maintenance_windows").delete().eq("task_id", taskId);
  await admin.from("maintenance_tasks").delete().eq("id", taskId);

  await admin.from("staff_audit_log").insert({
    turf_id: task.turf_id,
    actor_id: profile.id,
    actor_role: role,
    action: "delete_maintenance_task",
    target_type: "maintenance_task",
    target_id: taskId,
    details: { task_title: task.title },
  });

  return NextResponse.json({ success: true });
}

