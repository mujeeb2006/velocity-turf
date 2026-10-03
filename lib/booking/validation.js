export function validateBookingRequest({ profile, turf, selectedSlot }) {
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

  if (slot.status !== "available") {
    return { ok: false, error: "That slot was just taken — pick another." };
  }

  return { ok: true, slot };
}
