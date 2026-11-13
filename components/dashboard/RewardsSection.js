"use client";

import { useState, useEffect, useMemo } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  Gift,
  Wallet,
  Clock,
  ArrowRight,
  RefreshCw,
  Info,
} from "@/components/ui/icons";

export function RewardsSection({ profile, showToast, onFindTurf }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all");

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/player/rewards");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        showToast(json?.error || "Could not load rewards.", { type: "error" });
      }
    } catch {
      showToast("Network error loading rewards.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [profile?.id]);

  const wallet = data?.wallet || {
    available_points: 0,
    pending_points: 0,
    lifetime_earned: 0,
    lifetime_redeemed: 0,
    equivalent_inr: 0,
  };

  const settings = data?.settings || {
    conversion_rate_points_per_inr: 1,
    referrer_reward_points: 100,
    referred_welcome_points: 50,
    booking_reward_percentage: 10,
    min_redemption_points: 100,
    max_discount_percentage: 100,
    full_slot_redemption_allowed: true,
  };

  const transactions = data?.transactions || [];

  const conversionRate = Number(settings.conversion_rate_points_per_inr || 1);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (historyFilter === "all") return transactions;
    if (historyFilter === "referrals") return transactions.filter((t) => t.type.includes("referral") || t.type.includes("welcome"));
    if (historyFilter === "bookings") return transactions.filter((t) => t.type === "booking_reward");
    if (historyFilter === "redemptions") return transactions.filter((t) => t.type === "redemption");
    if (historyFilter === "refunds") return transactions.filter((t) => t.type === "refund");
    return transactions;
  }, [transactions, historyFilter]);

  if (loading && !data) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: V.chalk, margin: "0 0 4px" }}>
            Rewards & Wallet
          </h1>
          <p style={{ fontSize: 14, color: V.chalkDim, margin: 0 }}>
            Earn points on every booking and redeem them for discounts.
          </p>
        </div>
        <button
          onClick={fetchRewards}
          disabled={loading}
          style={{
            ...buttonStyle("secondary", "sm"),
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={13} className={loading ? "vt-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ================================================================ */}
      {/* WALLET SUMMARY — compact 3-column grid                          */}
      {/* ================================================================ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        {/* Available Balance */}
        <div style={{
          ...panel(true),
          borderRadius: 16,
          padding: "22px 20px",
          background: `linear-gradient(135deg, ${V.pitchCard} 0%, rgba(24, 168, 224, 0.08) 100%)`,
          border: `1px solid ${V.flood}40`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Available Balance
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: V.chalk, letterSpacing: -1 }}>
              {wallet.available_points.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: V.flood }}>pts</span>
          </div>
          <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 6 }}>
            = ₹{wallet.equivalent_inr.toLocaleString()} value · {conversionRate} pt = ₹1
          </div>
        </div>

        {/* Lifetime Earned */}
        <div style={{ ...panel(), borderRadius: 16, padding: "22px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Lifetime Earned
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: V.chalk, marginTop: 6 }}>
            {wallet.lifetime_earned.toLocaleString()} <span style={{ fontSize: 13, color: V.chalkFaint }}>pts</span>
          </div>
          <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 6 }}>
            From bookings & referrals
          </div>
        </div>

        {/* Lifetime Redeemed */}
        <div style={{ ...panel(), borderRadius: 16, padding: "22px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Lifetime Redeemed
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: V.chalk, marginTop: 6 }}>
            {wallet.lifetime_redeemed.toLocaleString()} <span style={{ fontSize: 13, color: V.chalkFaint }}>pts</span>
          </div>
          <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 6 }}>
            Saved ₹{Math.floor(wallet.lifetime_redeemed / conversionRate).toLocaleString()}
          </div>
        </div>
      </div>

      {onFindTurf && wallet.available_points >= (settings.min_redemption_points || 100) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: "rgba(21, 128, 81, 0.08)", border: "1px solid rgba(21, 128, 81, 0.25)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 28,
        }}>
          <div style={{ fontSize: 13.5, color: V.chalk, fontWeight: 600 }}>
            <strong style={{ color: V.confirmed }}>You have redeemable points!</strong> Use them at checkout for instant discounts.
          </div>
          <button onClick={onFindTurf} style={{ ...buttonStyle("primary", "sm"), display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            Book a Turf <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* TRANSACTION HISTORY                                               */}
      {/* ================================================================ */}
      <div style={{
        ...panel(),
        borderRadius: 16,
        padding: "24px 22px",
        border: `1px solid ${V.lineStrong}`,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: V.flood, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              <Clock size={14} /> Transaction History
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: "4px 0 0" }}>
              Reward Points Ledger
            </h2>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All" },
              { id: "referrals", label: "Referrals" },
              { id: "bookings", label: "Bookings" },
              { id: "redemptions", label: "Redemptions" },
              { id: "refunds", label: "Refunds" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHistoryFilter(f.id)}
                style={{
                  background: historyFilter === f.id ? V.flood : "transparent",
                  color: historyFilter === f.id ? "#fff" : V.chalkDim,
                  border: `1px solid ${historyFilter === f.id ? V.flood : V.line}`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon="gift"
            title="No reward transactions yet"
            subtitle="Book games or share your referral code to start earning!"
            accent={V.flood}
          />
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {filteredTransactions.map((tx) => {
              const isPositive = Number(tx.amount) > 0;
              const formattedDate = tx.created_at
                ? new Date(tx.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "—";

              return (
                <div
                  key={tx.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: V.pitchCard, borderRadius: 10,
                    border: `1px solid ${V.line}`, gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isPositive ? "rgba(21, 128, 81, 0.12)" : "rgba(220, 38, 38, 0.12)",
                      color: isPositive ? V.confirmed : "#EF4444",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isPositive ? <Gift size={14} /> : <Wallet size={14} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: V.chalk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description || tx.type.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 11, color: V.chalkFaint, marginTop: 1 }}>
                        {formattedDate} · <span style={{ textTransform: "capitalize" }}>{tx.type.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: isPositive ? V.confirmed : "#EF4444" }}>
                      {isPositive ? `+${tx.amount}` : tx.amount} pts
                    </div>
                    {tx.balance_after !== undefined && tx.balance_after !== null && (
                      <div style={{ fontSize: 10.5, color: V.chalkFaint, marginTop: 1 }}>
                        Bal: {tx.balance_after}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
