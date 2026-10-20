// Pure JS deterministic 64-bit hash compatible with both Node and browser client bundles
export function hashBookingPayload(payload) {
  const str = JSON.stringify(payload || {});
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch >> 8), 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${part1}${part2}`;
}

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

  if (slot.status === "closed" || slot.status === "completed" || slot.isExpired) {
    return { ok: false, error: "This session has ended." };
  }

  if (slot.status !== "available") {
    return { ok: false, error: "That slot was just taken — pick another." };
  }

  return { ok: true, slot };
}
