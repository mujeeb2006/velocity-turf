// Booking policy helpers — used by client-side UI and shared tests.

/**
 * Valid server-side booking state transitions.
 * Keys = action name, value = allowed source → target states.
 */
export const VALID_TRANSITIONS = {
  approve:  { from: ["pending"],              to: "confirmed" },
  reject:   { from: ["pending", "confirmed"], to: "declined"  },
  cancel:   { from: ["pending", "confirmed"], to: "cancelled" },
  complete: { from: ["confirmed"],            to: "completed" },
};

/**
 * Terminal states — no further transitions are valid.
 */
export const TERMINAL_STATUSES = ["declined", "cancelled", "completed"];

/**
 * Returns true when the slot can be booked (client-side pre-flight only).
 * The authoritative check is always the DB trigger + unique index.
 */
export function isSlotAvailableForBooking(slot) {
  if (!slot) return false;
  return slot.status === "available";
}

/**
 * Full pre-flight validation before submitting a booking request.
 * Does NOT replace the server-side slot check.
 */
export function canSubmitBooking({ profile, turf, selectedSlot }) {
  if (!profile?.id) {
    return { ok: false, error: "Please sign in to book a turf." };
  }

  if (!turf?.id) {
    return { ok: false, error: "This turf is unavailable right now." };
  }

  const slotIndex = Number(selectedSlot);
  if (selectedSlot === null || selectedSlot === undefined || Number.isNaN(slotIndex)) {
    return { ok: false, error: "Please select a time slot." };
  }

  const slot = turf.slots?.[slotIndex];
  if (!slot) {
    return { ok: false, error: "That time slot is no longer available." };
  }

  if (!isSlotAvailableForBooking(slot)) {
    return { ok: false, error: "That slot was just taken — pick another." };
  }

  return { ok: true, slot };
}

/**
 * Returns true if the given transition is valid for a booking.
 * Use this for consistent validation across routes.
 */
export function isValidTransition(action, currentStatus) {
  const rule = VALID_TRANSITIONS[action];
  if (!rule) return false;
  return rule.from.includes(currentStatus);
}

/**
 * Returns true if a booking in the given status blocks a slot.
 * Useful for slot availability calculations.
 */
export function statusBlocksSlot(status) {
  return ["pending", "confirmed", "completed"].includes(status);
}
