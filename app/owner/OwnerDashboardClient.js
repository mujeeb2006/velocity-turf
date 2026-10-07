"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeUserRole } from "@/lib/auth/validation";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { COLORS as V, panel } from "@/lib/design-tokens";
import { SPORT_OPTIONS } from "@/lib/sports";
import {
  acceptanceRate, addDays, bookingDay, cancellationRate, dateKey, filterByRange, hourDistribution, isActiveBooking,
  monthComparison, ratingSummary, revenueBy, revenueSeries, sportBreakdown, sumRevenue, upcomingBookings,
} from "@/lib/dashboard/analytics";
import {
  formatCompactINR, formatDayLabel, formatINR, formatTime12, relativeTime, seriesToBars, toNumber,
} from "@/lib/dashboard/format";
import {
  AttentionItem, BarChart, BarList, Btn, Card, ConfirmModal, DataTable, EmptyBlock, ErrorBanner, Icon, Modal,
  NotificationsPanel, Pill, SearchInput, SectionTitle, Segmented, SideNav, StatCard, StatGrid, StatusPill, Stars,
  Toolbar, TopBar, downloadCSV, font, inputStyle, labelStyle, mono, useDebounced, useNotifications,
} from "@/components/dashboard/kit";

const TABS = ["overview", "turfs", "bookings", "analytics", "payouts", "reviews"];
const AMENITY_OPTIONS = ["Floodlights", "Parking", "Cafeteria", "Showers", "AC Hall", "Lockers", "WiFi", "Turf"];
const BOOKING_SELECT = "id, turf_id, player_id, booking_date, start_time, sport, players_count, price, status, created_at";
const OWNER_COLOR = V.aqua;

const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const fmtTime = (t) => (t ? t.slice(0, 5) : t);

// =================================================================== modals
function AddTurfModal({ profile, supabase, onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    name: "", address: "", city: "", sports: [], amenities: [],
    base_price: "", peak_price: "", open_time: "06:00", close_time: "22:00",
  });
  const [submitting, setSubmitting] = useState(false);

  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const basePrice = Number(form.base_price);
  const peakPrice = Number(form.peak_price);
  const isValid = Boolean(
    form.name.trim() && form.address.trim() && form.city.trim() && form.sports.length > 0
    && form.base_price !== "" && form.peak_price !== ""
    && Number.isFinite(basePrice) && Number.isFinite(peakPrice) && basePrice >= 0 && peakPrice >= 0
    && form.open_time < form.close_time,
  );
  const peakBelowBase = form.base_price !== "" && form.peak_price !== "" && peakPrice < basePrice;
  const badHours = form.open_time >= form.close_time;

  const getSubmitErrorMessage = (error) => {
    if (error.code === "42501") return "Your account does not have permission to list a turf. Confirm that your profile role is Turf Owner, then sign out and back in.";
    if (error.code === "23503") return "Your owner profile could not be matched to your account. Sign out and back in, then contact an administrator if this continues.";
    if (error.code === "23514") return "The turf details are invalid. Check that the closing time is later than the opening time and that prices are valid.";
    if (error.code === "42883" && error.message?.includes("notify_admins")) return "The database is missing its admin-notification helper. Ask your Supabase administrator to run supabase/migrations/20261006_add_notify_admins.sql, then try again.";
    if (error.code === "PGRST204" || error.code === "42703") return "The database schema is missing turf fields. Ask an administrator to apply the latest Supabase schema.";
    const reason = error.message || "No additional database message was returned.";
    return `Couldn't submit the turf: ${reason}${error.code ? ` [${error.code}]` : ""}`;
  };

  const handleSubmit = async () => {
    if (!isValid || !profile?.id || submitting) return;
    if (normalizeUserRole(profile.role) !== "owner") {
      showToast("Owner access is required to submit a turf.", { type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("turfs").insert({
        owner_id: profile.id, name: form.name.trim(), address: form.address.trim(), city: form.city.trim(),
        sports: form.sports, amenities: form.amenities, base_price: basePrice, peak_price: peakPrice,
        open_time: form.open_time, close_time: form.close_time, status: "pending",
      });
      if (error) {
        console.error("Turf submission failed", { code: error.code, message: error.message, details: error.details, hint: error.hint, ownerId: profile.id });
        showToast(getSubmitErrorMessage(error), { type: "error" });
        return;
      }
    } catch (error) {
      console.error("Turf submission request failed", error);
      showToast("Couldn't reach the database to submit this turf. Check your connection and try again.", { type: "error" });
      return;
    } finally {
      setSubmitting(false);
    }
    showToast("Turf submitted — an admin will review it shortly.", { type: "success" });
    onCreated();
    onClose();
  };

  const chip = (active, tone) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: font,
    background: active ? (tone === "solid" ? V.flood : V.floodDim) : "transparent",
    color: active ? (tone === "solid" ? "#fff" : V.flood) : V.chalkDim,
    border: `1px solid ${active ? V.flood : V.line}`,
  });

  return (
    <Modal
      title="List a new turf" subtitle="New listings go live once an admin approves them." onClose={onClose}
      footer={<><Btn onClick={onClose} disabled={submitting}>Cancel</Btn><Btn variant="primary" disabled={!isValid} busy={submitting} onClick={handleSubmit}>{submitting ? "Submitting…" : "Submit for review"}</Btn></>}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <label><span style={labelStyle}>Turf name</span><input style={inputStyle} value={form.name} onChange={set("name")} placeholder="e.g. Arena Nova" autoFocus /></label>
        <label><span style={labelStyle}>Address</span><input style={inputStyle} value={form.address} onChange={set("address")} placeholder="e.g. Sector 18, Noida" /></label>
        <label><span style={labelStyle}>City</span><input style={inputStyle} value={form.city} onChange={set("city")} placeholder="e.g. Noida" /></label>

        <div>
          <span style={labelStyle}>Sports offered <span style={{ color: V.chalkFaint, fontWeight: 500 }}>(pick at least one)</span></span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SPORT_OPTIONS.map((s) => <button key={s} type="button" aria-pressed={form.sports.includes(s)} onClick={() => toggle("sports", s)} style={chip(form.sports.includes(s), "solid")}>{s}</button>)}
          </div>
        </div>
        <div>
          <span style={labelStyle}>Amenities</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AMENITY_OPTIONS.map((a) => <button key={a} type="button" aria-pressed={form.amenities.includes(a)} onClick={() => toggle("amenities", a)} style={chip(form.amenities.includes(a), "soft")}>{a}</button>)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label><span style={labelStyle}>Base price / hour (₹)</span><input style={inputStyle} type="number" min="0" value={form.base_price} onChange={set("base_price")} placeholder="1200" /></label>
          <label><span style={labelStyle}>Peak price / hour (₹)</span><input style={inputStyle} type="number" min="0" value={form.peak_price} onChange={set("peak_price")} placeholder="1800" /></label>
        </div>
        {peakBelowBase && <p style={{ color: V.pending, fontSize: 12, margin: "-8px 0 0", fontWeight: 600 }}>Peak price is lower than the base price — double-check these.</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label><span style={labelStyle}>Opens</span><input style={inputStyle} type="time" value={form.open_time} onChange={set("open_time")} /></label>
          <label><span style={labelStyle}>Closes</span><input style={inputStyle} type="time" value={form.close_time} onChange={set("close_time")} /></label>
        </div>
        {badHours && <p style={{ color: V.danger, fontSize: 12, margin: "-8px 0 0", fontWeight: 600 }}>Closing time must be later than opening time.</p>}
      </div>
    </Modal>
  );
}

function ManageSlotsModal({ turf, supabase, onClose, showToast, onChanged }) {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busySlot, setBusySlot] = useState(null);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("turf_slots", { p_turf_id: turf.id, p_date: date });
    if (error) showToast("Couldn't load slots for that day.", { type: "error" });
    else setSlots((data || []).map((s) => ({ time: fmtTime(s.slot_time), raw: s.slot_time, status: s.status })));
    setLoading(false);
  };
  useEffect(() => { fetchSlots(); /* eslint-disable-next-line */ }, [date]);

  const toggleBlock = async (slot) => {
    setBusySlot(slot.raw);
    const { error } = slot.status === "blocked"
      ? await supabase.from("blocked_slots").delete().eq("turf_id", turf.id).eq("blocked_date", date).eq("start_time", slot.raw)
      : await supabase.from("blocked_slots").insert({ turf_id: turf.id, blocked_date: date, start_time: slot.raw });
    if (error) showToast(slot.status === "blocked" ? "Couldn't unblock that slot." : "Couldn't block that slot.", { type: "error" });
    setBusySlot(null);
    await fetchSlots();
    onChanged();
  };

  const counts = slots.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});

  const bulk = async (block) => {
    const targets = slots.filter((s) => s.status === (block ? "available" : "blocked"));
    if (!targets.length || busy) return;
    setBusy(true);
    const { error } = block
      ? await supabase.from("blocked_slots").insert(targets.map((s) => ({ turf_id: turf.id, blocked_date: date, start_time: s.raw })))
      : await supabase.from("blocked_slots").delete().eq("turf_id", turf.id).eq("blocked_date", date).in("start_time", targets.map((s) => s.raw));
    setBusy(false);
    if (error) showToast(block ? "Couldn't block the day. Try again." : "Couldn't unblock the day. Try again.", { type: "error" });
    else showToast(block ? `Blocked ${targets.length} open slot${targets.length === 1 ? "" : "s"}.` : `Unblocked ${targets.length} slot${targets.length === 1 ? "" : "s"}.`, { type: "success" });
    await fetchSlots();
    onChanged();
  };

  const STATUS = {
    available: { bg: V.pitchCard, border: V.lineStrong, color: V.chalk, label: null },
    blocked: { bg: "rgba(228,93,93,0.1)", border: V.danger + "66", color: V.danger, label: "Blocked" },
    locked: { bg: "rgba(240,182,77,0.14)", border: V.pending + "77", color: "#9a6a12", label: "Pending" },
    booked: { bg: V.floodDim, border: V.flood + "55", color: "#12805a", label: "Booked" },
  };

  return (
    <Modal title="Manage slots" subtitle={turf.name} onClose={onClose} maxWidth={580}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Btn size="sm" aria-label="Previous day" disabled={date <= today} onClick={() => setDate((d) => addDays(d, -1))}><Icon name="chevronLeft" size={14} /></Btn>
        <label>
          <span style={labelStyle}>Date</span>
          <input type="date" value={date} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        </label>
        <Btn size="sm" aria-label="Next day" onClick={() => setDate((d) => addDays(d, 1))}><Icon name="chevronRight" size={14} /></Btn>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn size="sm" busy={busy} disabled={loading || !counts.available} onClick={() => bulk(true)}>Block all open</Btn>
          <Btn size="sm" busy={busy} disabled={loading || !counts.blocked} onClick={() => bulk(false)}>Unblock all</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12, flexWrap: "wrap", color: V.chalkDim }}>
        <span><strong style={{ color: V.chalk }}>{counts.available || 0}</strong> open · tap to block</span>
        <span style={{ color: V.danger }}><strong>{counts.blocked || 0}</strong> blocked · tap to unblock</span>
        <span style={{ color: "#9a6a12" }}><strong>{counts.locked || 0}</strong> pending</span>
        <span style={{ color: "#12805a" }}><strong>{counts.booked || 0}</strong> booked</span>
      </div>

      {loading ? <SkeletonCard lines={3} /> : slots.length === 0 ? (
        <div style={{ color: V.chalkFaint, textAlign: "center", padding: 24, fontSize: 13 }}>No slots available for this day.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
          {slots.map((slot) => {
            const s = STATUS[slot.status] || STATUS.available;
            const clickable = slot.status === "available" || slot.status === "blocked";
            return (
              <button
                key={slot.raw} type="button" className="vt-btn" disabled={!clickable || busySlot === slot.raw || busy} onClick={() => toggleBlock(slot)}
                style={{ padding: "10px 4px", borderRadius: 10, border: `1px solid ${s.border}`, background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, cursor: clickable ? "pointer" : "not-allowed", fontFamily: mono, opacity: busySlot === slot.raw ? 0.5 : 1 }}
              >
                {formatTime12(slot.time)}
                {s.label && <div style={{ fontSize: 9.5, marginTop: 2, fontFamily: font }}>{s.label}</div>}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// =================================================================== requests
function RequestCard({ r, today, busy, onAccept, onDecline }) {
  return (
    <Card pad={18}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: V.chalk, fontWeight: 800, fontSize: 15 }}>{r.player}</span>
            <span style={{ color: V.chalkFaint }}>·</span>
            <span style={{ color: V.chalkDim, fontWeight: 600, fontSize: 14 }}>{r.turf}</span>
            {r.date === today && <Pill color={V.pending}>Today</Pill>}
          </div>
          <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 5 }}>
            {formatDayLabel(r.date, today)}, {formatTime12(r.time)} · {r.sport}{r.players ? ` · ${r.players} player${r.players === 1 ? "" : "s"}` : ""} ·{" "}
            <strong style={{ color: V.chalk, fontFamily: mono }}>{formatINR(r.amount)}</strong>
          </div>
          <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 3 }}>Requested {relativeTime(r.createdAt)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="danger" disabled={busy} onClick={onDecline}>Decline</Btn>
          <Btn variant="primary" icon="check" busy={busy} onClick={onAccept}>Accept</Btn>
        </div>
      </div>
    </Card>
  );
}

// =================================================================== dashboard
export default function OwnerDashboardClient({ profile }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const notes = useNotifications(supabase, profile?.id, showToast);

  const [tab, setTab] = useState("overview");
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const [range, setRange] = useState(30);
  const [bookingView, setBookingView] = useState("requests");
  const [bookingQuery, setBookingQuery] = useState("");
  const [reviewTurf, setReviewTurf] = useState("all");
  const [reviewStars, setReviewStars] = useState("all");

  const [respondingId, setRespondingId] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [showAddTurf, setShowAddTurf] = useState(false);
  const [slotsTurf, setSlotsTurf] = useState(null);

  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (TABS.includes(fromHash)) setTab(fromHash);
  }, []);
  const selectTab = (id) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  // ---- data: one pass loads turfs, bookings, payouts, reviews and occupancy
  async function fetchAll() {
    if (!profile?.id) { setLoading(false); return; }
    const today = dateKey();

    const turfsRes = await supabase.from("turfs").select("*").eq("owner_id", profile.id).order("created_at", { ascending: false });
    if (turfsRes.error) {
      console.error("Owner turfs fetch failed", turfsRes.error);
      setLoadError("Couldn't load your turfs. Check your connection and retry.");
      setLoading(false);
      return;
    }
    const list = turfsRes.data || [];
    const ids = list.map((t) => t.id);
    const none = { data: [], error: null };

    // Joined player names depend on RLS + FK names; fall back to plain rows if the join is rejected.
    const loadBookings = async () => {
      if (!ids.length) return none;
      const joined = await supabase.from("bookings").select(`${BOOKING_SELECT}, player:profiles!bookings_player_id_fkey(full_name)`).in("turf_id", ids).order("booking_date", { ascending: false }).order("start_time", { ascending: false });
      if (!joined.error) return joined;
      return supabase.from("bookings").select(BOOKING_SELECT).in("turf_id", ids).order("booking_date", { ascending: false });
    };
    const loadReviews = async () => {
      if (!ids.length) return none;
      const joined = await supabase.from("reviews").select("*, player:profiles!reviews_player_id_fkey(full_name)").in("turf_id", ids).order("created_at", { ascending: false });
      if (!joined.error) return joined;
      return supabase.from("reviews").select("*").in("turf_id", ids).order("created_at", { ascending: false });
    };
    const loadOccupancy = () => Promise.all(list.map(async (t) => {
      const { data } = await supabase.rpc("turf_slots", { p_turf_id: t.id, p_date: today });
      const slots = data || [];
      const taken = slots.filter((s) => s.status !== "available").length;
      return [t.id, slots.length ? Math.round((taken / slots.length) * 100) : 0];
    }));

    const [bookingsRes, payoutsRes, reviewsRes, occupancy] = await Promise.all([
      loadBookings(), supabase.from("payouts").select("*").eq("owner_id", profile.id), loadReviews(), loadOccupancy(),
    ]);

    const failed = [bookingsRes, payoutsRes, reviewsRes].find((r) => r.error);
    if (failed) {
      console.error("Owner dashboard fetch failed", failed.error);
      setLoadError("Some of your data couldn't be loaded, so figures may be incomplete.");
    } else {
      setLoadError("");
    }

    const occupancyById = Object.fromEntries(occupancy);
    setTurfs(list.map((t) => ({ ...t, occupancy: occupancyById[t.id] || 0 })));
    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (payoutsRes.data) setPayouts([...payoutsRes.data].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));
    if (reviewsRes.data) setReviews(reviewsRes.data);
    setUpdatedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    setLoading(false);
  }
  const refreshSoon = useDebounced(fetchAll, 400);

  useEffect(() => {
    fetchAll();
    if (!profile?.id) return undefined;
    const channel = supabase
      .channel(`owner-live-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "turfs", filter: `owner_id=eq.${profile.id}` }, refreshSoon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews" }, refreshSoon)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ---- derived data
  const today = dateKey();
  const d = useMemo(() => {
    const turfById = Object.fromEntries(turfs.map((t) => [t.id, t]));
    const rows = bookings.map((b) => ({
      id: b.id, turfId: b.turf_id, turf: turfById[b.turf_id]?.name || "Turf", player: b.player?.full_name || "Player",
      date: bookingDay(b), time: b.start_time, sport: b.sport, players: b.players_count, amount: toNumber(b.price),
      status: b.status, createdAt: b.created_at, sortKey: `${bookingDay(b)} ${b.start_time}`,
    }));
    const revenueByTurf = new Map(revenueBy(bookings, (b) => b.turf_id).map((r) => [r.key, r.revenue]));
    const todayByTurf = {};
    bookings.forEach((b) => { if (bookingDay(b) === today && isActiveBooking(b)) todayByTurf[b.turf_id] = (todayByTurf[b.turf_id] || 0) + 1; });

    const turfRows = turfs.map((t) => ({ ...t, revenue: revenueByTurf.get(t.id) || 0, todayBookings: todayByTurf[t.id] || 0 }));
    const requests = rows.filter((r) => r.status === "pending").sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const upcoming = upcomingBookings(bookings, today).map((b) => rows.find((r) => r.id === b.id)).filter(Boolean);
    const history = rows.filter((r) => r.status !== "pending" && !(r.status === "confirmed" && r.date >= today)).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    const live = turfRows.filter((t) => t.status === "live");
    const rating = ratingSummary(reviews);

    return {
      rows, requests, upcoming, history, turfRows,
      todaySchedule: rows.filter((r) => r.date === today && (r.status === "confirmed" || r.status === "completed" || r.status === "pending")).sort((a, b) => String(a.time).localeCompare(String(b.time))),
      month: monthComparison(bookings, today),
      lifetime: sumRevenue(bookings, "0000-01-01", "9999-12-31"),
      avgOccupancy: live.length ? Math.round(live.reduce((s, t) => s + t.occupancy, 0) / live.length) : null,
      rating,
      reviewRows: reviews.map((r) => ({ ...r, turfName: turfById[r.turf_id]?.name || "Turf", playerName: r.player?.full_name || "Player", text: r.comment || r.review_text || r.text || "" })),
      acceptance: acceptanceRate(bookings),
    };
  }, [turfs, bookings, reviews, today]);

  // ---- actions
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function respond(request, action) {
    if (respondingId) return;
    setRespondingId(request.id);
    try {
      const response = await fetch("/api/bookings/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: request.id, decision: action === "accept" ? "approve" : "reject" }),
      });
      let data = {};
      try { data = await response.json(); } catch { /* empty body */ }
      if (!response.ok) {
        showToast(data.error || "Couldn't update that booking request. Try again.", { type: "error" });
        if (response.status === 409) fetchAll();
        return;
      }

      const status = action === "accept" ? "confirmed" : "declined";
      setBookings((prev) => prev.map((b) => (b.id === request.id ? { ...b, status } : b)));
      showToast(action === "accept" ? `Accepted ${request.player}'s booking for ${request.turf}` : `Declined ${request.player}'s booking for ${request.turf}`, { type: action === "accept" ? "success" : "info" });
    } catch (error) {
      console.error("Booking response failed", error);
      showToast("Couldn't reach the server. Check your connection and try again.", { type: "error" });
    } finally {
      setRespondingId(null);
      setDeclining(null);
    }
  }

  const pendingCount = d.requests.length;
  const items = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "turfs", label: "My Turfs", icon: "building" },
    { id: "bookings", label: "Bookings", icon: "clock", badge: pendingCount || undefined },
    { id: "analytics", label: "Analytics", icon: "chart" },
    { id: "payouts", label: "Payouts", icon: "wallet" },
    { id: "reviews", label: "Reviews", icon: "star" },
  ];

  const refreshButton = <Btn icon="refresh" size="sm" onClick={fetchAll}>{updatedAt ? `Updated ${updatedAt}` : "Refresh"}</Btn>;
  const addTurfButton = <Btn variant="primary" icon="plus" onClick={() => setShowAddTurf(true)}>Add New Turf</Btn>;
  const skeletonStats = <StatGrid>{[...Array(5)].map((_, i) => <SkeletonCard key={i} lines={1} />)}</StatGrid>;

  return (
    <div className="vt-dashboard-shell" style={{ display: "flex", position: "relative" }}>
      <SideNav
        items={items} active={tab} onSelect={selectTab} roleLabel="OWNER PORTAL" roleIcon="building" roleColor={V.flood}
        name={profile?.full_name} email={profile?.email} onSignOut={handleSignOut} onSettings={() => router.push("/settings")}
        unreadCount={notes.unreadCount} onBell={() => notes.setOpen((o) => !o)}
      />
      <NotificationsPanel
        open={notes.open} onClose={() => notes.setOpen(false)} notifications={notes.notifications} unreadCount={notes.unreadCount}
        lastSyncedAt={notes.lastSyncedAt} onMarkAll={notes.markAllRead} onMarkOne={notes.markOne}
        emptyText="Nothing yet — booking requests and turf approvals will show up here."
      />

      <main className="vt-dashboard-main" style={{ flex: 1, minWidth: 0, padding: "32px 36px" }}>
        <ErrorBanner message={loadError} onRetry={fetchAll} />

        {/* ------------------------------------------------------------ overview */}
        {tab === "overview" && (() => {
          const m = d.month;
          const awaiting = d.turfRows.filter((t) => t.status === "pending");
          const rejected = d.turfRows.filter((t) => t.status === "rejected");
          return (
            <>
              <TopBar title={`Welcome back, ${profile?.full_name || "Owner"}`} sub="Here's how your turfs are doing" action={<>{refreshButton}{addTurfButton}</>} />
              {loading ? skeletonStats : turfs.length === 0 ? (
                <div style={{ marginBottom: 28 }}>
                  <EmptyBlock emoji="🏟️" title="No turfs yet" subtitle="List your first turf to start receiving bookings and managing schedules."
                    action={<Btn variant="primary" onClick={() => setShowAddTurf(true)}>Add your first turf</Btn>} />
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
                    {pendingCount > 0 && (
                      <AttentionItem icon="clock" tone={V.pending} title={`${pendingCount} booking request${pendingCount === 1 ? "" : "s"} waiting for you`}
                        subtitle={`Earliest: ${formatDayLabel(d.requests[0].date, today)}, ${formatTime12(d.requests[0].time)} at ${d.requests[0].turf}.`}
                        action={<Btn variant="primary" size="sm" onClick={() => { setBookingView("requests"); selectTab("bookings"); }}>Respond</Btn>} />
                    )}
                    {awaiting.length > 0 && (
                      <AttentionItem icon="shield" tone={V.sky} title={`${awaiting.length} listing${awaiting.length === 1 ? " is" : "s are"} awaiting admin approval`}
                        subtitle={`${awaiting.map((t) => t.name).join(", ")} — you'll be notified once reviewed.`} />
                    )}
                    {rejected.length > 0 && (
                      <AttentionItem icon="alert" tone={V.danger} title={`${rejected.length} listing${rejected.length === 1 ? " was" : "s were"} not approved`}
                        subtitle={`${rejected.map((t) => t.name).join(", ")} — contact support if you'd like to resubmit.`} />
                    )}
                  </div>
                  <StatGrid>
                    <StatCard label="Revenue this month" value={formatCompactINR(m.revenue)} icon="rupee" color={OWNER_COLOR} delta={m.revenueChange} sub={`${formatCompactINR(d.lifetime.revenue)} lifetime`} />
                    <StatCard label="Today's bookings" value={d.turfRows.reduce((s, t) => s + t.todayBookings, 0)} icon="calendar" color={V.confirmed} sub={`${d.upcoming.length} upcoming confirmed`} />
                    <StatCard label="Occupancy today" value={d.avgOccupancy === null ? "—" : `${d.avgOccupancy}%`} icon="trending" color={V.pending} sub="Across live turfs" />
                    <StatCard label="Avg. rating" value={d.rating.average === null ? "—" : d.rating.average.toFixed(1)} icon="star" color={V.violet} sub={`${d.rating.total} review${d.rating.total === 1 ? "" : "s"}`} />
                    <StatCard label="Acceptance rate" value={d.acceptance === null ? "—" : `${d.acceptance}%`} icon="check" color={V.sky} sub="Of answered requests" />
                  </StatGrid>
                </>
              )}

              {turfs.length > 0 && (
                <>
                  <div className="vt-two-col">
                    <Card>
                      <SectionTitle action={<Segmented label="Chart range" value={range} onChange={setRange} options={[{ id: 7, label: "7d" }, { id: 30, label: "30d" }, { id: 90, label: "90d" }]} />}>Revenue</SectionTitle>
                      {loading ? <SkeletonCard lines={3} /> : <BarChart data={seriesToBars(revenueSeries(bookings, range, today), range)} formatValue={formatINR} ariaLabel={`Daily revenue for the last ${range} days`} />}
                    </Card>
                    <Card>
                      <SectionTitle>Today's schedule</SectionTitle>
                      {loading ? <SkeletonCard lines={3} /> : d.todaySchedule.length === 0 ? (
                        <div style={{ color: V.chalkFaint, fontSize: 13 }}>Nothing booked for today.</div>
                      ) : (
                        <div style={{ display: "grid", maxHeight: 290, overflowY: "auto" }}>
                          {d.todaySchedule.map((r, i) => (
                            <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < d.todaySchedule.length - 1 ? `1px solid ${V.line}` : "none" }}>
                              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: V.chalk, width: 66, flexShrink: 0 }}>{formatTime12(r.time)}</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.player}</div>
                                <div style={{ color: V.chalkFaint, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.turf} · {r.sport}</div>
                              </div>
                              <StatusPill status={r.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  <SectionTitle action={pendingCount > 3 ? <Btn variant="ghost" size="sm" onClick={() => selectTab("bookings")}>View all {pendingCount}</Btn> : null}>Pending requests</SectionTitle>
                  {loading ? <div style={{ display: "grid", gap: 12 }}>{[...Array(2)].map((_, i) => <SkeletonRow key={i} columns={3} />)}</div>
                    : pendingCount === 0 ? <EmptyBlock emoji="✅" title="All caught up" subtitle="No pending booking requests right now." />
                    : (
                      <div style={{ display: "grid", gap: 12 }}>
                        {d.requests.slice(0, 3).map((r) => (
                          <RequestCard key={r.id} r={r} today={today} busy={respondingId === r.id} onAccept={() => respond(r, "accept")} onDecline={() => setDeclining(r)} />
                        ))}
                      </div>
                    )}
                </>
              )}
            </>
          );
        })()}

        {/* ------------------------------------------------------------ turfs */}
        {tab === "turfs" && (
          <>
            <TopBar title="My Turfs" sub={`${turfs.length} listing${turfs.length === 1 ? "" : "s"}`} action={addTurfButton} />
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>{[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={3} />)}</div>
            ) : turfs.length === 0 ? (
              <EmptyBlock emoji="🏟️" title="No turfs listed yet" subtitle="Add your first turf to start taking bookings. New listings need admin approval before they go live." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                {d.turfRows.map((t) => (
                  <Card key={t.id} className="vt-stat">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: V.chalk, fontWeight: 800, fontSize: 16 }}>{t.name}</div>
                        <div style={{ color: V.chalkFaint, fontSize: 12.5, marginTop: 2 }}>{t.address ? `${t.address}, ` : ""}{t.city}</div>
                      </div>
                      <StatusPill status={t.status} />
                    </div>

                    {t.status !== "live" && (
                      <div style={{ background: (t.status === "pending" ? V.pending : V.danger) + "12", border: `1px solid ${(t.status === "pending" ? V.pending : V.danger)}40`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: V.chalkDim, marginBottom: 12 }}>
                        {t.status === "pending" ? "Awaiting admin review. Players can't book this turf yet." : "This listing wasn't approved. Contact support to resubmit."}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {(t.sports || []).map((s) => <Pill key={s} color={V.sky}>{s}</Pill>)}
                      {(t.amenities || []).slice(0, 4).map((a) => <Pill key={a} color={V.chalkDim}>{a}</Pill>)}
                      {(t.amenities || []).length > 4 && <Pill color={V.chalkFaint}>+{t.amenities.length - 4}</Pill>}
                    </div>

                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: V.chalkDim, marginBottom: 14 }}>
                      <span>{formatINR(t.base_price)}–{formatINR(t.peak_price)}<span style={{ color: V.chalkFaint }}>/hr</span></span>
                      <span>{formatTime12(t.open_time)} – {formatTime12(t.close_time)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon name="star" size={12} filled color={V.pending} />
                        {t.review_count ? <>{Number(t.rating).toFixed(1)} <span style={{ color: V.chalkFaint }}>({t.review_count})</span></> : <span style={{ color: V.chalkFaint }}>No reviews</span>}
                      </span>
                    </div>

                    {t.status === "live" && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                          <span style={{ color: V.chalkDim }}>Occupancy today</span>
                          <span style={{ color: V.chalk, fontWeight: 800, fontFamily: mono }}>{t.occupancy}%</span>
                        </div>
                        <div style={{ height: 6, background: V.line, borderRadius: 3, marginBottom: 14 }}>
                          <div style={{ height: "100%", width: `${t.occupancy}%`, background: V.flood, borderRadius: 3 }} />
                        </div>
                      </>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 10 }}>
                        <div style={{ color: V.chalkFaint, fontSize: 11 }}>Today</div>
                        <div style={{ color: V.chalk, fontWeight: 800, fontSize: 14 }}>{t.todayBookings} booking{t.todayBookings === 1 ? "" : "s"}</div>
                      </div>
                      <div style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 10 }}>
                        <div style={{ color: V.chalkFaint, fontSize: 11 }}>Revenue</div>
                        <div style={{ color: V.chalk, fontWeight: 800, fontSize: 14, fontFamily: mono }}>{formatINR(t.revenue)}</div>
                      </div>
                    </div>
                    <Btn style={{ marginTop: 14, width: "100%" }} icon="calendar" onClick={() => setSlotsTurf(t)}>Manage slots</Btn>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------ bookings */}
        {tab === "bookings" && (() => {
          const q = bookingQuery.trim().toLowerCase();
          const match = (r) => !q || [r.player, r.turf, r.sport].some((v) => String(v || "").toLowerCase().includes(q));
          const list = (bookingView === "requests" ? d.requests : bookingView === "upcoming" ? d.upcoming : d.history).filter(match);
          const columns = [
            { key: "sortKey", label: "When", width: "1.1fr", render: (r) => <div><div style={{ color: V.chalk, fontWeight: 700 }}>{formatDayLabel(r.date, today)}</div><div style={{ color: V.chalkFaint, fontSize: 11.5 }}>{formatTime12(r.time)}</div></div> },
            { key: "player", label: "Player", width: "1.2fr" },
            { key: "turf", label: "Turf", width: "1.3fr" },
            { key: "sport", label: "Sport", width: "0.9fr" },
            { key: "amount", label: "Amount", width: "0.9fr", align: "right", render: (r) => <span style={{ fontFamily: mono, color: V.chalk, fontWeight: 700 }}>{formatINR(r.amount)}</span> },
            { key: "status", label: "Status", width: "0.9fr", render: (r) => <StatusPill status={r.status} /> },
          ];
          return (
            <>
              <TopBar title="Bookings" sub={`${pendingCount} awaiting response · ${d.upcoming.length} upcoming`} action={
                <>
                  {refreshButton}
                  {bookingView === "history" && (
                    <Btn icon="download" size="sm" disabled={!list.length} onClick={() => downloadCSV(`bookings-${today}.csv`, list, [
                      { label: "Date", key: "date" }, { label: "Time", key: "time" }, { label: "Turf", key: "turf" }, { label: "Player", key: "player" },
                      { label: "Sport", key: "sport" }, { label: "Amount (INR)", key: "amount" }, { label: "Status", key: "status" },
                    ])}>Export CSV</Btn>
                  )}
                </>
              } />
              <Toolbar>
                <Segmented label="Booking list" value={bookingView} onChange={setBookingView} options={[
                  { id: "requests", label: "Requests", count: d.requests.length }, { id: "upcoming", label: "Upcoming", count: d.upcoming.length }, { id: "history", label: "History", count: d.history.length },
                ]} />
                <SearchInput value={bookingQuery} onChange={setBookingQuery} placeholder="Search player, turf or sport…" label="Search bookings" />
              </Toolbar>
              {loading ? (
                <div style={{ display: "grid", gap: 12 }}>{[...Array(3)].map((_, i) => <SkeletonRow key={i} columns={3} />)}</div>
              ) : bookingView === "requests" ? (
                list.length === 0 ? <EmptyBlock emoji="📭" title={q ? "No requests match" : "No pending requests"} subtitle="New booking requests from players will show up here." /> : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {list.map((r) => <RequestCard key={r.id} r={r} today={today} busy={respondingId === r.id} onAccept={() => respond(r, "accept")} onDecline={() => setDeclining(r)} />)}
                  </div>
                )
              ) : (
                <DataTable columns={columns} rows={list} minWidth={760} empty={bookingView === "upcoming" ? "No upcoming confirmed bookings." : "No past bookings yet."} />
              )}
            </>
          );
        })()}

        {/* ------------------------------------------------------------ analytics */}
        {tab === "analytics" && (() => {
          const inRange = filterByRange(bookings, range, today);
          const rev = sumRevenue(bookings, addDays(today, -(range - 1)), today);
          const hours = hourDistribution(inRange);
          const active = hours.filter((h) => h.count > 0).map((h) => h.hour);
          const from = active.length ? Math.min(...active, 6) : 6;
          const to = active.length ? Math.max(...active, 21) : 21;
          const hourBars = hours.filter((h) => h.hour >= from && h.hour <= to).map((h) => ({ key: h.hour, label: hourLabel(h.hour), value: h.count, tooltip: `${formatTime12(`${h.hour}:00`)} · ${h.count} booking${h.count === 1 ? "" : "s"}` }));
          const byTurf = revenueBy(inRange, (b) => b.turf_id).map((r) => ({ key: r.key, label: d.turfRows.find((t) => t.id === r.key)?.name || "Turf", sub: `${r.count} booking${r.count === 1 ? "" : "s"}`, value: r.revenue }));
          const sports = sportBreakdown(inRange).map((s) => ({ key: s.key, label: s.key, value: s.count }));
          const cancel = cancellationRate(inRange);
          return (
            <>
              <TopBar title="Analytics" sub="Revenue, demand and performance across your turfs" action={
                <Segmented label="Date range" value={range} onChange={setRange} options={[{ id: 7, label: "7 days" }, { id: 30, label: "30 days" }, { id: 90, label: "90 days" }]} />
              } />
              {loading ? skeletonStats : (
                <StatGrid>
                  <StatCard label={`Revenue · last ${range} days`} value={formatCompactINR(rev.revenue)} icon="rupee" color={OWNER_COLOR} />
                  <StatCard label="Paid bookings" value={rev.count} icon="calendar" color={V.confirmed} />
                  <StatCard label="Avg. booking value" value={rev.count ? formatINR(rev.revenue / rev.count) : "—"} icon="wallet" color={V.violet} />
                  <StatCard label="Acceptance rate" value={acceptanceRate(inRange) === null ? "—" : `${acceptanceRate(inRange)}%`} icon="check" color={V.sky} />
                  <StatCard label="Cancellation rate" value={cancel === null ? "—" : `${cancel}%`} icon="x" color={V.danger} />
                </StatGrid>
              )}
              <div style={{ marginBottom: 16 }}>
                <Card>
                  <SectionTitle>Daily revenue</SectionTitle>
                  {loading ? <SkeletonCard lines={3} /> : <BarChart data={seriesToBars(revenueSeries(bookings, range, today), range)} formatValue={formatINR} ariaLabel={`Daily revenue for the last ${range} days`} />}
                </Card>
              </div>
              <div className="vt-even-col" style={{ marginBottom: 16 }}>
                <Card>
                  <SectionTitle>Busiest hours</SectionTitle>
                  {loading ? <SkeletonCard lines={3} /> : inRange.length === 0 ? <div style={{ color: V.chalkFaint, fontSize: 13 }}>No bookings in this period.</div> : <BarChart data={hourBars} height={130} color={V.sky} formatValue={(v) => `${v} booking${v === 1 ? "" : "s"}`} ariaLabel="Bookings by start hour" labelEvery={2} />}
                </Card>
                <Card>
                  <SectionTitle>Revenue by turf</SectionTitle>
                  {loading ? <SkeletonCard lines={3} /> : <BarList items={byTurf} formatValue={formatCompactINR} empty="No revenue in this period." />}
                </Card>
              </div>
              <Card>
                <SectionTitle>Bookings by sport</SectionTitle>
                {loading ? <SkeletonCard lines={2} /> : <BarList items={sports} color={V.violet} formatValue={(v) => `${v}`} empty="No bookings in this period." />}
              </Card>
            </>
          );
        })()}

        {/* ------------------------------------------------------------ payouts */}
        {tab === "payouts" && (() => {
          const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + toNumber(p.amount), 0);
          const pending = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + toNumber(p.amount), 0);
          const columns = [
            { key: "payout_id", label: "Payout ID", width: "1fr", render: (p) => <span style={{ fontFamily: mono }}>{p.payout_id || (p.id ? String(p.id).slice(0, 8) : "—")}</span> },
            { key: "period", label: "Period", width: "1.3fr", render: (p) => <span style={{ color: V.chalk }}>{p.period || [p.period_start, p.period_end].filter(Boolean).join(" – ") || "—"}</span> },
            { key: "amount", label: "Amount", width: "1fr", align: "right", render: (p) => <span style={{ fontFamily: mono, color: V.chalk, fontWeight: 700 }}>{formatINR(p.amount)}</span> },
            { key: "status", label: "Status", width: "0.8fr", render: (p) => <StatusPill status={p.status || "pending"} /> },
          ];
          return (
            <>
              <TopBar title="Payouts" sub="Your settlement history" action={payouts.length > 0 && (
                <Btn icon="download" size="sm" onClick={() => downloadCSV(`payouts-${today}.csv`, payouts, [
                  { label: "Payout ID", value: (p) => p.payout_id || p.id }, { label: "Period", value: (p) => p.period || [p.period_start, p.period_end].filter(Boolean).join(" to ") },
                  { label: "Amount (INR)", key: "amount" }, { label: "Status", key: "status" },
                ])}>Export CSV</Btn>
              )} />
              {loading ? skeletonStats : (
                <StatGrid>
                  <StatCard label="Paid out" value={formatINR(paid)} icon="wallet" color={V.confirmed} sub={`${payouts.filter((p) => p.status === "paid").length} settled`} />
                  <StatCard label="Pending payouts" value={formatINR(pending)} icon="clock" color={V.pending} sub={`${payouts.filter((p) => p.status !== "paid").length} in progress`} />
                  <StatCard label="Lifetime booking revenue" value={formatCompactINR(d.lifetime.revenue)} icon="rupee" color={OWNER_COLOR} sub="Confirmed + completed" />
                </StatGrid>
              )}
              {loading ? (
                <div style={{ ...panel(), borderRadius: 16, overflow: "hidden" }}>{[...Array(3)].map((_, i) => <SkeletonRow key={i} columns={4} />)}</div>
              ) : <DataTable columns={columns} rows={payouts} minWidth={560} empty="No payout records yet. Settlements will appear here once they're issued." />}
            </>
          );
        })()}

        {/* ------------------------------------------------------------ reviews */}
        {tab === "reviews" && (() => {
          const shown = d.reviewRows.filter((r) =>
            (reviewTurf === "all" || r.turf_id === reviewTurf) &&
            (reviewStars === "all" || (reviewStars === "low" ? Number(r.rating) <= 2 : Number(r.rating) === Number(reviewStars))));
          return (
            <>
              <TopBar title="Reviews" sub="What players are saying about your turfs" action={refreshButton} />
              {loading ? <SkeletonCard lines={3} /> : d.reviewRows.length === 0 ? (
                <EmptyBlock emoji="💬" title="No reviews yet" subtitle="Reviews from players will appear here after their first booking." />
              ) : (
                <>
                  <Card style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 40, color: V.chalk, lineHeight: 1 }}>{d.rating.average.toFixed(1)}</div>
                        <div style={{ margin: "8px 0 4px" }}><Stars value={Math.round(d.rating.average)} size={15} /></div>
                        <div style={{ color: V.chalkFaint, fontSize: 12 }}>{d.rating.total} review{d.rating.total === 1 ? "" : "s"}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 7 }}>
                        {d.rating.distribution.map((row) => (
                          <div key={row.stars} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: V.chalkDim }}>
                            <span style={{ width: 22, fontFamily: mono }}>{row.stars}★</span>
                            <div style={{ flex: 1, height: 6, background: V.line, borderRadius: 3 }}><div style={{ width: `${row.pct}%`, height: "100%", background: V.pending, borderRadius: 3 }} /></div>
                            <span style={{ width: 28, textAlign: "right", fontFamily: mono }}>{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                  <Toolbar>
                    <Segmented label="Filter by rating" value={reviewStars} onChange={setReviewStars} options={[
                      { id: "all", label: "All" }, { id: "5", label: "5★" }, { id: "4", label: "4★" }, { id: "3", label: "3★" }, { id: "low", label: "1–2★" },
                    ]} />
                    {turfs.length > 1 && (
                      <select aria-label="Filter by turf" value={reviewTurf} onChange={(e) => setReviewTurf(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px" }}>
                        <option value="all">All turfs</option>
                        {turfs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </Toolbar>
                  {shown.length === 0 ? <EmptyBlock emoji="🔎" title="No reviews match" subtitle="Try a different rating or turf filter." /> : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {shown.map((r, i) => (
                        <Card key={r.id || i} pad={18}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={{ color: V.chalk, fontWeight: 800, fontSize: 14 }}>{r.playerName} <span style={{ color: V.chalkFaint, fontWeight: 500 }}>· {r.turfName}</span></span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                              <span style={{ color: V.chalkFaint, fontSize: 11.5 }}>{relativeTime(r.created_at)}</span>
                              <Stars value={Number(r.rating)} />
                            </span>
                          </div>
                          <p style={{ color: V.chalkDim, fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>{r.text}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          );
        })()}
      </main>

      {declining && (
        <ConfirmModal
          title="Decline this request?" confirmLabel="Decline request" busy={respondingId === declining.id}
          message={`${declining.player}'s booking for ${declining.turf} on ${formatDayLabel(declining.date, today)} at ${formatTime12(declining.time)} will be declined and the slot reopened.`}
          onConfirm={() => respond(declining, "decline")} onClose={() => setDeclining(null)}
        />
      )}
      {showAddTurf && <AddTurfModal profile={profile} supabase={supabase} onClose={() => setShowAddTurf(false)} onCreated={fetchAll} showToast={showToast} />}
      {slotsTurf && <ManageSlotsModal turf={slotsTurf} supabase={supabase} onClose={() => setSlotsTurf(null)} showToast={showToast} onChanged={refreshSoon} />}
    </div>
  );
}
