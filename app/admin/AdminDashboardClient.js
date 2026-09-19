"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { COLORS as V, FONT_DISPLAY, FONT_BODY, FONT_DATA, panel } from "@/lib/design-tokens";

// Old palette names aliased into the new design-tokens palette so every
// existing COLORS.electricBlue etc. call site picks up the "floodlit
// night match" identity without a full rewrite.
const COLORS = {
  electricBlue: V.flood,
  pitchGreen: V.confirmed,
  energyOrange: V.pending,
  danger: V.danger,
  purple: V.flood,
  dark: V.pitch,
};

const glass = (extra = {}) => ({ ...panel(), ...extra });

const font = FONT_BODY;
const fontDisplay = FONT_DISPLAY;
const mono = FONT_DATA;

const Icon = ({ name, size = 18, color = "currentColor", filled = false }) => {
  const paths = {
    grid: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M6 21V7a1 1 0 011-1h10a1 1 0 011 1v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    rupee: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10M7 8h10M7 4s1 5-3 5m3 4l7 7M7 12h6a3 3 0 000-6" />,
    alert: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></>,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    clock: <><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" /></>,
    star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    map: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" />,
    search: <><circle cx="11" cy="11" r="8" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" /></>,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
    notification: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {paths[name]}
    </svg>
  );
};

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ ...glass(), borderRadius: 18, padding: "18px 20px", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(212,255,79,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ background: color + "18", borderRadius: 10, padding: 8, display: "inline-flex", marginBottom: 12 }}>
        <Icon name={icon} size={17} color={color} />
      </div>
      <div style={{ color: V.chalk, fontWeight: 800, fontSize: 24, fontFamily: mono }}>{value}</div>
      <div style={{ color: V.chalkDim, fontSize: 12, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color, fontSize: 11, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}40` }}>
      {children}
    </span>
  );
}

function SideNav({ items, active, onSelect, roleLabel, roleColor, userEmail, onSignOut, unreadCount, onBell }) {
  return (
    <div style={{ width: 232, flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0, ...glass({ background: "rgba(7,13,10,0.92)" }), borderRight: `1px solid ${V.line}`, borderRadius: 0, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: V.flood, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 900, fontSize: 17, fontFamily: font }}>
            <span style={{ color: V.chalk }}>VELOCITY</span> <span style={{ color: COLORS.electricBlue }}>TURF</span>
          </span>
        </div>
        <button onClick={onBell} aria-label="Notifications" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <Icon name="notification" size={14} />
          {unreadCount > 0 && <span style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, borderRadius: "50%", background: V.flood }} />}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: roleColor + "12", border: `1px solid ${roleColor}30`, borderRadius: 12, padding: "8px 12px", marginBottom: 8 }}>
        <Icon name="shield" size={15} color={roleColor} />
        <span style={{ color: roleColor, fontSize: 12, fontWeight: 700, fontFamily: mono }}>{roleLabel}</span>
      </div>
      {userEmail && (
        <div style={{ color: V.chalkFaint, fontSize: 11.5, padding: "0 4px", marginBottom: 20, wordBreak: "break-all" }}>{userEmail}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onSelect(it.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
            background: active === it.id ? V.line : "transparent",
            border: active === it.id ? `1px solid ${V.flood}40` : "1px solid transparent",
            color: active === it.id ? V.chalk : V.chalkDim,
            cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: font, textAlign: "left",
          }}>
            <Icon name={it.icon} size={16} color={active === it.id ? COLORS.electricBlue : V.chalkDim} />
            {it.label}
            {it.badge ? <span style={{ marginLeft: "auto", background: COLORS.energyOrange, color: V.chalk, fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{it.badge}</span> : null}
          </button>
        ))}
      </div>

      <button onClick={onSignOut} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
        background: V.pitchCardRaised, border: `1px solid ${V.line}`,
        color: V.chalkDim, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: font,
      }}>
        <Icon name="logout" size={15} />
        Sign out
      </button>
    </div>
  );
}

function TopBar({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: V.chalk, fontFamily: font, fontSize: 26, fontWeight: 800, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: V.chalkDim, margin: "4px 0 0", fontSize: 13.5 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Mock data (swap for real Supabase queries once turfs/bookings tables exist) ----
export default function AdminDashboardClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState("overview");
  const [pendingTurfs, setPendingTurfs] = useState([]);
  const [allTurfs, setAllTurfs] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [cityBreakdown, setCityBreakdown] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, activeTurfs: 0, totalUsers: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  async function fetchNotifications() {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) setNotifications(data || []);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };
  const [loadedTabs, setLoadedTabs] = useState(() => new Set(["overview"]));

  async function fetchAll() {
    setDataLoading(true);
    const [turfsRes, usersRes, disputesRes, bookingsRes] = await Promise.all([
      supabase.from("turfs").select("*, owner:profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, role, created_at"),
      supabase.from("disputes").select("*, turf:turfs(name), player:profiles!disputes_raised_by_fkey(full_name)").order("created_at", { ascending: false }),
      supabase.from("bookings").select("turf_id, price, status, created_at"),
    ]);

    const turfs = turfsRes.data || [];
    const bookings = bookingsRes.data || [];

    // Revenue + booking counts per turf, for the "All Turfs" table and city rollup.
    const revenueByTurf = {};
    let grossRevenue = 0;
    const thisMonth = new Date().toISOString().slice(0, 7);
    bookings.forEach(b => {
      if (["confirmed", "completed"].includes(b.status)) {
        revenueByTurf[b.turf_id] = (revenueByTurf[b.turf_id] || 0) + Number(b.price);
        if ((b.created_at || "").slice(0, 7) === thisMonth) grossRevenue += Number(b.price);
      }
    });

    setPendingTurfs(turfs.filter(t => t.status === "pending").map(t => ({
      id: t.id, name: t.name, owner: t.owner?.full_name || "Unknown", city: t.city,
      submitted: new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      docs: t.doc_count || 0,
    })));

    setAllTurfs(turfs.map(t => ({
      id: t.id, name: t.name, owner: t.owner?.full_name || "Unknown", city: t.city,
      status: t.status, revenue: revenueByTurf[t.id] || 0, rating: t.rating || 0,
    })));

    // City rollup: turf count + revenue per city.
    const cityMap = {};
    turfs.forEach(t => {
      if (!cityMap[t.city]) cityMap[t.city] = { city: t.city, turfs: 0, revenue: 0 };
      cityMap[t.city].turfs += 1;
      cityMap[t.city].revenue += revenueByTurf[t.id] || 0;
    });
    setCityBreakdown(Object.values(cityMap).sort((a, b) => b.revenue - a.revenue));

    setUsers((usersRes.data || []).map(u => ({
      id: u.id, name: u.full_name || "—",
      role: u.role === "owner" ? "Turf Owner" : u.role === "admin" ? "Admin" : "Player",
      joined: new Date(u.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      status: "active",
    })));

    setDisputes((disputesRes.data || []).map(d => ({
      id: d.ticket_number, dbId: d.id, user: d.player?.full_name || "Unknown", turf: d.turf?.name || "Unknown",
      issue: d.issue, amount: Number(d.amount), status: d.status,
    })));

    setStats({
      revenue: grossRevenue,
      activeTurfs: turfs.filter(t => t.status === "live").length,
      totalUsers: (usersRes.data || []).length,
    });

    setDataLoading(false);
  }

  useEffect(() => {
    fetchAll();
    fetchNotifications();
    const channel = supabase
      .channel("admin-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "turfs" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile?.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (loadedTabs.has(tab)) return;
    const t = setTimeout(() => setLoadedTabs(prev => new Set(prev).add(tab)), 500);
    return () => clearTimeout(t);
  }, [tab, loadedTabs]);

  const isLoading = !loadedTabs.has(tab) || dataLoading;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const decideTurf = async (id, decision) => {
    const t = pendingTurfs.find(t => t.id === id);
    const { error } = await supabase.from("turfs")
      .update({ status: decision === "approve" ? "live" : "rejected", approved_at: decision === "approve" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      showToast("Couldn't update that turf. Try again.", { type: "error" });
      return;
    }
    if (t) {
      showToast(
        decision === "approve" ? `Approved "${t.name}" — now live on the platform` : `Rejected "${t.name}"`,
        { type: decision === "approve" ? "success" : "info" }
      );
    }
    fetchAll();
  };

  const issueRefund = async (dbId) => {
    const d = disputes.find(d => d.dbId === dbId);
    const { error } = await supabase.from("disputes")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", dbId);
    if (error) {
      showToast("Couldn't resolve that dispute. Try again.", { type: "error" });
      return;
    }
    if (d) showToast(`Refund issued for ${d.id} · ₹${d.amount}`, { type: "success" });
    fetchAll();
  };

  const openCount = disputes.filter(d => d.status === "open").length;

  const items = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "approvals", label: "Turf Approvals", icon: "building", badge: pendingTurfs.length || undefined },
    { id: "turfs", label: "All Turfs", icon: "map" },
    { id: "users", label: "Users", icon: "users" },
    { id: "disputes", label: "Disputes & Refunds", icon: "alert", badge: openCount || undefined },
  ];

  return (
    <div style={{ display: "flex", position: "relative" }}>
      <SideNav items={items} active={tab} onSelect={setTab} roleLabel="ADMIN CONSOLE" roleColor={COLORS.purple} userEmail={profile?.email} onSignOut={handleSignOut} unreadCount={unreadCount} onBell={toggleNotifications} />

      {showNotifications && (
        <>
          <div onClick={() => setShowNotifications(false)} style={{ position: "fixed", inset: 0, zIndex: 899 }} />
          <div style={{
            position: "fixed", top: 70, left: 16, width: "min(320px, calc(100vw - 32px))", maxHeight: 420, overflowY: "auto",
            background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)", zIndex: 1000,
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.line}`, fontWeight: 700, fontSize: 13, color: V.chalk, fontFamily: font }}>
              Notifications
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: V.chalkFaint, fontSize: 13, fontFamily: font }}>
                Nothing yet — new turf submissions and disputes will show up here.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${V.line}`, background: n.read ? "transparent" : V.floodDim }}>
                  <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13, fontFamily: font, marginBottom: 3 }}>{n.title}</div>
                  {n.body && <div style={{ color: V.chalkDim, fontSize: 12.5, fontFamily: font, lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ color: V.chalkFaint, fontSize: 10.5, marginTop: 4, fontFamily: font }}>
                    {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <div style={{ flex: 1, padding: "32px 36px" }}>
        {tab === "overview" && (
          <>
            <TopBar title={`Welcome, ${profile?.full_name || "Admin"}`} sub="Platform overview across all cities" />
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} lines={1} />)}
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Gross Revenue (Month)" value={`₹${stats.revenue.toLocaleString()}`} icon="rupee" color={COLORS.electricBlue} sub="From confirmed bookings" />
              <StatCard label="Active Turfs" value={stats.activeTurfs} icon="building" color={COLORS.pitchGreen} sub={`${pendingTurfs.length} pending approval`} />
              <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon="users" color={COLORS.energyOrange} sub="Players + owners" />
              <StatCard label="Open Disputes" value={openCount} icon="alert" color={COLORS.danger} sub="Avg resolve: 1.8 days" />
            </div>
            )}

            <h3 style={{ color: V.chalkDim, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 14px" }}>Revenue by City</h3>
            {isLoading ? (
              <div style={{ ...glass(), borderRadius: 18, overflow: "hidden", marginBottom: 32 }}>
                {[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={4} />)}
              </div>
            ) : cityBreakdown.length === 0 ? (
              <EmptyState icon="🏙️" title="No cities yet" subtitle="City breakdown appears once turfs are listed." accent={V.flood} />
            ) : (
            <div style={{ ...glass(), borderRadius: 18, padding: 8, marginBottom: 32 }}>
              {(() => {
                const maxRevenue = Math.max(1, ...cityBreakdown.map(c => c.revenue));
                return cityBreakdown.map((c, i) => (
                  <div key={c.city} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 1fr 0.9fr", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < cityBreakdown.length - 1 ? `1px solid ${V.line}` : "none", transition: "background 0.2s", borderRadius: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = V.pitchCardRaised}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: V.chalk, fontWeight: 600, fontSize: 14 }}>{c.city}</span>
                    <span style={{ color: V.chalkDim, fontSize: 12.5 }}>{c.turfs} turfs</span>
                    <div style={{ height: 6, background: V.line, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${Math.round((c.revenue / maxRevenue) * 100)}%`, background: V.flood, borderRadius: 3 }} />
                    </div>
                    <span style={{ color: V.chalk, fontFamily: mono, fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>₹{c.revenue.toLocaleString()}</span>
                  </div>
                ));
              })()}
            </div>
            )}

            <h3 style={{ color: V.chalkDim, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 14px" }}>Recent Disputes</h3>
            {isLoading ? (
              <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} columns={3} />)}
              </div>
            ) : disputes.length === 0 ? (
              <EmptyState icon="✅" title="No disputes on file" subtitle="Refund and dispute tickets will show up here." accent={COLORS.pitchGreen} />
            ) : (
            <div style={{ ...glass(), borderRadius: 18, padding: 8 }}>
              {disputes.slice(0, 3).map((d, i) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < Math.min(3, disputes.length) - 1 ? `1px solid ${V.line}` : "none", gap: 12, flexWrap: "wrap", transition: "background 0.2s", borderRadius: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = V.pitchCardRaised}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ color: V.chalk, fontWeight: 600, fontSize: 14 }}>{d.issue}</div>
                    <div style={{ color: V.chalkDim, fontSize: 12 }}>{d.user} · {d.turf} · {d.id}</div>
                  </div>
                  <Pill color={d.status === "open" ? COLORS.energyOrange : COLORS.pitchGreen}>{d.status === "open" ? "Open" : "Resolved"}</Pill>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "approvals" && (
          <>
            <TopBar title="Turf Approvals" sub={`${pendingTurfs.length} listings awaiting review`} />
            {isLoading ? (
              <div style={{ display: "grid", gap: 14 }}>
                {[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : pendingTurfs.length === 0 ? (
              <EmptyState icon="✅" title="No turfs awaiting review" subtitle="New owner submissions will appear here for approval." accent={COLORS.pitchGreen} />
            ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {pendingTurfs.map(t => (
                <div key={t.id} style={{ ...glass(), borderRadius: 18, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = V.lineStrong}
                  onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                >
                  <div>
                    <div style={{ color: V.chalk, fontWeight: 700, fontSize: 16, fontFamily: font }}>{t.name}</div>
                    <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 4 }}>Owner: {t.owner} · {t.city} · Submitted {t.submitted}</div>
                    <div style={{ color: V.chalkFaint, fontSize: 12, marginTop: 4 }}>{t.docs} documents uploaded</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => decideTurf(t.id, "reject")} style={{ background: "rgba(240,85,74,0.12)", border: "1px solid rgba(240,85,74,0.35)", color: COLORS.danger, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(240,85,74,0.22)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(240,85,74,0.12)"}
                    >
                      <Icon name="x" size={14} /> Reject
                    </button>
                    <button onClick={() => decideTurf(t.id, "approve")} style={{ background: V.flood, border: "none", color: V.pitch, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <Icon name="check" size={14} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "turfs" && (
          <>
            <TopBar title="All Turfs" sub={`${allTurfs.length} listings on the platform`} />
            {isLoading ? (
              <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
                {[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={6} />)}
              </div>
            ) : (
            <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr 1fr 0.8fr", padding: "12px 20px", borderBottom: `1px solid ${V.line}` }}>
                {["Turf", "Owner", "City", "Status", "Revenue", "Rating"].map(h => (
                  <span key={h} style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>
                ))}
              </div>
              {allTurfs.map((t, i) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: i < allTurfs.length - 1 ? `1px solid ${V.line}` : "none", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = V.pitchCardRaised}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: V.chalk, fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  <span style={{ color: V.chalkDim, fontSize: 13 }}>{t.owner}</span>
                  <span style={{ color: V.chalkDim, fontSize: 13 }}>{t.city}</span>
                  <Pill color={t.status === "live" ? COLORS.pitchGreen : t.status === "flagged" ? COLORS.danger : COLORS.energyOrange}>{t.status}</Pill>
                  <span style={{ color: V.chalk, fontFamily: mono, fontSize: 13, fontWeight: 700 }}>₹{t.revenue.toLocaleString()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="star" size={13} filled color={V.flood} />
                    <span style={{ color: V.flood, fontSize: 13, fontWeight: 700 }}>{t.rating}</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <TopBar title="Users" sub={`${users.length.toLocaleString()} accounts shown`} action={
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.pitchCardRaised, border: `1px solid ${V.line}`, borderRadius: 12, padding: "8px 14px" }}>
                <Icon name="search" size={14} color={V.chalkDim} />
                <input placeholder="Search users..." style={{ background: "none", border: "none", outline: "none", color: V.chalk, fontSize: 13, fontFamily: font }} />
              </div>
            } />
            {isLoading ? (
              <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
                {[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={5} />)}
              </div>
            ) : users.length === 0 ? (
              <EmptyState icon="🔍" title="No users found" subtitle="Try a different search term." />
            ) : (
            <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr", padding: "12px 20px", borderBottom: `1px solid ${V.line}` }}>
                {["Name", "Role", "Joined", "Bookings", "Status"].map(h => (
                  <span key={h} style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>
                ))}
              </div>
              {users.map((u, i) => (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: i < users.length - 1 ? `1px solid ${V.line}` : "none", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = V.pitchCardRaised}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: V.chalk, fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                  <span style={{ color: V.chalkDim, fontSize: 13 }}>{u.role}</span>
                  <span style={{ color: V.chalkDim, fontSize: 13 }}>{u.joined}</span>
                  <span style={{ color: V.chalkDim, fontSize: 13, fontFamily: mono }}>{u.bookings}</span>
                  <Pill color={u.status === "active" ? COLORS.pitchGreen : COLORS.danger}>{u.status}</Pill>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "disputes" && (
          <>
            <TopBar title="Disputes & Refunds" sub={`${openCount} open · ${disputes.length} total`} />
            {isLoading ? (
              <div style={{ display: "grid", gap: 14 }}>
                {[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : disputes.length === 0 ? (
              <EmptyState icon="✅" title="No disputes" subtitle="Refund and dispute tickets will show up here." accent={COLORS.pitchGreen} />
            ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {disputes.map(d => (
                <div key={d.id} style={{ ...glass(), borderRadius: 18, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = V.lineStrong}
                  onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ color: V.chalkFaint, fontFamily: mono, fontSize: 12 }}>{d.id}</span>
                      <Pill color={d.status === "open" ? COLORS.energyOrange : COLORS.pitchGreen}>{d.status}</Pill>
                    </div>
                    <div style={{ color: V.chalk, fontWeight: 700, fontSize: 15 }}>{d.issue}</div>
                    <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 2 }}>{d.user} · {d.turf} · ₹{d.amount}</div>
                  </div>
                  {d.status === "open" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => showToast(`Viewing details for ${d.id}`, { type: "info" })} style={{ background: V.pitchCardRaised, border: `1px solid ${V.line}`, color: V.chalkDim, borderRadius: 12, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = V.line}
                        onMouseLeave={e => e.currentTarget.style.background = V.line}
                      >
                        View Details
                      </button>
                      <button onClick={() => issueRefund(d.dbId)} style={{ background: V.flood, border: "none", color: V.pitch, borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, transition: "opacity 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                      >
                        Issue Refund
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
