// Pure formatting helpers shared by the Owner and Admin dashboards.
// No browser or React imports so they can be unit-tested with node --test.

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatINR(value) {
  return `₹${Math.round(toNumber(value)).toLocaleString("en-IN")}`;
}

// Indian-style compact amounts: ₹1.2K, ₹3.4L (lakh), ₹1.1Cr (crore).
export function formatCompactINR(value) {
  const n = toNumber(value);
  const abs = Math.abs(n);
  const trim = (x) => String(Number(x.toFixed(1)));
  if (abs >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
}

// "18:00" or "18:00:00" -> "6:00 PM"
export function formatTime12(time) {
  if (!time) return "";
  const [h, m = "00"] = String(time).split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return String(time);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m.slice(0, 2)} ${suffix}`;
}

export function formatHours(hours) {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Number(hours.toFixed(1))} hrs`;
  return `${Number((hours / 24).toFixed(1))} days`;
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return "";
  const diff = now - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// "2026-10-06" -> "Today" / "Tomorrow" / "Thu, 8 Oct"
export function formatDayLabel(dayKey, todayKey) {
  if (!dayKey) return "";
  if (dayKey === todayKey) return "Today";
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const [ty, tm, td] = String(todayKey || "").split("-").map(Number);
  if (ty) {
    const diffDays = Math.round((date - new Date(ty, tm - 1, td)) / 86400000);
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
  }
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatDelta(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
}

// CSV helpers. Cells starting with = + - @ are prefixed with ' so a spreadsheet
// never evaluates user-controlled text (e.g. a player named "=HYPERLINK(...)").
export function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(rows = [], columns = []) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvCell(typeof c.value === "function" ? c.value(row) : row[c.key])).join(","),
  );
  return [header, ...lines].join("\r\n");
}

// "2026-10-06" -> "6 Oct" (or "Tue" when `weekdayOnly`).
export function formatShortDate(dayKey, weekdayOnly = false) {
  const [y, m, d] = String(dayKey).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return weekdayOnly
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// revenueSeries() rows -> BarChart data.
export function seriesToBars(series = [], days = 30) {
  return series.map((row) => {
    const [y, m, d] = row.date.split("-").map(Number);
    const long = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    return {
      key: row.date,
      label: formatShortDate(row.date, days <= 7),
      value: row.revenue,
      tooltip: `${long} · ${row.count} booking${row.count === 1 ? "" : "s"}`,
    };
  });
}
