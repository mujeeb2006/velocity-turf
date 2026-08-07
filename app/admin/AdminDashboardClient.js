"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COLORS = {
  electricBlue: "#0EA5E9",
  pitchGreen: "#22C55E",
  energyOrange: "#F97316",
  danger: "#EF4444",
  purple: "#A855F7",
  dark: "#050A14",
};

const glass = (extra = {}) => ({
  background: "rgba(13, 21, 38, 0.75)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(14,165,233,0.15)",
  ...extra,
});

const font = "'Exo 2', sans-serif";
const mono = "'Space Mono', monospace";

const Icon = ({ name, size = 18, color = "currentColor" }) => {
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {paths[name]}
    </svg>
  );
};

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ ...glass(), borderRadius: 18, padding: "18px 20px" }}>
      <div style={{ background: color + "18", borderRadius: 10, padding: 8, display: "inline-flex", marginBottom: 12 }}>
        <Icon name={icon} size={17} color={color} />
      </div>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, fontFamily: mono }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>{label}</div>
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

function SideNav({ items, active, onSelect, roleLabel, roleColor, userEmail, onSignOut }) {
  return (
    <div style={{ width: 232, flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0, ...glass({ background: "rgba(5,10,20,0.9)" }), borderRight: "1px solid rgba(14,165,233,0.1)", borderRadius: 0, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <span style={{ fontWeight: 900, fontSize: 17, fontFamily: font }}>
          <span style={{ color: "#fff" }}>VELOCITY</span> <span style={{ color: COLORS.electricBlue }}>TURF</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: roleColor + "12", border: `1px solid ${roleColor}30`, borderRadius: 12, padding: "8px 12px", marginBottom: 8 }}>
        <Icon name="shield" size={15} color={roleColor} />
        <span style={{ color: roleColor, fontSize: 12, fontWeight: 700, fontFamily: mono }}>{roleLabel}</span>
      </div>
      {userEmail && (
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11.5, padding: "0 4px", marginBottom: 20, wordBreak: "break-all" }}>{userEmail}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onSelect(it.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
            background: active === it.id ? "rgba(14,165,233,0.12)" : "transparent",
            border: active === it.id ? "1px solid rgba(14,165,233,0.25)" : "1px solid transparent",
            color: active === it.id ? "#fff" : "rgba(255,255,255,0.5)",
            cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: font, textAlign: "left",
          }}>
            <Icon name={it.icon} size={16} color={active === it.id ? COLORS.electricBlue : "rgba(255,255,255,0.4)"} />
            {it.label}
            {it.badge ? <span style={{ marginLeft: "auto", background: COLORS.energyOrange, color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{it.badge}</span> : null}
          </button>
        ))}
      </div>

      <button onClick={onSignOut} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: font,
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
        <h1 style={{ color: "#fff", fontFamily: font, fontSize: 26, fontWeight: 800, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: "rgba(255,255,255,0.4)", margin: "4px 0 0", fontSize: 13.5 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Mock data (swap for real Supabase queries once turfs/bookings tables exist) ----
const PENDING_TURFS = [
  { id: 1, name: "Skyline Sports Arena", owner: "Ramesh Gupta", city: "Pune", submitted: "2 days ago", docs: 4 },
  { id: 2, name: "GreenTurf Kondapur", owner: "Anitha Rao", city: "Hyderabad", submitted: "5 hours ago", docs: 3 },
];
const ALL_TURFS_ADMIN = [
  { id: 1, name: "Arena Nova", owner: "Vikram Singh", city: "Noida", status: "live", revenue: 494400, rating: 4.9 },
  { id: 2, name: "Zen Court", owner: "Meera Iyer", city: "Bengaluru", status: "live", revenue: 214400, rating: 4.7 },
  { id: 3, name: "Apex Field", owner: "Karan Mehta", city: "Mumbai", status: "flagged", revenue: 283500, rating: 4.8 },
  { id: 4, name: "Riverside Courts", owner: "Sana Sheikh", city: "Chennai", status: "paused", revenue: 91200, rating: 4.4 },
];
const USERS = [
  { id: 1, name: "Rahul M.", role: "Player", joined: "Jan 2026", bookings: 34, status: "active" },
  { id: 2, name: "Priya S.", role: "Player", joined: "Nov 2025", bookings: 29, status: "active" },
  { id: 3, name: "Vikram Singh", role: "Turf Owner", joined: "Aug 2025", bookings: 0, status: "active" },
  { id: 4, name: "D. Fernandes", role: "Player", joined: "Mar 2026", bookings: 3, status: "suspended" },
];
const DISPUTES = [
  { id: "TKT-2291", user: "Arjun K.", turf: "Apex Field", issue: "Charged after slot cancellation", amount: 1500, status: "open" },
  { id: "TKT-2287", user: "Sneha P.", turf: "Zen Court", issue: "Turf closed, no refund yet", amount: 800, status: "open" },
  { id: "TKT-2280", user: "Rahul M.", turf: "Arena Nova", issue: "Duplicate charge", amount: 1200, status: "resolved" },
];
const CITY_BREAKDOWN = [
  { city: "Bengaluru", turfs: 62, revenue: 1840000, growth: 12 },
  { city: "Mumbai", turfs: 54, revenue: 2210000, growth: 8 },
  { city: "Noida/Delhi NCR", turfs: 48, revenue: 1560000, growth: 18 },
  { city: "Hyderabad", turfs: 34, revenue: 980000, growth: 22 },
];

export default function AdminDashboardClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("overview");

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "approvals", label: "Turf Approvals", icon: "building", badge: PENDING_TURFS.length },
    { id: "turfs", label: "All Turfs", icon: "map" },
    { id: "users", label: "Users", icon: "users" },
    { id: "disputes", label: "Disputes & Refunds", icon: "alert", badge: DISPUTES.filter(d => d.status === "open").length },
  ];

  return (
    <div style={{ display: "flex" }}>
      <SideNav items={items} active={tab} onSelect={setTab} roleLabel="ADMIN CONSOLE" roleColor={COLORS.purple} userEmail={profile?.email} onSignOut={handleSignOut} />
      <div style={{ flex: 1, padding: "32px 36px" }}>
        {tab === "overview" && (
          <>
            <TopBar title={`Welcome, ${profile?.full_name || "Admin"}`} sub="Platform overview across all cities" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Gross Revenue (MTD)" value="₹68.4L" icon="rupee" color={COLORS.electricBlue} sub="+14% vs last month" />
              <StatCard label="Active Turfs" value="198" icon="building" color={COLORS.pitchGreen} sub="12 pending approval" />
              <StatCard label="Total Users" value="91,240" icon="users" color={COLORS.energyOrange} sub="+2,140 this week" />
              <StatCard label="Open Disputes" value={DISPUTES.filter(d => d.status === "open").length} icon="alert" color={COLORS.danger} sub="Avg resolve: 1.8 days" />
            </div>

            <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 14px" }}>Revenue by City</h3>
            <div style={{ ...glass(), borderRadius: 18, padding: 8, marginBottom: 32 }}>
              {CITY_BREAKDOWN.map((c, i) => (
                <div key={c.city} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 1fr 0.6fr", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < CITY_BREAKDOWN.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{c.city}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12.5 }}>{c.turfs} turfs</span>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (c.revenue / 2210000) * 100)}%`, background: `linear-gradient(90deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, borderRadius: 3 }} />
                  </div>
                  <span style={{ color: COLORS.pitchGreen, fontFamily: mono, fontSize: 12.5, fontWeight: 700 }}>+{c.growth}%</span>
                </div>
              ))}
            </div>

            <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 14px" }}>Recent Disputes</h3>
            <div style={{ ...glass(), borderRadius: 18, padding: 8 }}>
              {DISPUTES.slice(0, 3).map((d, i) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{d.issue}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{d.user} · {d.turf} · {d.id}</div>
                  </div>
                  <Pill color={d.status === "open" ? COLORS.energyOrange : COLORS.pitchGreen}>{d.status === "open" ? "Open" : "Resolved"}</Pill>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "approvals" && (
          <>
            <TopBar title="Turf Approvals" sub={`${PENDING_TURFS.length} listings awaiting review`} />
            <div style={{ display: "grid", gap: 14 }}>
              {PENDING_TURFS.map(t => (
                <div key={t.id} style={{ ...glass(), borderRadius: 18, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: font }}>{t.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>Owner: {t.owner} · {t.city} · Submitted {t.submitted}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 4 }}>{t.docs} documents uploaded</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: COLORS.danger, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="x" size={14} /> Reject
                    </button>
                    <button style={{ background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, border: "none", color: "#fff", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="check" size={14} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "turfs" && (
          <>
            <TopBar title="All Turfs" sub={`${ALL_TURFS_ADMIN.length} listings on the platform`} />
            <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr 1fr 0.8fr", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Turf", "Owner", "City", "Status", "Revenue", "Rating"].map(h => (
                  <span key={h} style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>
                ))}
              </div>
              {ALL_TURFS_ADMIN.map((t, i) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: i < ALL_TURFS_ADMIN.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{t.owner}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{t.city}</span>
                  <Pill color={t.status === "live" ? COLORS.pitchGreen : t.status === "flagged" ? COLORS.danger : COLORS.energyOrange}>{t.status}</Pill>
                  <span style={{ color: "#fff", fontFamily: mono, fontSize: 13, fontWeight: 700 }}>₹{t.revenue.toLocaleString()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="star" size={13} color="#FBBF24" />
                    <span style={{ color: "#FBBF24", fontSize: 13, fontWeight: 700 }}>{t.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "users" && (
          <>
            <TopBar title="Users" sub={`${USERS.length.toLocaleString()} accounts shown`} action={
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 14px" }}>
                <Icon name="search" size={14} color="rgba(255,255,255,0.4)" />
                <input placeholder="Search users..." style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 13, fontFamily: font }} />
              </div>
            } />
            <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Name", "Role", "Joined", "Bookings", "Status"].map(h => (
                  <span key={h} style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>
                ))}
              </div>
              {USERS.map((u, i) => (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: i < USERS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{u.role}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{u.joined}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: mono }}>{u.bookings}</span>
                  <Pill color={u.status === "active" ? COLORS.pitchGreen : COLORS.danger}>{u.status}</Pill>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "disputes" && (
          <>
            <TopBar title="Disputes & Refunds" sub={`${DISPUTES.filter(d => d.status === "open").length} open · ${DISPUTES.length} total`} />
            <div style={{ display: "grid", gap: 14 }}>
              {DISPUTES.map(d => (
                <div key={d.id} style={{ ...glass(), borderRadius: 18, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: mono, fontSize: 12 }}>{d.id}</span>
                      <Pill color={d.status === "open" ? COLORS.energyOrange : COLORS.pitchGreen}>{d.status}</Pill>
                    </div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{d.issue}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2 }}>{d.user} · {d.turf} · ₹{d.amount}</div>
                  </div>
                  {d.status === "open" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>
                        View Details
                      </button>
                      <button style={{ background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, border: "none", color: "#fff", borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>
                        Issue Refund
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
