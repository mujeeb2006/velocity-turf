// lib/maintenance/policy.js
// Business rules and validation for facility maintenance management.

export const FACILITY_TYPES = [
  { id: "cleaning", label: "Cleaning" },
  { id: "turf_repair", label: "Artificial Turf Repairs" },
  { id: "lighting", label: "Lighting" },
  { id: "equipment", label: "Equipment" },
  { id: "nets", label: "Nets" },
  { id: "washrooms", label: "Washrooms" },
  { id: "other", label: "Other Facilities" },
];

export const MAINTENANCE_PRIORITIES = ["low", "medium", "high", "urgent"];

export const MAINTENANCE_STATUSES = ["open", "in_progress", "completed", "cancelled"];

export const VALID_MAINTENANCE_TRANSITIONS = {
  open: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled", "open"],
  completed: [], // terminal
  cancelled: [], // terminal
};

export function canTransitionMaintenanceStatus(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_MAINTENANCE_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export function validateMaintenanceTask(task = {}) {
  const errors = [];
  const title = String(task.title || "").trim();
  if (title.length < 2 || title.length > 150) {
    errors.push("Title must be between 2 and 150 characters.");
  }

  const facilityType = String(task.facility_type || task.facilityType || "");
  const validFacilityTypes = FACILITY_TYPES.map((f) => f.id);
  if (!validFacilityTypes.includes(facilityType)) {
    errors.push(`Invalid facility type. Must be one of: ${validFacilityTypes.join(", ")}`);
  }

  const priority = String(task.priority || "medium").toLowerCase();
  if (!MAINTENANCE_PRIORITIES.includes(priority)) {
    errors.push(`Invalid priority. Must be one of: ${MAINTENANCE_PRIORITIES.join(", ")}`);
  }

  const status = String(task.status || "open").toLowerCase();
  if (!MAINTENANCE_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${MAINTENANCE_STATUSES.join(", ")}`);
  }

  if (task.description && String(task.description).length > 2000) {
    errors.push("Description cannot exceed 2000 characters.");
  }

  if (task.blocks_slots || task.blocksSlots) {
    const startTime = task.start_time || task.startTime;
    const endTime = task.end_time || task.endTime;
    const date = task.start_date || task.startDate || task.window_date || task.windowDate;

    if (!date) {
      errors.push("Maintenance window requires a scheduled date.");
    }
    if (!startTime || !endTime) {
      errors.push("Maintenance window requires both start and end times.");
    } else if (startTime >= endTime) {
      errors.push("End time must be after start time.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Finds bookings that conflict with a given maintenance window.
 *
 * @param {Array} bookings List of bookings (with booking_date, start_time, status)
 * @param {string} windowDate "YYYY-MM-DD"
 * @param {string} startTime "HH:mm" or "HH:mm:ss"
 * @param {string} endTime "HH:mm" or "HH:mm:ss"
 * @returns {Array} List of conflicting bookings
 */
export function findConflictingBookings(bookings = [], windowDate, startTime, endTime) {
  if (!Array.isArray(bookings) || !windowDate || !startTime || !endTime) return [];

  const normStart = String(startTime).slice(0, 5);
  const normEnd = String(endTime).slice(0, 5);

  return bookings.filter((b) => {
    // Only pending or confirmed bookings can conflict
    if (!["pending", "confirmed"].includes(b.status)) return false;
    if (b.booking_date !== windowDate) return false;

    const bStart = String(b.start_time || "").slice(0, 5);
    // Standard 1-hour slot ends at bStart + 1hr
    return bStart >= normStart && bStart < normEnd;
  });
}

