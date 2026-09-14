"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { COLORS as V, FONT_DISPLAY, FONT_BODY, FONT_DATA, panel } from "@/lib/design-tokens";

// Old palette names kept as aliases into the new design-tokens palette so
// every existing `COLORS.electricBlue` etc. call site below picks up the
// "floodlit night match" identity without a full rewrite.
const COLORS = {
  electricBlue: V.flood,
  pitchGreen: V.confirmed,
  energyOrange: V.pending,
  danger: V.danger,
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
    rupee: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10M7 8h10M7 4s1 5-3 5m3 4l7 7M7 12h6a3 3 0 000-6" />,
    clock: <><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" /></>,
    star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    trending: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    wallet: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a1 1 0 100 2 1 1 0 000-2z" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" />,
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
      <div style={{ color: V.chalkFaint, fontSize: 12, marginTop: 4 }}>{label}</div>
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

function SideNav({ items, active, onSelect, userEmail, onSignOut }) {
  return (
    <div style={{ width: 232, flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0, ...glass({ background: "rgba(7,13,10,0.92)" }), borderRight: `1px solid ${V.line}`, borderRadius: 0, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: V.flood, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <span style={{ fontWeight: 900, fontSize: 17, fontFamily: font }}>
          <span style={{ color: V.chalk }}>VELOCITY</span> <span style={{ color: COLORS.electricBlue }}>TURF</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${COLORS.electricBlue}30`, borderRadius: 12, padding: "8px 12px", marginBottom: 8 }}>
        <Icon name="building" size={15} color={COLORS.electricBlue} />
        <span style={{ color: COLORS.electricBlue, fontSize: 12, fontWeight: 700, fontFamily: mono }}>OWNER PORTAL</span>
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
            <Icon name={it.icon} size={16} color={active === it.id ? COLORS.electricBlue : V.chalkFaint} />
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
        <h1 style={{ color: V.chalk, fontFamily: fontDisplay, fontSize: 32, fontWeight: 400, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: V.chalkFaint, margin: "4px 0 0", fontSize: 13.5, fontFamily: font }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Mock data (swap for real Supabase queries once turfs/bookings tables exist) ----
const OWNER_TURFS = [
  { id: 1, name: "Arena Nova", city: "Sector 18, Noida", status: "live", occupancy: 85, todayBookings: 6, revenue: 494400, rating: 4.9 },
  { id: 2, name: "Arena Nova 2 (Indoor)", city: "Sector 62, Noida", status: "live", occupancy: 52, todayBookings: 3, revenue: 156800, rating: 4.6 },
];
const INITIAL_REQUESTS = [
  { id: 1, turf: "Arena Nova", user: "Rahul M.", date: "Today", time: "6:00 PM", amount: 1440, note: "Football, 10 players" },
  { id: 2, turf: "Arena Nova 2 (Indoor)", user: "Priya S.", date: "Tomorrow", time: "8:00 AM", amount: 960, note: "Basketball, 6 players" },
];
const PAYOUTS = [
  { id: "PO-1042", period: "16–22 Jul 2026", amount: 48200, status: "paid" },
  { id: "PO-1035", period: "9–15 Jul 2026", amount: 41750, status: "paid" },
  { id: "PO-1028", period: "23–29 Jul 2026", amount: 52640, status: "processing" },
];
const OWNER_REVIEWS = [
  { user: "Rahul M.", turf: "Arena Nova", rating: 5, text: "Great lights, well maintained pitch." },
  { user: "Sneha P.", turf: "Arena Nova 2", rating: 4, text: "Good, but parking was full at peak time." },
];

export default function OwnerDashboardClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState("overview");
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [loadedTabs, setLoadedTabs] = useState(() => new Set(["overview"]));

  useEffect(() => {
    if (loadedTabs.has(tab)) return;
    const t = setTimeout(() => setLoadedTabs(prev => new Set(prev).add(tab)), 500);
    return () => clearTimeout(t);
  }, [tab, loadedTabs]);

  const isLoading = !loadedTabs.has(tab);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const respond = (id, action) => {
    const req = requests.find(r => r.id === id);
    setRequests(prev => prev.filter(r => r.id !== id));
    if (req) {
      showToast(
        action === "accept" ? `Accepted ${req.user}'s booking for ${req.turf}` : `Declined ${req.user}'s booking for ${req.turf}`,
        { type: action === "accept" ? "success" : "info" }
      );
    }
  };

  const items = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "turfs", label: "My Turfs", icon: "building" },
    { id: "requests", label: "Booking Requests", icon: "clock", badge: requests.length || undefined },
    { id: "payouts", label: "Payouts", icon: "wallet" },
    { id: "reviews", label: "Reviews", icon: "star" },
  ];
  const totalRevenue = OWNER_TURFS.reduce((s, t) => s + t.revenue, 0);

  return (
    <div style={{ display: "flex" }}>
      <SideNav items={items} active={tab} onSelect={setTab} userEmail={profile?.email} onSignOut={handleSignOut} />
      <div style={{ flex: 1, padding: "32px 36px" }}>
        {tab === "overview" && (
          <>
            <TopBar title={`Welcome back, ${profile?.full_name || "Owner"}`} sub="Here's how your turfs are doing" action={
              <button style={{ background: V.flood, border: "none", color: V.pitch, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                onClick={() => showToast("Add Turf flow is coming soon.", { type: "info" })}
              >
                <Icon name="plus" size={14} /> Add New Turf
              </button>
            } />
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} lines={1} />)}
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="rupee" color={COLORS.electricBlue} sub="Lifetime, all turfs" />
              <StatCard label="Today's Bookings" value={OWNER_TURFS.reduce((s, t) => s + t.todayBookings, 0)} icon="clock" color={COLORS.pitchGreen} />
              <StatCard label="Avg. Occupancy" value="69%" icon="trending" color={COLORS.energyOrange} />
              <StatCard label="Avg. Rating" value="4.8" icon="star" color={V.flood} />
            </div>
            )}

            <h3 style={{ color: V.chalkDim, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 14px" }}>Pending Requests</h3>
            {isLoading ? (
              <div style={{ display: "grid", gap: 12 }}>
                {[...Array(2)].map((_, i) => <SkeletonRow key={i} columns={3} />)}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState icon="✅" title="All caught up" subtitle="No pending booking requests right now." accent={COLORS.pitchGreen} />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requests.map(r => (
                  <div key={r.id} style={{ ...glass(), borderRadius: 16, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = V.line}
                    onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                  >
                    <div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14 }}>{r.user} · {r.turf}</div>
                      <div style={{ color: V.chalkDim, fontSize: 12.5 }}>{r.date}, {r.time} · {r.note} · ₹{r.amount}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => respond(r.id, "decline")} style={{ background: "rgba(240,85,74,0.12)", border: "1px solid rgba(240,85,74,0.35)", color: COLORS.danger, borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(240,85,74,0.22)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(240,85,74,0.12)"}
                      >Decline</button>
                      <button onClick={() => respond(r.id, "accept")} style={{ background: V.flood, border: "none", color: V.pitch, borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font, transition: "opacity 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                      >Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "turfs" && (
          <>
            <TopBar title="My Turfs" sub={`${OWNER_TURFS.length} listings`} />
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={3} />)}
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {OWNER_TURFS.map(t => (
                <div key={t.id} style={{ ...glass(), borderRadius: 18, padding: 20, transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(212,255,79,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 16, fontFamily: font }}>{t.name}</div>
                      <div style={{ color: V.chalkFaint, fontSize: 12.5, marginTop: 2 }}>{t.city}</div>
                    </div>
                    <Pill color={t.status === "live" ? COLORS.pitchGreen : COLORS.energyOrange}>{t.status}</Pill>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: V.chalkDim, fontSize: 12 }}>Occupancy</span>
                    <span style={{ color: COLORS.electricBlue, fontSize: 12, fontWeight: 700 }}>{t.occupancy}%</span>
                  </div>
                  <div style={{ height: 6, background: V.line, borderRadius: 3, marginBottom: 16 }}>
                    <div style={{ height: "100%", width: `${t.occupancy}%`, background: V.flood, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 10 }}>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>Today</div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14 }}>{t.todayBookings} bookings</div>
                    </div>
                    <div style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 10 }}>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>Revenue</div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14, fontFamily: mono }}>₹{t.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                  <button onClick={() => showToast(`Slot manager for ${t.name} is coming soon.`, { type: "info" })} style={{ marginTop: 14, width: "100%", padding: "10px", borderRadius: 12, background: V.line, border: `1px solid ${V.flood}4D`, color: V.flood, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = V.line}
                    onMouseLeave={e => e.currentTarget.style.background = V.line}
                  >
                    Manage Slots
                  </button>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "requests" && (
          <>
            <TopBar title="Booking Requests" sub={`${requests.length} awaiting response`} />
            {isLoading ? (
              <div style={{ display: "grid", gap: 12 }}>
                {[...Array(2)].map((_, i) => <SkeletonRow key={i} columns={3} />)}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState icon="📭" title="No pending requests" subtitle="New booking requests from players will show up here." accent={COLORS.pitchGreen} />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requests.map(r => (
                  <div key={r.id} style={{ ...glass(), borderRadius: 16, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = V.line}
                    onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                  >
                    <div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 14 }}>{r.user} · {r.turf}</div>
                      <div style={{ color: V.chalkDim, fontSize: 12.5 }}>{r.date}, {r.time} · {r.note} · ₹{r.amount}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => respond(r.id, "decline")} style={{ background: "rgba(240,85,74,0.12)", border: "1px solid rgba(240,85,74,0.35)", color: COLORS.danger, borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(240,85,74,0.22)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(240,85,74,0.12)"}
                      >Decline</button>
                      <button onClick={() => respond(r.id, "accept")} style={{ background: V.flood, border: "none", color: V.pitch, borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font, transition: "opacity 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                      >Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "payouts" && (
          <>
            <TopBar title="Payouts" sub="Weekly settlement to your linked bank account" />
            {isLoading ? (
              <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} columns={4} />)}
              </div>
            ) : (
            <div style={{ ...glass(), borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr", padding: "12px 20px", borderBottom: `1px solid ${V.line}` }}>
                {["Payout ID", "Period", "Amount", "Status"].map(h => (
                  <span key={h} style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</span>
                ))}
              </div>
              {PAYOUTS.map((p, i) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: i < PAYOUTS.length - 1 ? `1px solid ${V.line}` : "none", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = V.pitchCardRaised}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: V.chalkDim, fontFamily: mono, fontSize: 13 }}>{p.id}</span>
                  <span style={{ color: V.chalk, fontSize: 13.5 }}>{p.period}</span>
                  <span style={{ color: V.chalk, fontFamily: mono, fontWeight: 700, fontSize: 13.5 }}>₹{p.amount.toLocaleString()}</span>
                  <Pill color={p.status === "paid" ? COLORS.pitchGreen : COLORS.energyOrange}>{p.status}</Pill>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {tab === "reviews" && (
          <>
            <TopBar title="Reviews" sub="What players are saying about your turfs" />
            {isLoading ? (
              <div style={{ display: "grid", gap: 14 }}>
                {[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : OWNER_REVIEWS.length === 0 ? (
              <EmptyState icon="💬" title="No reviews yet" subtitle="Reviews from players will appear here after their first booking." />
            ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {OWNER_REVIEWS.map((r, i) => (
                <div key={i} style={{ ...glass(), borderRadius: 16, padding: 18, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = V.line}
                  onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: V.chalk, fontWeight: 700, fontSize: 14 }}>{r.user} <span style={{ color: V.chalkFaint, fontWeight: 400 }}>· {r.turf}</span></span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[...Array(5)].map((_, j) => <Icon key={j} name="star" size={13} filled={j < r.rating} color={j < r.rating ? V.flood : V.line} />)}
                    </div>
                  </div>
                  <p style={{ color: V.chalkDim, fontSize: 13.5, margin: 0 }}>{r.text}</p>
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
