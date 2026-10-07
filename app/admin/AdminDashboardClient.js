"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { COLORS as V, panel } from "@/lib/design-tokens";
import {
  filterTurfs, filterUsers, filterUsersByRole, countUsersByRole, getUserBookingCount, getUserSpend,
  normalizeAdminRole, sortRows,
} from "@/lib/admin/dashboard-utils";
import {
  avgResolutionHours, dateKey, monthComparison, revenueBy, revenueSeries, statusCounts,
} from "@/lib/dashboard/analytics";
import {
  formatCompactINR, formatDayLabel, formatHours, formatINR, formatTime12, relativeTime, seriesToBars,
} from "@/lib/dashboard/format";
import {
  AttentionItem, BarChart, BarList, Btn, Card, ConfirmModal, DataTable, DetailRows, EmptyBlock, ErrorBanner,
  Icon, Modal, NotificationsPanel, SearchInput, SectionTitle, Segmented, SideNav, StatCard, StatGrid,
  StatusPill, Pill, Toolbar, TopBar, downloadCSV, font, inputStyle, labelStyle, mono, useDebounced,
  useNotifications,
} from "@/components/dashboard/kit";

const TABS = ["overview", "approvals", "turfs", "bookings", "users", "disputes"];
const ROLE_COLORS = { Admin: V.violet, "Turf Owner": V.sky, Player: V.flood };
const PAGE_SIZE = 50;

async function postJson(url, body) {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let data = {};
    try { data = await response.json(); } catch { /* empty body */ }
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: "Couldn't reach the server. Check your connection and try again." } };
  }
}

export default function AdminDashboardClient({ profile, initialUsers = [], usersError = false }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const notes = useNotifications(supabase, profile?.id, showToast);

  const [tab, setTab] = useState("overview");
  const [turfsRaw, setTurfsRaw] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [disputesRaw, setDisputesRaw] = useState([]);
  const [usersRaw, setUsersRaw] = useState(initialUsers);
  const [usersFailed, setUsersFailed] = useState(usersError);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const [range, setRange] = useState(30);
  const [turfQuery, setTurfQuery] = useState("");
  const [turfStatus, setTurfStatus] = useState("all");
  const [turfSort, setTurfSort] = useState({ key: "revenue", dir: "desc" });
  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [bookingSort, setBookingSort] = useState({ key: "sortKey", dir: "desc" });
  const [bookingLimit, setBookingLimit] = useState(PAGE_SIZE);
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState("all");
  const [userSort, setUserSort] = useState({ key: "createdTs", dir: "desc" });
  const [disputeFilter, setDisputeFilter] = useState("open");

  const [busyTurfId, setBusyTurfId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reviewDispute, setReviewDispute] = useState(null);
  const [busyDispute, setBusyDispute] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "" });
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  // ---- tab <-> URL hash, so a refresh keeps you where you were
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (TABS.includes(fromHash)) setTab(fromHash);
  }, []);
  const selectTab = (id) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  // ---- data
  async function fetchAll() {
    const disputeQuery = (select) => supabase.from("disputes").select(select).order("created_at", { ascending: false });
    const [turfsRes, richDisputesRes, bookingsRes] = await Promise.all([
      supabase.from("turfs").select("*, owner:profiles(full_name)").order("created_at", { ascending: false }),
      disputeQuery("*, turf:turfs(name), player:profiles!disputes_raised_by_fkey(full_name), booking:bookings(booking_date, start_time, sport, price, status)"),
      supabase.from("bookings")
        .select("id, player_id, turf_id, booking_date, start_time, sport, players_count, price, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    // If the booking join isn't available, fall back to the original query so
    // the disputes list still loads (the detail view just shows fewer fields).
    const disputesRes = richDisputesRes.error
      ? await disputeQuery("*, turf:turfs(name), player:profiles!disputes_raised_by_fkey(full_name)")
      : richDisputesRes;

    const failed = [turfsRes, disputesRes, bookingsRes].find((r) => r.error);
    if (failed) {
      console.error("Admin dashboard fetch failed", failed.error);
      setLoadError("Some dashboard data couldn't be loaded, so figures may be incomplete.");
    } else {
      setLoadError("");
    }
    if (turfsRes.data) setTurfsRaw(turfsRes.data);
    if (disputesRes.data) setDisputesRaw(disputesRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data);
    setUpdatedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error(String(response.status));
      const { users } = await response.json();
      setUsersRaw(users || []);
      setUsersFailed(false);
    } catch (error) {
      console.error("Could not load users", error);
      setUsersFailed(true);
    }
  }

  const refreshAll = () => { fetchAll(); fetchUsers(); };
  const refreshSoon = useDebounced(fetchAll, 400);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("admin-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "turfs" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, refreshSoon)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived data
  const today = dateKey();
  const view = useMemo(() => {
    const revenueByTurf = new Map(revenueBy(bookings, (b) => b.turf_id).map((r) => [r.key, r.revenue]));
    const activeCountByTurf = {};
    bookings.forEach((b) => {
      if (b.status !== "declined" && b.status !== "cancelled") activeCountByTurf[b.turf_id] = (activeCountByTurf[b.turf_id] || 0) + 1;
    });

    const turfs = turfsRaw.map((t) => ({
      id: t.id, name: t.name, address: t.address, city: t.city, status: t.status,
      owner: t.owner?.full_name || "Unknown", revenue: revenueByTurf.get(t.id) || 0,
      bookings: activeCountByTurf[t.id] || 0, rating: Number(t.rating) || 0, reviewCount: t.review_count || 0,
      sports: t.sports || [], amenities: t.amenities || [], basePrice: Number(t.base_price) || 0,
      peakPrice: Number(t.peak_price) || 0, open: t.open_time, close: t.close_time, createdAt: t.created_at,
    }));
    const turfById = Object.fromEntries(turfs.map((t) => [t.id, t]));

    const users = usersRaw.map((u) => ({
      id: u.id, name: u.full_name || "—", email: u.email || "—", role: normalizeAdminRole(u.role),
      createdTs: new Date(u.created_at).getTime() || 0,
      joined: new Date(u.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      bookings: getUserBookingCount(bookings, u.id), spent: getUserSpend(bookings, u.id),
    }));
    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    const disputes = disputesRaw.map((d) => ({
      id: d.ticket_number, dbId: d.id, user: d.player?.full_name || "Unknown", turf: d.turf?.name || "Unknown",
      issue: d.issue, amount: Number(d.amount) || 0, status: d.status, createdAt: d.created_at,
      resolvedAt: d.resolved_at, booking: d.booking,
    }));

    const bookingRows = bookings.map((b) => ({
      id: b.id, date: b.booking_date, time: b.start_time, sortKey: `${b.booking_date} ${b.start_time}`,
      turf: turfById[b.turf_id]?.name || "Unknown turf", player: userById[b.player_id]?.name || "Unknown player",
      sport: b.sport, amount: Number(b.price) || 0, status: b.status,
    }));

    const cities = {};
    turfs.forEach((t) => {
      const c = (cities[t.city] ||= { key: t.city, label: t.city, turfs: 0, value: 0 });
      c.turfs += 1;
      c.value += t.revenue;
    });

    return {
      turfs, users, disputes, bookingRows,
      cityList: Object.values(cities).sort((a, b) => b.value - a.value).map((c) => ({ ...c, sub: `${c.turfs} turf${c.turfs === 1 ? "" : "s"}` })),
      pendingTurfs: turfs.filter((t) => t.status === "pending"),
      month: monthComparison(bookings, today),
      series: revenueSeries(bookings, range, today),
      userCounts: countUsersByRole(users),
      openDisputes: disputes.filter((d) => d.status === "open"),
      avgResolve: avgResolutionHours(disputesRaw),
      bookingCounts: statusCounts(bookings),
      liveTurfs: turfs.filter((t) => t.status === "live").length,
    };
  }, [turfsRaw, bookings, disputesRaw, usersRaw, range, today]);

  const { turfs, users, disputes, pendingTurfs, openDisputes } = view;

  // ---- actions
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function decideTurf(turf, decision) {
    if (busyTurfId) return;
    setBusyTurfId(turf.id);
    const { ok, data } = await postJson("/api/admin/turfs/decision", { turfId: turf.id, decision });
    setBusyTurfId(null);
    setRejecting(null);
    if (!ok) {
      showToast(data.error || "Couldn't update that turf. Try again.", { type: "error" });
      fetchAll();
      return;
    }
    showToast(decision === "approve" ? `Approved "${turf.name}" — now live. The owner has been notified.` : `Rejected "${turf.name}". The owner has been notified.`, { type: decision === "approve" ? "success" : "info" });
    fetchAll();
  }

  async function resolveDispute(dispute, outcome) {
    if (busyDispute) return;
    setBusyDispute(true);
    const { ok, data } = await postJson("/api/admin/disputes/resolve", { disputeId: dispute.dbId, outcome });
    setBusyDispute(false);
    if (!ok) {
      showToast(data.error || "Couldn't resolve that dispute. Try again.", { type: "error" });
      fetchAll();
      return;
    }
    setReviewDispute(null);
    showToast(outcome === "refund" ? `Refund approved for ${dispute.id} · ${formatINR(dispute.amount)}` : `${dispute.id} resolved without a refund`, { type: "success" });
    fetchAll();
  }

  async function handleInvite(event) {
    event.preventDefault();
    setInviteError("");
    setInviting(true);
    const { ok, data } = await postJson("/api/admin/owners", { fullName: invite.name, email: invite.email });
    setInviting(false);
    if (!ok) {
      setInviteError(data.error || "Could not send the invitation.");
      return;
    }
    setInvite({ name: "", email: "" });
    setShowInvite(false);
    showToast("Owner invitation sent.", { type: "success" });
    fetchUsers();
  }

  // Numeric/date columns start high-to-low; text columns start A-Z.
  const NUMERIC_SORT_KEYS = ["revenue", "bookings", "spent", "amount", "rating", "createdTs", "sortKey"];
  const toggleSort = (setter) => (key) => setter((s) => (
    s.key === key
      ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key, dir: NUMERIC_SORT_KEYS.includes(key) ? "desc" : "asc" }
  ));

  const items = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "approvals", label: "Turf Approvals", icon: "building", badge: pendingTurfs.length || undefined },
    { id: "turfs", label: "All Turfs", icon: "map" },
    { id: "bookings", label: "Bookings", icon: "list" },
    { id: "users", label: "Users", icon: "users" },
    { id: "disputes", label: "Disputes & Refunds", icon: "alert", badge: openDisputes.length || undefined },
  ];

  const refreshButton = <Btn icon="refresh" size="sm" onClick={refreshAll}>{updatedAt ? `Updated ${updatedAt}` : "Refresh"}</Btn>;

  return (
    <div className="vt-dashboard-shell" style={{ display: "flex", position: "relative" }}>
      <SideNav
        items={items} active={tab} onSelect={selectTab} roleLabel="ADMIN CONSOLE" roleIcon="shield" roleColor={V.violet}
        name={profile?.full_name} email={profile?.email} onSignOut={handleSignOut} onSettings={() => router.push("/settings")}
        unreadCount={notes.unreadCount} onBell={() => notes.setOpen((o) => !o)}
      />
      <NotificationsPanel
        open={notes.open} onClose={() => notes.setOpen(false)} notifications={notes.notifications} unreadCount={notes.unreadCount}
        lastSyncedAt={notes.lastSyncedAt} onMarkAll={notes.markAllRead} onMarkOne={notes.markOne}
        emptyText="Nothing yet — new turf submissions and disputes will show up here."
      />

      <main className="vt-dashboard-main" style={{ flex: 1, minWidth: 0, padding: "32px 36px" }}>
        <ErrorBanner message={loadError} onRetry={fetchAll} />

        {tab === "overview" && (
          <OverviewTab
            profile={profile} view={view} loading={loading} range={range} setRange={setRange} refreshButton={refreshButton}
            goTo={selectTab}
          />
        )}

        {tab === "approvals" && (
          <>
            <TopBar title="Turf Approvals" sub={`${pendingTurfs.length} listing${pendingTurfs.length === 1 ? "" : "s"} awaiting review`} action={refreshButton} />
            {loading ? (
              <div style={{ display: "grid", gap: 14 }}>{[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}</div>
            ) : pendingTurfs.length === 0 ? (
              <EmptyBlock emoji="✅" title="No turfs awaiting review" subtitle="New owner submissions will appear here for approval." />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {pendingTurfs.map((t) => (
                  <Card key={t.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 240, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ color: V.chalk, fontWeight: 800, fontSize: 17 }}>{t.name}</span>
                          <StatusPill status="pending" />
                        </div>
                        <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 4 }}>
                          {t.address}, {t.city} · Owner: <strong style={{ color: V.chalk }}>{t.owner}</strong> · Submitted {relativeTime(t.createdAt)}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                          {t.sports.map((s) => <Pill key={s} color={V.sky}>{s}</Pill>)}
                          {t.amenities.map((a) => <Pill key={a} color={V.chalkDim}>{a}</Pill>)}
                        </div>
                        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14, fontSize: 12.5, color: V.chalkDim }}>
                          <span>Base <strong style={{ color: V.chalk, fontFamily: mono }}>{formatINR(t.basePrice)}</strong>/hr</span>
                          <span>Peak <strong style={{ color: V.chalk, fontFamily: mono }}>{formatINR(t.peakPrice)}</strong>/hr</span>
                          <span>Hours <strong style={{ color: V.chalk }}>{formatTime12(t.open)} – {formatTime12(t.close)}</strong></span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Btn variant="danger" icon="x" disabled={busyTurfId === t.id} onClick={() => setRejecting(t)}>Reject</Btn>
                        <Btn variant="primary" icon="check" busy={busyTurfId === t.id} onClick={() => decideTurf(t, "approve")}>Approve</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "turfs" && (() => {
          const rows = sortRows(filterTurfs(turfs, { query: turfQuery, status: turfStatus }), turfSort.key, turfSort.dir);
          const counts = { all: turfs.length, live: 0, pending: 0, rejected: 0 };
          turfs.forEach((t) => { if (t.status in counts) counts[t.status] += 1; });
          const columns = [
            { key: "name", label: "Turf", width: "1.7fr", sortable: true, render: (t) => (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ color: V.chalkFaint, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.address}</div>
              </div>
            ) },
            { key: "owner", label: "Owner", width: "1.1fr", sortable: true },
            { key: "city", label: "City", width: "0.9fr", sortable: true },
            { key: "status", label: "Status", width: "0.8fr", sortable: true, render: (t) => <StatusPill status={t.status} /> },
            { key: "bookings", label: "Bookings", width: "0.8fr", align: "right", sortable: true, render: (t) => <span style={{ fontFamily: mono }}>{t.bookings}</span> },
            { key: "revenue", label: "Revenue", width: "1fr", align: "right", sortable: true, render: (t) => <span style={{ fontFamily: mono, color: V.chalk, fontWeight: 700 }}>{formatINR(t.revenue)}</span> },
            { key: "rating", label: "Rating", width: "0.9fr", align: "right", sortable: true, render: (t) => (
              t.reviewCount ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: V.chalk, fontWeight: 700 }}>
                  <Icon name="star" size={13} filled color={V.pending} />{t.rating.toFixed(1)} <span style={{ color: V.chalkFaint, fontWeight: 500 }}>({t.reviewCount})</span>
                </span>
              ) : <span style={{ color: V.chalkFaint }}>No reviews</span>
            ) },
          ];
          return (
            <>
              <TopBar title="All Turfs" sub={`${turfs.length} listing${turfs.length === 1 ? "" : "s"} on the platform`} action={
                <Btn icon="download" size="sm" disabled={!rows.length} onClick={() => downloadCSV(`turfs-${today}.csv`, rows, [
                  { label: "Turf", key: "name" }, { label: "Owner", key: "owner" }, { label: "City", key: "city" }, { label: "Status", key: "status" },
                  { label: "Bookings", key: "bookings" }, { label: "Revenue (INR)", key: "revenue" }, { label: "Rating", key: "rating" },
                ])}>Export CSV</Btn>
              } />
              <Toolbar>
                <SearchInput value={turfQuery} onChange={setTurfQuery} placeholder="Search turf, owner or city…" label="Search turfs" />
                <Segmented label="Filter by status" value={turfStatus} onChange={setTurfStatus} options={[
                  { id: "all", label: "All", count: counts.all }, { id: "live", label: "Live", count: counts.live },
                  { id: "pending", label: "Pending", count: counts.pending }, { id: "rejected", label: "Rejected", count: counts.rejected },
                ]} />
              </Toolbar>
              {loading ? (
                <div style={{ ...panel(), borderRadius: 16, overflow: "hidden" }}>{[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={6} />)}</div>
              ) : (
                <DataTable columns={columns} rows={rows} sort={turfSort} onSort={toggleSort(setTurfSort)} minWidth={860} empty="No turfs match your filters." />
              )}
            </>
          );
        })()}

        {tab === "bookings" && (() => {
          const q = bookingQuery.trim().toLowerCase();
          const filtered = view.bookingRows.filter((b) =>
            (bookingStatus === "all" || b.status === bookingStatus) &&
            (!q || [b.turf, b.player, b.sport].some((v) => String(v || "").toLowerCase().includes(q))));
          const rows = sortRows(filtered, bookingSort.key, bookingSort.dir);
          const shown = rows.slice(0, bookingLimit);
          const c = view.bookingCounts;
          const columns = [
            { key: "sortKey", label: "When", width: "1.1fr", sortable: true, render: (b) => (
              <div>
                <div style={{ color: V.chalk, fontWeight: 700 }}>{formatDayLabel(b.date, today)}</div>
                <div style={{ color: V.chalkFaint, fontSize: 11.5 }}>{formatTime12(b.time)}</div>
              </div>
            ) },
            { key: "turf", label: "Turf", width: "1.4fr", sortable: true, render: (b) => <span style={{ color: V.chalk, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.turf}</span> },
            { key: "player", label: "Player", width: "1.2fr", sortable: true },
            { key: "sport", label: "Sport", width: "0.9fr" },
            { key: "amount", label: "Amount", width: "0.9fr", align: "right", sortable: true, render: (b) => <span style={{ fontFamily: mono, color: V.chalk, fontWeight: 700 }}>{formatINR(b.amount)}</span> },
            { key: "status", label: "Status", width: "0.9fr", sortable: true, render: (b) => <StatusPill status={b.status} /> },
          ];
          return (
            <>
              <TopBar title="Bookings" sub={`${c.all} total · ${c.pending} pending · ${c.confirmed} confirmed`} action={
                <Btn icon="download" size="sm" disabled={!rows.length} onClick={() => downloadCSV(`bookings-${today}.csv`, rows, [
                  { label: "Date", key: "date" }, { label: "Time", key: "time" }, { label: "Turf", key: "turf" }, { label: "Player", key: "player" },
                  { label: "Sport", key: "sport" }, { label: "Amount (INR)", key: "amount" }, { label: "Status", key: "status" },
                ])}>Export CSV</Btn>
              } />
              <Toolbar>
                <SearchInput value={bookingQuery} onChange={(v) => { setBookingQuery(v); setBookingLimit(PAGE_SIZE); }} placeholder="Search turf, player or sport…" label="Search bookings" />
                <Segmented label="Filter by status" value={bookingStatus} onChange={(v) => { setBookingStatus(v); setBookingLimit(PAGE_SIZE); }} options={[
                  { id: "all", label: "All", count: c.all }, { id: "pending", label: "Pending", count: c.pending },
                  { id: "confirmed", label: "Confirmed", count: c.confirmed }, { id: "completed", label: "Completed", count: c.completed },
                  { id: "declined", label: "Declined", count: c.declined }, { id: "cancelled", label: "Cancelled", count: c.cancelled },
                ]} />
              </Toolbar>
              {loading ? (
                <div style={{ ...panel(), borderRadius: 16, overflow: "hidden" }}>{[...Array(5)].map((_, i) => <SkeletonRow key={i} columns={6} />)}</div>
              ) : (
                <>
                  <DataTable columns={columns} rows={shown} sort={bookingSort} onSort={toggleSort(setBookingSort)} minWidth={820} empty="No bookings match your filters." />
                  {rows.length > shown.length && (
                    <div style={{ textAlign: "center", marginTop: 14 }}>
                      <Btn onClick={() => setBookingLimit((n) => n + PAGE_SIZE)}>Show more ({rows.length - shown.length} remaining)</Btn>
                    </div>
                  )}
                </>
              )}
            </>
          );
        })()}

        {tab === "users" && (() => {
          const rows = sortRows(filterUsersByRole(filterUsers(users, userQuery), userRole), userSort.key, userSort.dir);
          const counts = view.userCounts;
          const columns = [
            { key: "name", label: "Name", width: "1.6fr", sortable: true, render: (u) => (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                <div style={{ color: V.chalkFaint, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              </div>
            ) },
            { key: "role", label: "Role", width: "0.9fr", sortable: true, render: (u) => <Pill color={ROLE_COLORS[u.role]}>{u.role}</Pill> },
            { key: "createdTs", label: "Joined", width: "0.8fr", sortable: true, render: (u) => u.joined },
            { key: "bookings", label: "Bookings", width: "0.7fr", align: "right", sortable: true, render: (u) => <span style={{ fontFamily: mono }}>{u.bookings}</span> },
            { key: "spent", label: "Spent", width: "0.9fr", align: "right", sortable: true, render: (u) => <span style={{ fontFamily: mono, color: V.chalk, fontWeight: 700 }}>{formatINR(u.spent)}</span> },
          ];
          return (
            <>
              <TopBar title="Users" sub={`${counts.all.toLocaleString("en-IN")} account${counts.all === 1 ? "" : "s"}`} action={
                <>
                  <Btn icon="download" size="sm" disabled={!rows.length} onClick={() => downloadCSV(`users-${today}.csv`, rows, [
                    { label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Role", key: "role" }, { label: "Joined", key: "joined" },
                    { label: "Bookings", key: "bookings" }, { label: "Spent (INR)", key: "spent" },
                  ])}>Export CSV</Btn>
                  <Btn variant="primary" icon="plus" size="sm" onClick={() => { setShowInvite(true); setInviteError(""); }}>Invite owner</Btn>
                </>
              } />
              {usersFailed && <ErrorBanner message="Couldn't load the user list. Check that SUPABASE_SERVICE_ROLE_KEY is configured on the server." onRetry={fetchUsers} />}
              <Toolbar>
                <SearchInput value={userQuery} onChange={setUserQuery} placeholder="Search name, email or role…" label="Search users" />
                <Segmented label="Filter by role" value={userRole} onChange={setUserRole} options={[
                  { id: "all", label: "All", count: counts.all }, { id: "Player", label: "Players", count: counts.Player },
                  { id: "Turf Owner", label: "Owners", count: counts["Turf Owner"] }, { id: "Admin", label: "Admins", count: counts.Admin },
                ]} />
              </Toolbar>
              {loading ? (
                <div style={{ ...panel(), borderRadius: 16, overflow: "hidden" }}>{[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={5} />)}</div>
              ) : (
                <DataTable columns={columns} rows={rows} sort={userSort} onSort={toggleSort(setUserSort)} minWidth={700} empty={userQuery || userRole !== "all" ? "No users match your filters." : "No users yet."} />
              )}
            </>
          );
        })()}

        {tab === "disputes" && (() => {
          const shown = disputeFilter === "all" ? disputes : disputes.filter((d) => d.status === disputeFilter);
          return (
            <>
              <TopBar title="Disputes & Refunds" sub={`${openDisputes.length} open · ${disputes.length} total · average resolution ${formatHours(view.avgResolve)}`} action={refreshButton} />
              <Toolbar>
                <Segmented label="Filter disputes" value={disputeFilter} onChange={setDisputeFilter} options={[
                  { id: "open", label: "Open", count: openDisputes.length },
                  { id: "resolved", label: "Resolved", count: disputes.length - openDisputes.length },
                  { id: "all", label: "All", count: disputes.length },
                ]} />
              </Toolbar>
              {loading ? (
                <div style={{ display: "grid", gap: 14 }}>{[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}</div>
              ) : shown.length === 0 ? (
                <EmptyBlock emoji="✅" title={disputeFilter === "open" ? "No open disputes" : "No disputes here"} subtitle="Refund and dispute tickets raised by players will show up here." />
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {shown.map((d) => (
                    <Card key={d.dbId} pad={18}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 220, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{ color: V.chalkFaint, fontFamily: mono, fontSize: 12 }}>{d.id}</span>
                            <StatusPill status={d.status} />
                            <span style={{ color: V.chalkFaint, fontSize: 11.5 }}>{relativeTime(d.createdAt)}</span>
                          </div>
                          <div style={{ color: V.chalk, fontWeight: 700, fontSize: 15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{d.issue}</div>
                          <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 3 }}>{d.user} · {d.turf} · <span style={{ fontFamily: mono }}>{formatINR(d.amount)}</span></div>
                        </div>
                        <Btn variant={d.status === "open" ? "primary" : "secondary"} onClick={() => setReviewDispute(d)}>{d.status === "open" ? "Review" : "View details"}</Btn>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </main>

      {rejecting && (
        <ConfirmModal
          title={`Reject "${rejecting.name}"?`}
          message="The listing will be marked as rejected and the owner will be notified. This can't be undone from the dashboard."
          confirmLabel="Reject turf" busy={busyTurfId === rejecting.id}
          onConfirm={() => decideTurf(rejecting, "reject")} onClose={() => setRejecting(null)}
        />
      )}

      {reviewDispute && (() => {
        const d = reviewDispute;
        const live = disputes.find((x) => x.dbId === d.dbId) || d;
        const open = live.status === "open";
        return (
          <Modal
            title={`Dispute ${live.id}`} subtitle={`${live.user} · ${live.turf}`} onClose={() => setReviewDispute(null)}
            footer={open ? (
              <>
                <Btn disabled={busyDispute} onClick={() => resolveDispute(live, "dismiss")}>Resolve without refund</Btn>
                <Btn variant="primary" busy={busyDispute} onClick={() => resolveDispute(live, "refund")}>Approve refund {formatINR(live.amount)}</Btn>
              </>
            ) : <Btn onClick={() => setReviewDispute(null)}>Close</Btn>}
          >
            <div style={{ background: V.pitchCardRaised, border: `1px solid ${V.line}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Player's report</div>
              <div style={{ color: V.chalk, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{live.issue}</div>
            </div>
            <DetailRows rows={[
              { label: "Status", value: <StatusPill status={live.status} /> },
              { label: "Raised", value: `${relativeTime(live.createdAt)} · ${new Date(live.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` },
              { label: "Booking", value: live.booking ? `${formatDayLabel(live.booking.booking_date, today)}, ${formatTime12(live.booking.start_time)} · ${live.booking.sport}` : undefined },
              { label: "Booking value", value: live.booking ? formatINR(live.booking.price) : undefined },
              { label: "Refund requested", value: formatINR(live.amount) },
              { label: "Resolved", value: live.resolvedAt ? new Date(live.resolvedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : undefined },
            ]} />
            {open && (
              <p style={{ color: V.chalkFaint, fontSize: 12, lineHeight: 1.5, margin: "18px 0 0" }}>
                Checkout is still a demo flow, so approving marks the ticket resolved and notifies the player — no payment is moved.
              </p>
            )}
          </Modal>
        );
      })()}

      {showInvite && (
        <Modal title="Invite a turf owner" subtitle="They'll get an email to set their password and land in the owner portal." onClose={() => setShowInvite(false)} maxWidth={460}>
          <form onSubmit={handleInvite} style={{ display: "grid", gap: 14 }}>
            <label>
              <span style={labelStyle}>Full name</span>
              <input required autoFocus value={invite.name} onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))} autoComplete="name" style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Email</span>
              <input required type="email" value={invite.email} onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} autoComplete="email" style={inputStyle} />
            </label>
            {inviteError && <p role="alert" style={{ color: V.danger, fontSize: 12.5, margin: 0 }}>{inviteError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn onClick={() => setShowInvite(false)} disabled={inviting}>Cancel</Btn>
              <Btn variant="primary" busy={inviting} type="submit">{inviting ? "Sending…" : "Send invitation"}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ overview
function OverviewTab({ profile, view, loading, range, setRange, refreshButton, goTo }) {
  const { month, pendingTurfs, openDisputes, userCounts, series, turfs, cityList, bookingRows, liveTurfs, avgResolve } = view;
  const topTurfs = [...turfs].sort((a, b) => b.revenue - a.revenue).filter((t) => t.revenue > 0).slice(0, 5)
    .map((t) => ({ key: t.id, label: t.name, sub: t.city, value: t.revenue }));
  const recent = bookingRows.slice(0, 6);
  const today = dateKey();

  return (
    <>
      <TopBar title={`Welcome, ${profile?.full_name || "Admin"}`} sub="Platform overview across all cities" action={refreshButton} />

      {loading ? (
        <StatGrid>{[...Array(5)].map((_, i) => <SkeletonCard key={i} lines={1} />)}</StatGrid>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
            {pendingTurfs.length > 0 && (
              <AttentionItem icon="building" tone={V.pending} title={`${pendingTurfs.length} turf${pendingTurfs.length === 1 ? "" : "s"} waiting for approval`}
                subtitle="Owners can't take bookings until you review their listing."
                action={<Btn variant="primary" size="sm" onClick={() => goTo("approvals")}>Review</Btn>} />
            )}
            {openDisputes.length > 0 && (
              <AttentionItem icon="alert" tone={V.danger} title={`${openDisputes.length} open dispute${openDisputes.length === 1 ? "" : "s"}`}
                subtitle={`Oldest raised ${relativeTime(openDisputes[openDisputes.length - 1].createdAt)}.`}
                action={<Btn variant="primary" size="sm" onClick={() => goTo("disputes")}>Resolve</Btn>} />
            )}
            {pendingTurfs.length === 0 && openDisputes.length === 0 && (
              <AttentionItem icon="check" tone={V.confirmed} title="You're all caught up" subtitle="No approvals or disputes need attention right now." />
            )}
          </div>

          <StatGrid>
            <StatCard label="Revenue this month" value={formatCompactINR(month.revenue)} icon="rupee" color={V.sky} delta={month.revenueChange} sub="Confirmed + completed bookings" />
            <StatCard label="Bookings this month" value={month.count.toLocaleString("en-IN")} icon="calendar" color={V.aqua} delta={month.countChange} sub="Played so far" />
            <StatCard label="Live turfs" value={liveTurfs} icon="building" color={V.confirmed} sub={`${pendingTurfs.length} pending approval`} />
            <StatCard label="Total users" value={userCounts.all.toLocaleString("en-IN")} icon="users" color={V.pending} sub={`${userCounts.Player} players · ${userCounts["Turf Owner"]} owners`} />
            <StatCard label="Open disputes" value={openDisputes.length} icon="alert" color={V.danger} sub={avgResolve === null ? "None resolved yet" : `Avg. resolution ${formatHours(avgResolve)}`} />
          </StatGrid>
        </>
      )}

      <div className="vt-two-col">
        <Card>
          <SectionTitle action={
            <Segmented label="Chart range" value={range} onChange={setRange} options={[{ id: 7, label: "7d" }, { id: 30, label: "30d" }, { id: 90, label: "90d" }]} />
          }>Revenue</SectionTitle>
          {loading ? <SkeletonCard lines={3} /> : (
            <BarChart data={seriesToBars(series, range)} formatValue={formatINR} ariaLabel={`Daily revenue for the last ${range} days`} />
          )}
        </Card>
        <Card>
          <SectionTitle>Top turfs by revenue</SectionTitle>
          {loading ? <SkeletonCard lines={3} /> : <BarList items={topTurfs} formatValue={formatCompactINR} empty="Revenue will rank here once bookings are confirmed." />}
        </Card>
      </div>

      <div className="vt-even-col">
        <Card>
          <SectionTitle>Revenue by city</SectionTitle>
          {loading ? <SkeletonCard lines={3} /> : <BarList items={cityList.slice(0, 6)} color={V.sky} formatValue={formatCompactINR} empty="City breakdown appears once turfs are listed." />}
        </Card>
        <Card>
          <SectionTitle action={<Btn variant="ghost" size="sm" onClick={() => goTo("bookings")}>View all</Btn>}>Latest bookings</SectionTitle>
          {loading ? <SkeletonCard lines={3} /> : recent.length === 0 ? (
            <div style={{ color: V.chalkFaint, fontSize: 13 }}>No bookings yet.</div>
          ) : (
            <div style={{ display: "grid" }}>
              {recent.map((b, i) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < recent.length - 1 ? `1px solid ${V.line}` : "none" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.player} · {b.turf}</div>
                    <div style={{ color: V.chalkFaint, fontSize: 12 }}>{formatDayLabel(b.date, today)}, {formatTime12(b.time)} · {b.sport}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 12.5, color: V.chalk }}>{formatINR(b.amount)}</span>
                    <StatusPill status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
