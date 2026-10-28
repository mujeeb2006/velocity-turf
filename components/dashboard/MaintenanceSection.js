"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel } from "@/lib/design-tokens";
import {
  Btn,
  Card,
  EmptyBlock,
  Modal,
  StatCard,
  StatGrid,
  StatusPill,
  Toolbar,
  font,
  inputStyle,
  labelStyle,
  mono,
} from "@/components/dashboard/kit";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";
import {
  FACILITY_TYPES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/maintenance/policy";

const PRIORITY_COLORS = {
  urgent: V.danger,
  high: V.pending,
  medium: V.aqua || V.flood,
  low: V.chalkDim,
};

const STATUS_TONES = {
  open: "pending",
  in_progress: "sky",
  completed: "live",
  cancelled: "danger",
};

export function MaintenanceSection({ turfs = [], isStaff = false, staffPermissions = [], showToast }) {
  const [tasks, setTasks] = useState([]);
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTurfId, setActiveTurfId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewTab, setViewTab] = useState("active"); // "active" or "history"

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState(null);

  const canManage = !isStaff || staffPermissions.includes("manage_maintenance");

  async function fetchMaintenance() {
    setLoading(true);
    try {
      const url = activeTurfId !== "all" ? `/api/owner/maintenance?turfId=${activeTurfId}` : "/api/owner/maintenance";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
        setWindows(data.windows || []);
      } else {
        showToast(data.error || "Failed to load maintenance records.", { type: "error" });
      }
    } catch (err) {
      console.error(err);
      showToast("Network error loading maintenance tasks.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMaintenance();
  }, [activeTurfId]);

  // Derived stats
  const outstandingTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const urgentTasks = tasks.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "completed" && t.status !== "cancelled");

  // Filtered task list
  const filteredTasks = tasks.filter((t) => {
    if (activeTurfId !== "all" && t.turf_id !== activeTurfId) return false;
    if (facilityFilter !== "all" && t.facility_type !== facilityFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

    if (viewTab === "active") {
      if (t.status === "completed" || t.status === "cancelled") return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
    } else {
      // history tab
      if (t.status !== "completed" && t.status !== "cancelled") return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
    }

    return true;
  });

  async function handleUpdateStatus(taskId, newStatus, notes = null) {
    try {
      const payload = { status: newStatus };
      if (notes !== null) payload.notes = notes;

      const res = await fetch(`/api/owner/maintenance/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update task.", { type: "error" });
        return;
      }

      showToast(`Task marked as ${newStatus.replace("_", " ")}.`, { type: "success" });
      setCompletingTaskId(null);
      setCompleteNotes("");
      fetchMaintenance();
    } catch (err) {
      console.error(err);
      showToast("Network error updating task.", { type: "error" });
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Top Banner & Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: 0 }}>Facility & Turf Maintenance</h2>
          <p style={{ color: V.chalkDim, fontSize: 13.5, margin: "4px 0 0" }}>
            Schedule inspections, turf repairs, lighting, nets, washroom sanitization, and block maintenance windows safely.
          </p>
        </div>
        {canManage && (
          <Btn variant="primary" icon="plus" onClick={() => setShowCreateModal(true)}>
            Schedule Maintenance Task
          </Btn>
        )}
      </div>

      {/* Metrics Dashboard */}
      <StatGrid>
        <StatCard label="Outstanding Tasks" value={outstandingTasks.length} icon="shield" color={V.pending} />
        <StatCard label="In Progress" value={inProgressTasks.length} icon="clock" color={V.aqua || V.flood} />
        <StatCard label="High / Urgent" value={urgentTasks.length} icon="alert" color={V.danger} />
        <StatCard label="Completed" value={completedTasks.length} icon="check" color={V.flood} />
      </StatGrid>

      {/* View Tabs & Filters */}
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: `1px solid ${V.line}`, paddingBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setViewTab("active"); setStatusFilter("all"); }}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: viewTab === "active" ? 700 : 500,
                background: viewTab === "active" ? V.floodDim : "transparent",
                color: viewTab === "active" ? V.flood : V.chalkDim,
                border: `1px solid ${viewTab === "active" ? V.flood : "transparent"}`,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Active Tasks ({outstandingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => { setViewTab("history"); setStatusFilter("all"); }}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: viewTab === "history" ? 700 : 500,
                background: viewTab === "history" ? V.floodDim : "transparent",
                color: viewTab === "history" ? V.flood : V.chalkDim,
                border: `1px solid ${viewTab === "history" ? V.flood : "transparent"}`,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Maintenance History ({completedTasks.length + tasks.filter((t) => t.status === "cancelled").length})
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {/* Turf Selector */}
            {turfs.length > 1 && (
              <select
                value={activeTurfId}
                onChange={(e) => setActiveTurfId(e.target.value)}
                style={{ ...inputStyle, minHeight: 34, padding: "4px 10px", fontSize: 13, width: "auto" }}
              >
                <option value="all">All Venues</option>
                {turfs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}

            {/* Facility Filter */}
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              style={{ ...inputStyle, minHeight: 34, padding: "4px 10px", fontSize: 13, width: "auto" }}
            >
              <option value="all">All Facilities</option>
              {FACILITY_TYPES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ ...inputStyle, minHeight: 34, padding: "4px 10px", fontSize: 13, width: "auto" }}
            >
              <option value="all">All Priorities</option>
              {MAINTENANCE_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: V.chalkDim }}>Loading maintenance tasks…</div>
          ) : filteredTasks.length === 0 ? (
            <EmptyBlock
              emoji="🛠️"
              title={viewTab === "active" ? "No active maintenance tasks" : "No maintenance history"}
              subtitle={
                viewTab === "active"
                  ? "All facilities and turfs are operating in top condition."
                  : "Completed maintenance tasks will be archived here."
              }
              action={
                canManage && viewTab === "active" ? (
                  <Btn variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                    Create a task
                  </Btn>
                ) : null
              }
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredTasks.map((task) => {
                const facilityObj = FACILITY_TYPES.find((f) => f.id === task.facility_type);
                const facilityLabel = facilityObj?.label || task.facility_type;
                const priorityColor = PRIORITY_COLORS[task.priority] || V.chalkDim;
                const isCompleting = completingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${V.line}`,
                      borderRadius: 12,
                      padding: "16px 18px",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `${priorityColor}22`,
                            color: priorityColor,
                            border: `1px solid ${priorityColor}44`,
                            textTransform: "uppercase",
                          }}
                        >
                          {task.priority}
                        </span>
                        <span style={{ fontSize: 12, color: V.flood, fontWeight: 700 }}>
                          {facilityLabel}
                        </span>
                        <span style={{ fontSize: 13, color: V.chalkFaint }}>·</span>
                        <span style={{ fontSize: 12, color: V.chalkDim }}>
                          {task.turf?.name || "Venue"} ({task.court_name})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusPill status={STATUS_TONES[task.status] || "info"} label={task.status.replace("_", " ").toUpperCase()} />
                      </div>
                    </div>

                    <div>
                      <h4 style={{ margin: "2px 0 4px", fontSize: 15, fontWeight: 700, color: V.chalk }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p style={{ margin: 0, fontSize: 13, color: V.chalkDim, lineHeight: 1.5 }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Window & Schedule Information */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: V.chalkFaint, marginTop: 2 }}>
                      {task.due_date && (
                        <div>
                          <strong>Due:</strong> {formatBookingDate(task.due_date)}
                        </div>
                      )}
                      {task.blocks_slots && task.start_date && (
                        <div style={{ color: V.pending }}>
                          <strong>Slot Window:</strong> {formatBookingDate(task.start_date)} ({task.start_time?.slice(0, 5)} - {task.end_time?.slice(0, 5)})
                        </div>
                      )}
                      {task.assigned_profile && (
                        <div>
                          <strong>Assigned:</strong> {task.assigned_profile.full_name || task.assigned_profile.email}
                        </div>
                      )}
                      {task.completed_at && (
                        <div style={{ color: V.flood }}>
                          <strong>Completed:</strong> {new Date(task.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {task.notes && (
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, color: V.chalkDim }}>
                        <span style={{ fontWeight: 600, color: V.chalk }}>Notes:</span> {task.notes}
                      </div>
                    )}

                    {/* Actions */}
                    {canManage && task.status !== "completed" && task.status !== "cancelled" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {task.status === "open" && (
                          <Btn size="sm" onClick={() => handleUpdateStatus(task.id, "in_progress")}>
                            Start Task
                          </Btn>
                        )}

                        {isCompleting ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", marginTop: 6 }}>
                            <input
                              type="text"
                              placeholder="Completion notes (optional)..."
                              value={completeNotes}
                              onChange={(e) => setCompleteNotes(e.target.value)}
                              style={{ ...inputStyle, minHeight: 34, fontSize: 13, flex: 1 }}
                            />
                            <Btn
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdateStatus(task.id, "completed", completeNotes)}
                            >
                              Confirm Complete
                            </Btn>
                            <Btn size="sm" onClick={() => setCompletingTaskId(null)}>
                              Cancel
                            </Btn>
                          </div>
                        ) : (
                          <Btn
                            variant="primary"
                            size="sm"
                            icon="check"
                            onClick={() => { setCompletingTaskId(task.id); setCompleteNotes(""); }}
                          >
                            Mark Completed
                          </Btn>
                        )}

                        {!isCompleting && (
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={() => handleUpdateStatus(task.id, "cancelled")}
                          >
                            Cancel Task
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Create Maintenance Task Modal */}
      {showCreateModal && (
        <CreateMaintenanceModal
          turfs={turfs}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchMaintenance();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateMaintenanceModal({ turfs = [], onClose, onSuccess, showToast }) {
  const [turfId, setTurfId] = useState(turfs[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [facilityType, setFacilityType] = useState("cleaning");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [courtName, setCourtName] = useState("All Courts");
  const [blocksSlots, setBlocksSlots] = useState(false);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("08:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Conflicts handling state
  const [conflictData, setConflictData] = useState(null);
  const [cancelReason, setCancelReason] = useState("Pitch maintenance / turf repair");

  async function handleSubmit(cancelExisting = false) {
    if (!turfId || !title.trim()) {
      showToast("Please provide task title and select a venue.", { type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        turf_id: turfId,
        title: title.trim(),
        description: description.trim(),
        facility_type: facilityType,
        priority,
        due_date: dueDate,
        court_name: courtName,
        blocks_slots: blocksSlots,
        start_date: dueDate,
        start_time: blocksSlots ? startTime : null,
        end_time: blocksSlots ? endTime : null,
        notes: notes.trim(),
        cancelExistingBookings: cancelExisting,
        cancellationReason: cancelReason,
      };

      const res = await fetch("/api/owner/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 409 && data.conflict) {
        setConflictData(data);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        showToast(data.error || "Failed to schedule maintenance task.", { type: "error" });
        setSubmitting(false);
        return;
      }

      showToast("Maintenance task and schedule window created.", { type: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast("Network error creating maintenance task.", { type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={conflictData ? "Resolve Conflicting Bookings" : "Schedule Facility Maintenance"}
      subtitle={conflictData ? "Maintenance window overlaps with existing confirmed bookings" : "Create task and optionally block court slots"}
      onClose={onClose}
      maxWidth={520}
      footer={
        conflictData ? (
          <>
            <Btn onClick={() => setConflictData(null)} disabled={submitting}>
              Back / Adjust Window
            </Btn>
            <Btn
              variant="danger"
              busy={submitting}
              onClick={() => handleSubmit(true)}
            >
              Cancel Bookings with Notice & Proceed
            </Btn>
          </>
        ) : (
          <>
            <Btn onClick={onClose} disabled={submitting}>Cancel</Btn>
            <Btn variant="primary" busy={submitting} onClick={() => handleSubmit(false)}>
              Schedule Task
            </Btn>
          </>
        )
      }
    >
      {conflictData ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${V.danger}44`,
              borderRadius: 10,
              padding: "14px 16px",
              color: V.danger,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <strong>Warning: Never cancel confirmed bookings silently!</strong>
            <p style={{ margin: "6px 0 0" }}>
              There {conflictData.conflicts.length === 1 ? "is" : "are"}{" "}
              <strong>{conflictData.conflicts.length} confirmed booking(s)</strong> scheduled during this window:
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {conflictData.conflicts.map((c) => (
                <li key={c.id}>
                  {formatBookingDate(c.booking_date)} at {c.start_time?.slice(0, 5)} ({c.sport})
                </li>
              ))}
            </ul>
          </div>

          <p style={{ fontSize: 13, color: V.chalkDim, margin: 0 }}>
            If you proceed, affected players will be notified immediately of the maintenance cancellation with reason, any sports package credits refunded, and an entry recorded in the audit log.
          </p>

          <label>
            <span style={labelStyle}>Cancellation Reason for Players</span>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {turfs.length > 1 && (
            <label>
              <span style={labelStyle}>Venue / Turf</span>
              <select
                value={turfId}
                onChange={(e) => setTurfId(e.target.value)}
                style={inputStyle}
              >
                {turfs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span style={labelStyle}>Task Title</span>
            <input
              type="text"
              placeholder="e.g. Artificial Turf Infill & Brush, Floodlight Replacement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span style={labelStyle}>Facility Area</span>
              <select
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value)}
                style={inputStyle}
              >
                {FACILITY_TYPES.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={labelStyle}>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={inputStyle}
              >
                {MAINTENANCE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span style={labelStyle}>Date Scheduled</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              >
              </input>
            </label>

            <label>
              <span style={labelStyle}>Court / Facility Zone</span>
              <input
                type="text"
                placeholder="e.g. Court A, Main Turf, Pitch 2"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label>
            <span style={labelStyle}>Description / Scope of Work</span>
            <textarea
              rows={2}
              placeholder="Describe repairs, cleaning materials, contractor info..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 60 }}
            />
          </label>

          {/* Slot Blocking Option */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${V.line}`,
              borderRadius: 10,
              padding: "12px 14px",
              display: "grid",
              gap: 10,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={blocksSlots}
                onChange={(e) => setBlocksSlots(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: V.chalk }}>
                Block court time slots during this maintenance window
              </span>
            </label>

            {blocksSlots && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                <label>
                  <span style={labelStyle}>Window Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label>
                  <span style={labelStyle}>Window End Time</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>
            )}
          </div>

          <label>
            <span style={labelStyle}>Internal Notes</span>
            <input
              type="text"
              placeholder="Optional notes for staff or technician..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      )}
    </Modal>
  );
}

