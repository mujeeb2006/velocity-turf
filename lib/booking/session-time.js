// lib/booking/session-time.js
// Pure client & server compatible utilities for session time calculation,
// timezone synchronization (Asia/Kolkata), and live slot expiration.

export const TURF_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current date and time formatted in the turf's local timezone.
 * Defaults to Asia/Kolkata (IST).
 */
export function getTurfCurrentTime(timeZone = TURF_TIMEZONE) {
  const d = new Date();
  const date = d.toLocaleDateString("en-CA", { timeZone });
  const time = d.toLocaleTimeString("en-GB", { timeZone, hour12: false });
  return { date, time, timestamp: d.getTime(), timeZone };
}

/**
 * Adds hours to an HH:MM[:SS] time string.
 */
export function addHoursToTime(timeStr, hours = 1) {
  if (!timeStr) return "00:00:00";
  const [h = 0, m = 0, s = 0] = String(timeStr).split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(newH)}:${pad(newM)}:${pad(s)}`;
}

/**
 * Returns true if a scheduled session has fully reached its end time.
 * (e.g. A 6:00 PM - 7:00 PM session ends at 7:00 PM).
 */
export function isSessionEnded(bookingDate, startTime, durationHours = 1, serverTime = getTurfCurrentTime()) {
  if (!bookingDate || !startTime) return false;
  if (bookingDate < serverTime.date) return true;
  if (bookingDate > serverTime.date) return false;

  const endTime = addHoursToTime(startTime, durationHours);
  const curTime = serverTime.time.length === 5 ? `${serverTime.time}:00` : serverTime.time;
  const normEnd = endTime.length === 5 ? `${endTime}:00` : endTime;
  return curTime >= normEnd;
}

/**
 * Returns true if a session has either already started or ended.
 * Once a session has started, new users cannot book it.
 */
export function isSessionStartedOrEnded(bookingDate, startTime, serverTime = getTurfCurrentTime()) {
  if (!bookingDate || !startTime) return false;
  if (bookingDate < serverTime.date) return true;
  if (bookingDate > serverTime.date) return false;

  const curTime = (serverTime.time.length === 5 ? `${serverTime.time}:00` : serverTime.time).slice(0, 5);
  const normStart = (startTime.length === 5 ? `${startTime}:00` : startTime).slice(0, 5);
  return curTime >= normStart;
}

/**
 * Annotates a list of slots with live expiration and closure status.
 * Any slot whose session has started or ended is marked as 'closed'.
 */
export function annotateSlotsWithLiveTime(slots = [], bookingDate, serverTime = getTurfCurrentTime()) {
  return (slots || []).map((slot) => {
    const rawTime = slot.slot_time || slot.raw_time || slot.time || "";
    const hasStartedOrEnded = isSessionStartedOrEnded(bookingDate, rawTime, serverTime);
    const hasFullyEnded = isSessionEnded(bookingDate, rawTime, 1, serverTime);

    let status = slot.status;
    let isExpired = false;

    if (hasStartedOrEnded) {
      isExpired = true;
      // If it was available or locked, it is now closed for booking.
      // If it was already booked/confirmed, it is now completed or in-progress.
      if (status === "available" || status === "locked" || status === "held") {
        status = "closed";
      } else if (hasFullyEnded && status === "booked") {
        status = "completed";
      }
    }

    return {
      ...slot,
      status,
      isExpired,
      isEnded: hasFullyEnded,
      isClosed: status === "closed" || status === "completed",
    };
  });
}
