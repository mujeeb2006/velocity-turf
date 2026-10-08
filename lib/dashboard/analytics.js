// Pure analytics over booking / dispute / review rows. Everything takes an
// explicit `today` (YYYY-MM-DD, local time) so results are deterministic.
import { toNumber } from "./format.js";

const REVENUE_STATUSES = new Set(["confirmed", "completed"]);
const INACTIVE_STATUSES = new Set(["declined", "cancelled"]);

const pad = (n) => String(n).padStart(2, "0");

// Local-date key. toISOString() is UTC, which is "yesterday" in India until
// 05:30 IST, so the dashboards must not use it for "today".
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function bookingDay(booking) {
  return booking.booking_date || String(booking.created_at || "").slice(0, 10);
}

export function isRevenueBooking(booking) {
  return REVENUE_STATUSES.has(booking.status);
}

export function isActiveBooking(booking) {
  return !INACTIVE_STATUSES.has(booking.status);
}

export function sumRevenue(bookings = [], fromKey, toKey) {
  let revenue = 0;
  let count = 0;
  for (const b of bookings) {
    if (!isRevenueBooking(b)) continue;
    const day = bookingDay(b);
    if (day >= fromKey && day <= toKey) {
      revenue += toNumber(b.price);
      count += 1;
    }
  }
  return { revenue, count };
}

// One row per day for the `days` days ending on `today` (inclusive).
export function revenueSeries(bookings = [], days = 30, today = dateKey()) {
  const keys = Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
  const rows = new Map(keys.map((date) => [date, { date, revenue: 0, count: 0 }]));
  for (const b of bookings) {
    if (!isRevenueBooking(b)) continue;
    const row = rows.get(bookingDay(b));
    if (row) {
      row.revenue += toNumber(b.price);
      row.count += 1;
    }
  }
  return keys.map((k) => rows.get(k));
}

// Month-to-date vs the same number of days of last month, so a mid-month
// total is never compared against a full previous month.
export function monthComparison(bookings = [], today = dateKey()) {
  const t = parseKey(today);
  const monthStart = dateKey(new Date(t.getFullYear(), t.getMonth(), 1));
  const prevStart = dateKey(new Date(t.getFullYear(), t.getMonth() - 1, 1));
  const prevMonthEnd = dateKey(new Date(t.getFullYear(), t.getMonth(), 0));
  const prevSameDay = addDays(prevStart, t.getDate() - 1);
  const prevTo = prevSameDay > prevMonthEnd ? prevMonthEnd : prevSameDay;

  const current = sumRevenue(bookings, monthStart, today);
  const previous = sumRevenue(bookings, prevStart, prevTo);
  return {
    revenue: current.revenue,
    count: current.count,
    prevRevenue: previous.revenue,
    prevCount: previous.count,
    revenueChange: pctChange(current.revenue, previous.revenue),
    countChange: pctChange(current.count, previous.count),
  };
}

// null when there's no baseline to compare against.
export function pctChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function revenueBy(bookings = [], keyFn) {
  const map = new Map();
  for (const b of bookings) {
    if (!isRevenueBooking(b)) continue;
    const key = keyFn(b);
    if (key === undefined || key === null || key === "") continue;
    const row = map.get(key) || { key, revenue: 0, count: 0 };
    row.revenue += toNumber(b.price);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
}

export function sportBreakdown(bookings = []) {
  const map = new Map();
  for (const b of bookings) {
    if (!isActiveBooking(b) || !b.sport) continue;
    const row = map.get(b.sport) || { key: b.sport, count: 0 };
    row.count += 1;
    map.set(b.sport, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// 24 buckets of confirmed/completed bookings by start hour.
export function hourDistribution(bookings = []) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const b of bookings) {
    if (!isRevenueBooking(b) || !b.start_time) continue;
    const hour = parseInt(String(b.start_time).slice(0, 2), 10);
    if (hour >= 0 && hour < 24) hours[hour].count += 1;
  }
  return hours;
}

export function filterByRange(bookings = [], days, today = dateKey()) {
  const from = addDays(today, -(days - 1));
  return bookings.filter((b) => {
    const day = bookingDay(b);
    return day >= from && day <= today;
  });
}

// Share of answered requests that were accepted. null when nothing answered yet.
export function acceptanceRate(bookings = []) {
  let accepted = 0;
  let declined = 0;
  for (const b of bookings) {
    if (REVENUE_STATUSES.has(b.status)) accepted += 1;
    else if (b.status === "declined") declined += 1;
  }
  const answered = accepted + declined;
  return answered ? Math.round((accepted / answered) * 100) : null;
}

export function cancellationRate(bookings = []) {
  if (!bookings.length) return null;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  return Math.round((cancelled / bookings.length) * 100);
}

export function statusCounts(bookings = []) {
  const counts = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, declined: 0, cancelled: 0 };
  for (const b of bookings) if (b.status in counts) counts[b.status] += 1;
  return counts;
}

export function upcomingBookings(bookings = [], today = dateKey()) {
  return bookings
    .filter((b) => b.status === "confirmed" && bookingDay(b) >= today)
    .sort((a, b) => bookingDay(a).localeCompare(bookingDay(b)) || String(a.start_time).localeCompare(String(b.start_time)));
}

export function avgResolutionHours(disputes = []) {
  const durations = disputes
    .filter((d) => d.resolved_at && d.created_at)
    .map((d) => (new Date(d.resolved_at) - new Date(d.created_at)) / 3600000)
    .filter((h) => Number.isFinite(h) && h >= 0);
  if (!durations.length) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export function ratingSummary(reviews = []) {
  const total = reviews.length;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Number(r.rating) === stars).length;
    return { stars, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
  const average = total ? reviews.reduce((s, r) => s + toNumber(r.rating), 0) / total : null;
  return { total, average, distribution };
}
