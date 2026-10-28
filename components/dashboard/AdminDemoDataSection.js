// components/dashboard/AdminDemoDataSection.js
// Enterprise Demo Data Control Section for Admin Dashboard.
"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { Icon, Pill, font, mono, display } from "@/components/dashboard/kit";
import { extractErrorMessage } from "@/lib/api-response";

const CATEGORY_DEFINITIONS = [
  { id: "turfs", label: "Turfs & Venues", desc: "Bengaluru sports facilities, addresses, images, and prices" },
  { id: "users", label: "Owners & Players", desc: "Demo profiles with @demo.velocityturf.internal domain" },
  { id: "bookings", label: "Slots & Bookings", desc: "Today's, upcoming, and past completed revenue bookings" },
  { id: "matches", label: "Community Matches", desc: "Pickup games, skill levels, and open player slots" },
  { id: "teams", label: "Teams & Rosters", desc: "Bengaluru clubs, captains, and squad member rosters" },
  { id: "tournaments", label: "Tournaments & Fixtures", desc: "Championship cups, registrations, and round 1 fixtures" },
  { id: "packages", label: "Sports Passes", desc: "Multi-session passes and player redemption history" },
  { id: "reviews", label: "Reviews & Ratings", desc: "Authentic player feedback and 4-5 star venue ratings" },
  { id: "payouts", label: "Owner Payouts", desc: "Bi-weekly venue revenue payouts in paid/processing state" },
  { id: "disputes", label: "Disputes & Refunds", desc: "Customer service tickets with realistic resolution notes" },
  { id: "notifications", label: "Notifications", desc: "Smart booking reminders and match alerts" },
];

export function AdminDemoDataSection({ showToast, onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null); // 'generating' | 'resetting'
  const [counts, setCounts] = useState(null);
  const [size, setSize] = useState("medium");
  const [selectedCats, setSelectedCats] = useState(new Set(CATEGORY_DEFINITIONS.map((c) => c.id)));
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/demo-data");
      const data = await res.json();
      if (res.ok && data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load demo data counts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleCategory = (id) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCats(new Set(CATEGORY_DEFINITIONS.map((c) => c.id)));
  const clearAll = () => setSelectedCats(new Set());

  const handleGenerate = async (isRefresh = false) => {
    if (selectedCats.size === 0) {
      showToast?.("Please select at least one category to populate.", { type: "error" });
      return;
    }

    setBusyAction("generating");
    try {
      const res = await fetch("/api/admin/demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isRefresh ? "regenerate" : "generate",
          size,
          categories: Array.from(selectedCats),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate demo data.");

      setCounts(data.counts);
      showToast?.(
        isRefresh
          ? `Demo data refreshed successfully (${data.created?.turfs || 0} turfs, ${data.created?.bookings || 0} bookings).`
          : `Generated ${size} demo dataset successfully!`,
        { type: "success" }
      );
      onDataChanged?.();
    } catch (err) {
      showToast?.(extractErrorMessage(err), { type: "error" });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReset = async () => {
    setBusyAction("resetting");
    setConfirmResetOpen(false);
    try {
      const res = await fetch("/api/admin/demo-data", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset demo data.");

      setCounts(data.counts);
      showToast?.("Demo data reset successfully. Real production records were completely untouched.", { type: "success" });
      onDataChanged?.();
    } catch (err) {
      showToast?.(extractErrorMessage(err), { type: "error" });
    } finally {
      setBusyAction(null);
    }
  };

  const totalDemoRecords = counts
    ? Object.values(counts).reduce((sum, item) => sum + (item.demo || 0), 0)
    : 0;

  const totalRealRecords = counts
    ? Object.values(counts).reduce((sum, item) => sum + (item.real || 0), 0)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, fontFamily: display, color: V.chalk }}>
              Demo Data Management
            </h1>
            <Pill color={totalDemoRecords > 0 ? V.violet : V.chalkDim}>
              {totalDemoRecords > 0 ? `${totalDemoRecords} Demo Records Live` : "No Demo Data"}
            </Pill>
          </div>
          <p style={{ margin: "6px 0 0", color: V.chalkDim, fontSize: 13, fontFamily: font, maxWidth: 700 }}>
            Populate Velocity Turf with high-fidelity, realistic Bengaluru venues, time slots, owner revenue history, matches, and tournaments for product demonstrations and staging presentations.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => handleGenerate(totalDemoRecords > 0)}
            disabled={busyAction !== null}
            style={{
              ...buttonStyle,
              background: V.flood,
              color: "#000",
              fontWeight: 800,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: busyAction ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: busyAction ? 0.7 : 1,
            }}
          >
            <Icon name="refresh" size={16} />
            {busyAction === "generating"
              ? "Generating Records..."
              : totalDemoRecords > 0
              ? "Regenerate / Refresh Data"
              : "Generate Demo Data"}
          </button>

          {totalDemoRecords > 0 && (
            <button
              onClick={() => setConfirmResetOpen(true)}
              disabled={busyAction !== null}
              style={{
                ...buttonStyle,
                background: "rgba(239, 68, 68, 0.12)",
                color: V.danger,
                border: `1px solid ${V.danger}40`,
                fontWeight: 700,
                padding: "10px 16px",
                borderRadius: 8,
                cursor: busyAction ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="x" size={16} />
              Reset Demo Data
            </button>
          )}
        </div>
      </div>

      {/* Safety & Isolation Notice */}
      <div
        style={{
          ...panel,
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(13, 148, 136, 0.05) 100%)",
          border: `1px solid ${V.violet}35`,
          padding: 16,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${V.violet}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="shield" size={20} color={V.violet} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: V.chalkDim, lineHeight: 1.5 }}>
          <strong style={{ color: V.chalk, display: "block" }}>Enterprise Real Data Protection Active</strong>
          All demo records are strictly tagged with <code style={{ color: V.flood, background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 }}>[DEMO]</code> and dedicated <code style={{ color: V.sky, background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 }}>@demo.velocityturf.internal</code> identity domains. Reset operations mathematically isolate and purge only demo items without modifying real users ({totalRealRecords} real records protected).
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {counts && Object.entries(counts).map(([category, stats]) => (
          <div
            key={category}
            style={{
              ...panel,
              padding: "14px 16px",
              borderRadius: 10,
              background: V.pitchLight,
              border: `1px solid ${stats.demo > 0 ? V.violet + "40" : V.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: V.chalkDim, letterSpacing: "0.05em" }}>
                {category}
              </span>
              {stats.demo > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 12,
                    background: `${V.violet}25`,
                    color: "#c084fc",
                    border: `1px solid ${V.violet}50`,
                  }}
                >
                  DEMO ACTIVE
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 900, fontFamily: mono, color: V.chalk }}>
                {stats.total}
              </span>
              <span style={{ fontSize: 11, color: V.chalkDim }}>total</span>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, fontFamily: mono }}>
              <span style={{ color: "#c084fc" }}>{stats.demo} demo</span>
              <span style={{ color: V.chalkFaint }}>•</span>
              <span style={{ color: V.confirmed }}>{stats.real} real</span>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
        {/* Sizing Selector */}
        <div style={{ ...panel, padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: V.chalk }}>
              1. Choose Dataset Density
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: V.chalkDim }}>
              Select the volume of records according to your demo scope.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                id: "small",
                title: "Small (Compact Demo)",
                desc: "8 Turfs, 3 Owners, 6 Players, ~16 Bookings, 2 Matches",
                detail: "Fastest generation, ideal for quick UI checks and mobile tests.",
              },
              {
                id: "medium",
                title: "Medium (Recommended)",
                desc: "14 Turfs, 4 Owners, 8 Players, ~32 Bookings, 4 Matches, 2 Tournaments",
                detail: "Optimal balance of realistic calendar occupancy and rich analytics charts.",
              },
              {
                id: "large",
                title: "Large (Comprehensive)",
                desc: "18 Turfs, 5 Owners, 12 Players, ~54 Bookings, 5 Matches, 3 Tournaments",
                detail: "High-density stress testing for search filters, maps, and leaderboard rankings.",
              },
            ].map((opt) => {
              const selected = size === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSize(opt.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: selected ? "rgba(0, 245, 160, 0.06)" : V.pitchLight,
                    border: `1.5px solid ${selected ? V.flood : V.border}`,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: selected ? V.flood : V.chalk }}>
                      {opt.title}
                    </span>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: `2px solid ${selected ? V.flood : V.chalkDim}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: V.flood }} />}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 4, fontFamily: mono }}>
                    {opt.desc}
                  </div>
                  <div style={{ fontSize: 11, color: V.chalkFaint, marginTop: 2 }}>
                    {opt.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Multi-Select */}
        <div style={{ ...panel, padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: V.chalk }}>
                2. Categories to Populate
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: V.chalkDim }}>
                Fine-tune which application sections receive demo content.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={selectAll}
                style={{ background: "transparent", border: "none", color: V.flood, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Select All
              </button>
              <span style={{ color: V.chalkFaint }}>|</span>
              <button
                onClick={clearAll}
                style={{ background: "transparent", border: "none", color: V.chalkDim, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {CATEGORY_DEFINITIONS.map((cat) => {
              const active = selectedCats.has(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: active ? "rgba(124, 58, 237, 0.08)" : V.pitchLight,
                    border: `1px solid ${active ? V.violet + "60" : V.border}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {}}
                    style={{ marginTop: 2, accentColor: V.violet, cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: active ? V.chalk : V.chalkDim }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 10, color: V.chalkFaint, marginTop: 2, lineHeight: 1.3 }}>
                      {cat.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Migration Status Card */}
      <div
        style={{
          ...panel,
          padding: 18,
          borderRadius: 12,
          border: `1px solid ${V.border}`,
          background: V.pitchLight,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: V.chalk, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Supabase Database Schema & Migration Status
          </h4>
          <Pill color={V.confirmed}>Verified Live</Pill>
        </div>
        <div style={{ fontSize: 12, color: V.chalkDim, lineHeight: 1.6 }}>
          • <strong>Live Applied Tables:</strong> <code style={{ color: V.chalk }}>profiles, turfs, bookings, blocked_slots, reviews, disputes, payouts, notifications, teams, team_members, tournaments, tournament_registrations, tournament_fixtures, packages, user_packages, package_redemptions</code>
          <br />
          • <strong>Pending Migration:</strong> <code style={{ color: V.pending }}>20261036_maintenance_staff_notifications.sql</code> (adds <code style={{ color: V.chalkDim }}>venue_staff, maintenance_tasks, maintenance_windows, staff_audit_log, notification_preferences</code>). Safe non-destructive deployment pending on remote Supabase CLI.
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              ...panel,
              maxWidth: 440,
              width: "90%",
              padding: 24,
              borderRadius: 14,
              border: `1px solid ${V.danger}60`,
              background: V.pitch,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon name="alert" size={24} color={V.danger} />
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: V.chalk }}>
                Confirm Demo Data Reset
              </h3>
            </div>
            <p style={{ fontSize: 13, color: V.chalkDim, lineHeight: 1.5, margin: "0 0 20px" }}>
              This will safely remove all records tagged with <code style={{ color: V.flood }}>[DEMO]</code> and accounts using <code style={{ color: V.sky }}>@demo.velocityturf.internal</code>.
              <br /><br />
              <strong style={{ color: V.confirmed }}>Your real users, live bookings, real venue listings, and transaction payouts will NOT be touched.</strong>
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setConfirmResetOpen(false)}
                style={{
                  ...buttonStyle,
                  background: V.pitchLight,
                  color: V.chalkDim,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: `1px solid ${V.border}`,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                style={{
                  ...buttonStyle,
                  background: V.danger,
                  color: "#fff",
                  fontWeight: 800,
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Yes, Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

