"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import { EmptyBlock, Card, Pill } from "@/components/dashboard/kit";
import { Check, CheckCircle, Clock, AlertTriangle, Shield, Gift, RefreshCw, Users, Wallet, ArrowRight, X } from "@/components/ui/icons";
import { extractErrorMessage } from "@/lib/api-response";

export function AdminRewardsSection({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("settings"); // "settings" | "referrals" | "wallets" | "ledger"
  const [data, setData] = useState({
    settings: null,
    referrals: [],
    wallets: [],
    transactions: [],
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Adjust Modal
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Filter/search
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rewards");
      const d = await res.json();
      if (res.ok) {
        setData(d);
        setSettingsForm(d.settings);
      } else {
        showToast(extractErrorMessage(d, "Could not load rewards administration data."), { type: "error" });
      }
    } catch {
      showToast("Could not load rewards administration data.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const resData = await res.json();
      if (res.ok) {
        showToast("Reward and referral settings updated successfully.", { type: "success" });
        setData((prev) => ({ ...prev, settings: resData.settings }));
        setSettingsForm(resData.settings);
      } else {
        showToast(extractErrorMessage(resData, "Failed to update settings."), { type: "error" });
      }
    } catch {
      showToast("Network error. Please try again.", { type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModalUser || adjustSubmitting) return;

    const delta = parseInt(adjustPoints, 10);
    if (!delta || delta === 0) {
      showToast("Points adjustment cannot be zero.", { type: "error" });
      return;
    }
    if (!adjustReason.trim()) {
      showToast("Reason is required for manual adjustment.", { type: "error" });
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/admin/rewards/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustModalUser.user_id || adjustModalUser.id,
          pointsDelta: delta,
          reason: adjustReason.trim(),
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        showToast(`Successfully adjusted ${delta > 0 ? `+${delta}` : delta} points.`, { type: "success" });
        setAdjustModalUser(null);
        setAdjustPoints("");
        setAdjustReason("");
        fetchData();
      } else {
        showToast(extractErrorMessage(resData, "Failed to adjust points."), { type: "error" });
      }
    } catch {
      showToast("Network error. Please try again.", { type: "error" });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const filteredWallets = (data.wallets || []).filter((w) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = w.profile?.full_name?.toLowerCase() || "";
    const email = w.profile?.email?.toLowerCase() || "";
    const code = w.profile?.referral_code?.toLowerCase() || "";
    return name.includes(q) || email.includes(q) || code.includes(q);
  });

  const filteredReferrals = (data.referrals || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const refName = r.referrer?.full_name?.toLowerCase() || "";
    const user = r.referred?.full_name?.toLowerCase() || "";
    const code = r.referral_code?.toLowerCase() || "";
    return refName.includes(q) || user.includes(q) || code.includes(q);
  });

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* Top Banner & Sub-Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 8, padding: "3px 10px", marginBottom: 6 }}>
            <Gift size={13} color={V.flood} />
            <span style={{ color: V.flood, fontSize: 11.5, fontWeight: 700 }}>REWARDS ARCHITECTURE</span>
          </div>
          <h2 style={{ color: V.chalk, fontSize: 26, margin: 0, fontWeight: 700 }}>
            Referral & Rewards Management
          </h2>
          <p style={{ color: V.chalkDim, fontSize: 13, margin: "4px 0 0" }}>
            Configure conversion rates, manage referral limits, inspect wallets, and audit transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          style={buttonStyle("secondary", "sm", loading)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </span>
        </button>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${V.line}`, paddingBottom: 12, marginBottom: 24, overflowX: "auto" }}>
        {[
          { id: "settings", label: "Reward Rules & Rates", count: null },
          { id: "referrals", label: "Referrals Directory", count: data.referrals?.length },
          { id: "wallets", label: "Player Wallets", count: data.wallets?.length },
          { id: "ledger", label: "Audit Ledger", count: data.transactions?.length },
        ].map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setSubTab(tab.id); setSearchQuery(""); }}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background: active ? V.pitchCard : "transparent",
                border: `1.5px solid ${active ? V.lineStrong : "transparent"}`,
                color: active ? V.chalk : V.chalkDim,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: active ? V.floodDim : "rgba(255,255,255,0.06)",
                  color: active ? V.flood : V.chalkFaint,
                  fontWeight: 800,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content based on sub-tab */}
      {subTab === "settings" && settingsForm && (
        <form onSubmit={handleSaveSettings} style={{ maxWidth: 860 }}>
          <Card style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ color: V.chalk, fontSize: 17, margin: "0 0 16px", fontWeight: 700 }}>
              1. Referral Economics & Limits
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Referrer Reward (Points credited on first booking)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.referrerRewardPoints}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referrerRewardPoints: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  Earned by the player who sent the referral.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Referred Welcome Reward (Points credited on first booking)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.referredWelcomePoints}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referredWelcomePoints: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  Earned by the invited friend after completing match 1.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Maximum Referrals Per Player (Hard Cap)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settingsForm.maxReferralsPerUser}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxReferralsPerUser: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  Default is 3. Prevents viral spam and abuse.
                </span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ color: V.chalk, fontSize: 17, margin: "0 0 16px", fontWeight: 700 }}>
              2. Point Conversion & Booking Cash Value
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Point-to-Rupee Ratio (₹ value per 1 point)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="10"
                  value={settingsForm.pointToRupeeRatio}
                  onChange={(e) => setSettingsForm({ ...settingsForm, pointToRupeeRatio: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.confirmed, marginTop: 4, display: "block", fontWeight: 700 }}>
                  Current rate: 100 points = ₹{(100 * (Number(settingsForm.pointToRupeeRatio) || 1)).toFixed(2)}
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Booking Cash Back Reward (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={settingsForm.bookingRewardPercentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bookingRewardPercentage: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  Percentage of booking price awarded as points on play.
                </span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ color: V.chalk, fontSize: 17, margin: "0 0 16px", fontWeight: 700 }}>
              3. Redemption Constraints & Free Slot Policy
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Minimum Points Required to Redeem
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settingsForm.minRedemptionPoints}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minRedemptionPoints: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  Players must have at least this balance to apply discounts.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Allow 100% Full-Slot Free Redemption?
                </label>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    id="fullSlotToggle"
                    checked={settingsForm.allowFullSlotRedemption}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allowFullSlotRedemption: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: V.flood }}
                  />
                  <label htmlFor="fullSlotToggle" style={{ color: V.chalk, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                    Enable ₹0 Free Slot Bookings with Points
                  </label>
                </div>
                <span style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 4, display: "block" }}>
                  When enabled, players with enough points can book a turf slot for ₹0.
                </span>
              </div>
            </div>
          </Card>

          <button
            type="submit"
            disabled={savingSettings}
            style={buttonStyle("primary", "lg", savingSettings)}
          >
            {savingSettings ? "Saving Settings…" : "Save Configuration"}
          </button>
        </form>
      )}

      {/* Referrals Directory */}
      {subTab === "referrals" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search by referrer, friend, or referral code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "10px 14px", width: "100%", maxWidth: 380, borderRadius: 10, background: V.pitch, border: `1px solid ${V.line}`, color: V.chalk, fontSize: 13 }}
            />
          </div>

          {filteredReferrals.length === 0 ? (
            <EmptyBlock title="No referrals found" subtitle="No player referrals match your current search query." icon="users" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px" }}>Referrer (Inviter)</th>
                    <th style={{ padding: "12px 14px" }}>Referred Friend</th>
                    <th style={{ padding: "12px 14px" }}>Code Used</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px" }}>Points Awarded</th>
                    <th style={{ padding: "12px 14px" }}>Registered Date</th>
                    <th style={{ padding: "12px 14px" }}>Completed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                      <td style={{ padding: "14px", color: V.chalk, fontWeight: 700 }}>
                        {r.referrer?.full_name || "Unknown"}
                        <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 400 }}>{r.referrer?.email}</div>
                      </td>
                      <td style={{ padding: "14px", color: V.chalk }}>
                        {r.referred?.full_name || "New Player"}
                        <div style={{ color: V.chalkFaint, fontSize: 11 }}>{r.referred?.email}</div>
                      </td>
                      <td style={{ padding: "14px", color: V.flood, fontFamily: "monospace", fontWeight: 700 }}>
                        {r.referral_code}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: r.status === "completed" ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: r.status === "completed" ? V.confirmed : V.pending,
                        }}>
                          {r.status === "completed" ? <Check size={11} strokeWidth={2.5} /> : <Clock size={11} />}
                          {r.status === "completed" ? "Completed" : "Awaiting Match 1"}
                        </span>
                      </td>
                      <td style={{ padding: "14px", color: V.chalk, fontWeight: 700 }}>
                        {r.status === "completed" ? (
                          <span style={{ color: V.confirmed }}>
                            +{r.referrer_points_awarded} / +{r.referred_points_awarded} pts
                          </span>
                        ) : (
                          <span style={{ color: V.chalkFaint }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px", color: V.chalkDim, fontSize: 12 }}>
                        {formatBookingDate(r.created_at?.slice(0, 10))}
                      </td>
                      <td style={{ padding: "14px", color: V.chalkDim, fontSize: 12 }}>
                        {r.completed_at ? formatBookingDate(r.completed_at?.slice(0, 10)) : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Player Wallets */}
      {subTab === "wallets" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search by player name, email, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "10px 14px", width: "100%", maxWidth: 380, borderRadius: 10, background: V.pitch, border: `1px solid ${V.line}`, color: V.chalk, fontSize: 13 }}
            />
          </div>

          {filteredWallets.length === 0 ? (
            <EmptyBlock title="No player wallets found" subtitle="No records match your search." icon="wallet" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px" }}>Player</th>
                    <th style={{ padding: "12px 14px" }}>Role</th>
                    <th style={{ padding: "12px 14px" }}>Referral Code</th>
                    <th style={{ padding: "12px 14px" }}>Available Points</th>
                    <th style={{ padding: "12px 14px" }}>INR Value</th>
                    <th style={{ padding: "12px 14px" }}>Lifetime Earned</th>
                    <th style={{ padding: "12px 14px" }}>Lifetime Redeemed</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.map((w) => {
                    const ratio = data.settings?.pointToRupeeRatio || 1;
                    const inr = Math.round(w.available_points * ratio * 100) / 100;
                    return (
                      <tr key={w.user_id} style={{ borderBottom: `1px solid ${V.line}` }}>
                        <td style={{ padding: "14px", color: V.chalk, fontWeight: 700 }}>
                          {w.profile?.full_name || "Player"}
                          <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 400 }}>{w.profile?.email}</div>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 11, background: "rgba(255,255,255,0.06)", color: V.chalkDim, textTransform: "capitalize" }}>
                            {w.profile?.role || "player"}
                          </span>
                        </td>
                        <td style={{ padding: "14px", color: V.flood, fontFamily: "monospace", fontWeight: 700 }}>
                          {w.profile?.referral_code || "—"}
                        </td>
                        <td style={{ padding: "14px", color: V.flood, fontWeight: 800, fontSize: 15 }}>
                          {w.available_points.toLocaleString()} pts
                        </td>
                        <td style={{ padding: "14px", color: V.confirmed, fontWeight: 700 }}>
                          {formatINR(inr)}
                        </td>
                        <td style={{ padding: "14px", color: V.chalk }}>
                          {w.lifetime_earned.toLocaleString()} pts
                        </td>
                        <td style={{ padding: "14px", color: V.chalkFaint }}>
                          {w.lifetime_redeemed.toLocaleString()} pts
                        </td>
                        <td style={{ padding: "14px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalUser(w);
                              setAdjustPoints("");
                              setAdjustReason("");
                            }}
                            style={buttonStyle("secondary", "sm")}
                          >
                            Adjust Points
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Ledger */}
      {subTab === "ledger" && (
        <div>
          {data.transactions?.length === 0 ? (
            <EmptyBlock title="No transactions recorded yet" subtitle="Reward transactions will be audited here." icon="fileText" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px" }}>Date & Time</th>
                    <th style={{ padding: "12px 14px" }}>Player</th>
                    <th style={{ padding: "12px 14px" }}>Type</th>
                    <th style={{ padding: "12px 14px" }}>Points Delta</th>
                    <th style={{ padding: "12px 14px" }}>Balance After</th>
                    <th style={{ padding: "12px 14px" }}>Description</th>
                    <th style={{ padding: "12px 14px" }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => {
                    const isCredit = tx.points > 0;
                    return (
                      <tr key={tx.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                        <td style={{ padding: "14px", color: V.chalkDim, fontSize: 12 }}>
                          {new Date(tx.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td style={{ padding: "14px", color: V.chalk, fontWeight: 700 }}>
                          {tx.profile?.full_name || "User"}
                          <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 400 }}>{tx.profile?.email}</div>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isCredit ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                            color: isCredit ? V.confirmed : V.danger,
                          }}>
                            {tx.type.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: isCredit ? V.confirmed : V.danger }}>
                          {isCredit ? `+${tx.points}` : tx.points} pts
                        </td>
                        <td style={{ padding: "14px", color: V.chalk, fontWeight: 700 }}>
                          {tx.balance_after} pts
                        </td>
                        <td style={{ padding: "14px", color: V.chalkDim, maxWidth: 300 }}>
                          {tx.description}
                        </td>
                        <td style={{ padding: "14px", color: V.chalkFaint, fontSize: 11, fontFamily: "monospace" }}>
                          {tx.reference_id ? tx.reference_id.slice(0, 10) + "…" : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Adjust Modal */}
      {adjustModalUser && (
        <div
          role="presentation"
          onClick={() => setAdjustModalUser(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ ...panel(true), width: "100%", maxWidth: 460, padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 id="adjust-modal-title" style={{ color: V.chalk, fontSize: 18, margin: 0, fontWeight: 700 }}>
                  Adjust Player Reward Points
                </h3>
                <p style={{ color: V.chalkDim, fontSize: 12.5, margin: "3px 0 0" }}>
                  {adjustModalUser.profile?.full_name} ({adjustModalUser.profile?.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                style={{ background: "transparent", border: 0, color: V.chalkFaint, cursor: "pointer", padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: V.pitch, padding: "12px 14px", borderRadius: 10, border: `1px solid ${V.line}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: V.chalkFaint }}>Current Balance</div>
              <div style={{ fontSize: 20, color: V.flood, fontWeight: 800 }}>
                {adjustModalUser.available_points} points
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Points Adjustment (positive to grant, negative to deduct)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100 or -50"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 14 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: V.chalkFaint, fontWeight: 700, marginBottom: 6 }}>
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="State the reason for this manual adjustment (e.g. Goodwill gesture, dispute resolution #123)..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13, resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  disabled={adjustSubmitting}
                  style={buttonStyle("secondary", "md", adjustSubmitting)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  style={buttonStyle("primary", "md", adjustSubmitting)}
                >
                  {adjustSubmitting ? "Applying…" : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

