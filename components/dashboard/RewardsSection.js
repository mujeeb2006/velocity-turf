"use client";

import { useState, useEffect, useMemo } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  Gift,
  Users,
  Wallet,
  Check,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Copy,
  Share2,
  Sparkles,
  Info,
  Calendar,
  Zap,
} from "@/components/ui/icons";

export function RewardsSection({ profile, showToast, onFindTurf }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Interactive calculator state
  const [calcTurfPrice, setCalcTurfPrice] = useState(1000);

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
    max_referrals_per_user: 3,
  };

  const referral = data?.referral || {
    referralCode: profile?.referral_code || "",
    referralLink: "",
    totalCompleted: 0,
    maxAllowed: 3,
    remainingAllowed: 3,
    slots: [
      { slotNumber: 1, status: "empty", label: "Slot 1" },
      { slotNumber: 2, status: "empty", label: "Slot 2" },
      { slotNumber: 3, status: "empty", label: "Slot 3" },
    ],
  };

  const transactions = data?.transactions || [];

  const handleCopyCode = () => {
    if (!referral.referralCode) return;
    navigator.clipboard?.writeText(referral.referralCode);
    setCopiedCode(true);
    showToast("Referral code copied to clipboard!", { type: "success" });
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleCopyLink = () => {
    const link = referral.referralLink || `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${referral.referralCode}`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    showToast("Referral link copied to clipboard!", { type: "success" });
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleShare = async () => {
    const link = referral.referralLink || `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${referral.referralCode}`;
    const shareData = {
      title: "Play sports on Velocity Turf",
      text: `Join me on Velocity Turf! Use my referral code ${referral.referralCode} to get ${settings.referred_welcome_points} bonus reward points on your first booking:`,
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Calculator calculations
  const conversionRate = Number(settings.conversion_rate_points_per_inr || 1);
  const pointsForFreeSlot = Math.ceil(calcTurfPrice * conversionRate);
  const maxRedeemableForPrice = settings.full_slot_redemption_allowed
    ? pointsForFreeSlot
    : Math.floor((calcTurfPrice * (settings.max_discount_percentage / 100)) * conversionRate);
  const pointsApplicable = Math.min(wallet.available_points, maxRedeemableForPrice);
  const calculatedDiscountINR = Math.floor(pointsApplicable / conversionRate);
  const calculatedRemainingPayable = Math.max(0, calcTurfPrice - calculatedDiscountINR);
  const canBookFreeNow = wallet.available_points >= pointsForFreeSlot && settings.full_slot_redemption_allowed;
  const pointsNeededForFree = Math.max(0, pointsForFreeSlot - wallet.available_points);

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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  const referralPercent = Math.min(100, Math.round((referral.totalCompleted / referral.maxAllowed) * 100));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}40`, borderRadius: 8, padding: "4px 12px", marginBottom: 10 }}>
            <Gift size={14} color={V.flood} />
            <span style={{ color: V.flood, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
              REWARDS & REFERRALS
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: V.chalk, margin: "0 0 6px" }}>
            Reward Wallet & Friend Invites
          </h1>
          <p style={{ fontSize: 14.5, color: V.chalkDim, margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            Earn reward points every time you play or invite friends. Redeem points directly at checkout for instant discounts or 100% free turf slots.
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

      {/* ============================================================ */}
      {/* SECTION A: MY REWARD WALLET */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Main Available Points Card */}
          <div
            style={{
              ...panel(true),
              gridColumn: "span 2",
              borderRadius: 18,
              padding: "26px 28px",
              background: `linear-gradient(135deg, ${V.pitchCard} 0%, rgba(24, 168, 224, 0.08) 100%)`,
              border: `1px solid ${V.flood}40`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Available Balance
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 46, fontWeight: 900, color: V.chalk, letterSpacing: -1 }}>
                    {wallet.available_points.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: V.flood }}>pts</span>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(21, 128, 81, 0.12)",
                  border: "1px solid rgba(21, 128, 81, 0.3)",
                  borderRadius: 12,
                  padding: "10px 16px",
                  textAlign: "right",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: V.confirmed, textTransform: "uppercase" }}>
                  Equivalent Value
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: V.confirmed, marginTop: 2 }}>
                  ₹{wallet.equivalent_inr.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: V.lineStrong, margin: "20px 0 16px" }} />

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 13, color: V.chalkDim, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={15} color={V.flood} />
                <span>Rate: <strong>{conversionRate} pt = ₹1</strong> · Automatic redemption at turf checkout</span>
              </div>
              {onFindTurf && (
                <button
                  onClick={onFindTurf}
                  style={{
                    ...buttonStyle("primary", "sm"),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Book Turf Slot <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Lifetime Earned */}
          <div style={{ ...panel(), borderRadius: 18, padding: "24px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: V.chalkFaint, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              <Sparkles size={16} color={V.flood} /> Lifetime Earned
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: V.chalk, marginTop: 10 }}>
              {wallet.lifetime_earned.toLocaleString()} <span style={{ fontSize: 14, color: V.chalkFaint }}>pts</span>
            </div>
            <div style={{ fontSize: 12.5, color: V.chalkDim, marginTop: 6 }}>
              Total points accumulated from bookings & referrals
            </div>
          </div>

          {/* Lifetime Redeemed */}
          <div style={{ ...panel(), borderRadius: 18, padding: "24px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: V.chalkFaint, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              <Wallet size={16} color={V.confirmed} /> Lifetime Redeemed
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: V.chalk, marginTop: 10 }}>
              {wallet.lifetime_redeemed.toLocaleString()} <span style={{ fontSize: 14, color: V.chalkFaint }}>pts</span>
            </div>
            <div style={{ fontSize: 12.5, color: V.chalkDim, marginTop: 6 }}>
              Saved ₹{Math.floor(wallet.lifetime_redeemed / conversionRate).toLocaleString()} across past bookings
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION B: REFER FRIENDS */}
      {/* ============================================================ */}
      <div
        style={{
          ...panel(),
          borderRadius: 20,
          padding: "28px 24px",
          marginBottom: 32,
          border: `1px solid ${V.lineStrong}`,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: V.flood, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              <Users size={15} /> One Unified Referral Program
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: "4px 0 0" }}>
              Invite Friends & Both Win Rewards
            </h2>
          </div>

          {/* 0/3 Progress Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: referral.totalCompleted >= referral.maxAllowed ? "rgba(21, 128, 81, 0.15)" : V.floodDim,
              border: `1px solid ${referral.totalCompleted >= referral.maxAllowed ? V.confirmed : V.flood}50`,
              borderRadius: 30,
              padding: "6px 16px",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: referral.totalCompleted >= referral.maxAllowed ? V.confirmed : V.chalk }}>
              {referral.totalCompleted} / {referral.maxAllowed} Referrals Completed
            </span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: V.chalkDim, margin: "0 0 20px", maxWidth: 740, lineHeight: 1.5 }}>
          Share your referral code with up to <strong>3 genuine friends</strong>. When your referred friend completes their first eligible booking, you automatically receive <strong>+{settings.referrer_reward_points} reward points</strong> and they receive <strong>+{settings.referred_welcome_points} welcome points</strong>!
        </p>

        {/* Share & Code Box */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            background: V.pitchCard,
            padding: 20,
            borderRadius: 14,
            border: `1px solid ${V.line}`,
            marginBottom: 24,
          }}
        >
          {/* Referral Code Box */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", marginBottom: 6 }}>
              Your Unique Referral Code
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: V.pitch,
                  border: `1px solid ${V.lineStrong}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 16,
                  fontWeight: 800,
                  color: V.flood,
                  letterSpacing: 2,
                  fontFamily: "monospace",
                }}
              >
                {referral.referralCode || "Generating…"}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  ...buttonStyle("secondary", "md"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {copiedCode ? <Check size={14} color={V.confirmed} /> : <Copy size={14} />}
                {copiedCode ? "Copied" : "Copy Code"}
              </button>
            </div>
          </div>

          {/* Referral Link & Native Share */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", marginBottom: 6 }}>
              Direct Invite Link
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  ...buttonStyle("secondary", "md"),
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {copiedLink ? <Check size={14} color={V.confirmed} /> : <Copy size={14} />}
                {copiedLink ? "Link Copied" : "Copy Invite Link"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                style={{
                  ...buttonStyle("primary", "md"),
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8, color: V.chalkFaint }}>
            <span>Referral Slots Quota</span>
            <span style={{ fontWeight: 700, color: V.chalk }}>
              {referral.remainingAllowed > 0
                ? `${referral.remainingAllowed} referral ${referral.remainingAllowed === 1 ? "slot" : "slots"} left`
                : "Referral cap reached (3/3)"}
            </span>
          </div>
          <div style={{ height: 8, background: V.pitch, borderRadius: 6, overflow: "hidden", border: `1px solid ${V.line}` }}>
            <div
              style={{
                height: "100%",
                width: `${referralPercent}%`,
                background: referral.totalCompleted >= referral.maxAllowed ? V.confirmed : V.flood,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* 3 Visual Referral Slots */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 14px" }}>
            Referral Slots (Max 3)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {referral.slots.map((slot) => {
              const isCompleted = slot.status === "completed";
              const isRegistered = slot.status === "registered";
              const isEmpty = slot.status === "empty";

              return (
                <div
                  key={slot.slotNumber}
                  style={{
                    background: isCompleted
                      ? "rgba(21, 128, 81, 0.08)"
                      : isRegistered
                      ? "rgba(24, 168, 224, 0.08)"
                      : V.pitchCard,
                    border: `1px solid ${
                      isCompleted
                        ? "rgba(21, 128, 81, 0.35)"
                        : isRegistered
                        ? "rgba(24, 168, 224, 0.35)"
                        : V.line
                    }`,
                    borderRadius: 14,
                    padding: "18px 16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: V.chalkFaint }}>
                        SLOT #{slot.slotNumber}
                      </span>
                      {isCompleted && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: V.confirmed, background: "rgba(21, 128, 81, 0.15)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Check size={11} strokeWidth={3} /> Rewarded
                        </span>
                      )}
                      {isRegistered && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: V.flood, background: V.floodDim, padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> Registered
                        </span>
                      )}
                      {isEmpty && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: V.chalkFaint, background: V.pitch, padding: "3px 8px", borderRadius: 6 }}>
                          Open
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 15, fontWeight: 800, color: V.chalk, marginBottom: 4 }}>
                      {isCompleted
                        ? slot.refereeName || "Friend"
                        : isRegistered
                        ? slot.refereeName || "Friend Registered"
                        : "Slot Available"}
                    </div>

                    <div style={{ fontSize: 12, color: V.chalkDim, lineHeight: 1.4 }}>
                      {isCompleted && `First booking completed! +${settings.referrer_reward_points} pts earned.`}
                      {isRegistered && "Awaiting friend's first completed booking to unlock your reward."}
                      {isEmpty && `Invite friend #${slot.slotNumber} to earn +${settings.referrer_reward_points} pts.`}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${V.line}`, fontSize: 11, color: V.chalkFaint }}>
                    {isCompleted ? (
                      <span style={{ color: V.confirmed, fontWeight: 700 }}>
                        Bonus credited to your wallet
                      </span>
                    ) : isRegistered ? (
                      <span style={{ color: V.flood, fontWeight: 700 }}>
                        Step 2/3: First game pending
                      </span>
                    ) : (
                      <span>Step 1/3: Share your invite link</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION C: REDEEM REWARDS & FREE BOOKING CALCULATOR */}
      {/* ============================================================ */}
      <div
        style={{
          ...panel(),
          borderRadius: 20,
          padding: "28px 24px",
          marginBottom: 32,
          border: `1px solid ${V.lineStrong}`,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: V.confirmed, fontSize: 12, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>
          <Sparkles size={15} /> Redeem Rewards & Free Slot Calculator
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: "0 0 8px" }}>
          Points-to-Rupees Redemption Calculator
        </h2>
        <p style={{ fontSize: 14, color: V.chalkDim, margin: "0 0 24px", maxWidth: 740, lineHeight: 1.5 }}>
          See how your points translate directly to discounts or a completely free booking. At 1 pt = ₹{conversionRate}, 1,000 points covers a standard ₹1,000 pitch slot entirely.
        </p>

        {/* Status Callout Banner */}
        {canBookFreeNow ? (
          <div
            style={{
              background: "rgba(21, 128, 81, 0.12)",
              border: "1px solid rgba(21, 128, 81, 0.35)",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: V.confirmed, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={20} strokeWidth={3} />
              </div>
              <div>
                <div style={{ color: V.confirmed, fontSize: 15, fontWeight: 800 }}>
                  Free Slot Eligible Right Now!
                </div>
                <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 2 }}>
                  Your {wallet.available_points} points can cover a ₹{calcTurfPrice} booking completely (₹0 payable).
                </div>
              </div>
            </div>
            {onFindTurf && (
              <button onClick={onFindTurf} style={buttonStyle("primary", "sm")}>
                Redeem Free Slot
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(24, 168, 224, 0.08)",
              border: "1px solid rgba(24, 168, 224, 0.25)",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Info size={22} color={V.flood} />
              <div>
                <div style={{ color: V.chalk, fontSize: 14.5, fontWeight: 800 }}>
                  Need only {pointsNeededForFree.toLocaleString()} more points for a 100% Free Slot
                </div>
                <div style={{ color: V.chalkDim, fontSize: 12.5, marginTop: 2 }}>
                  You currently have {wallet.available_points} pts = ₹{calculatedDiscountINR} off this booking.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Pricing Controls */}
        <div style={{ background: V.pitchCard, borderRadius: 16, padding: "20px 22px", border: `1px solid ${V.line}` }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase" }}>
                Simulate Slot Price (INR)
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {[600, 800, 1000, 1200, 1500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCalcTurfPrice(preset)}
                    style={{
                      background: calcTurfPrice === preset ? V.flood : V.pitch,
                      color: calcTurfPrice === preset ? "#fff" : V.chalk,
                      border: `1px solid ${calcTurfPrice === preset ? V.flood : V.line}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="400"
              max="2500"
              step="50"
              value={calcTurfPrice}
              onChange={(e) => setCalcTurfPrice(Number(e.target.value))}
              style={{ width: "100%", accentColor: V.flood, cursor: "pointer" }}
            />
          </div>

          {/* Breakdown Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, paddingTop: 16, borderTop: `1px solid ${V.lineStrong}` }}>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Turf Slot Price</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: V.chalk, marginTop: 4 }}>₹{calcTurfPrice}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Points to Redeem</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: V.flood, marginTop: 4 }}>
                {pointsApplicable.toLocaleString()} <span style={{ fontSize: 12 }}>pts</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Instant Discount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: V.confirmed, marginTop: 4 }}>
                -₹{calculatedDiscountINR.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Final Payable Amount</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: calculatedRemainingPayable === 0 ? V.confirmed : V.chalk, marginTop: 4 }}>
                {calculatedRemainingPayable === 0 ? "₹0 (100% Free!)" : `₹${calculatedRemainingPayable.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION D: TRANSACTION HISTORY */}
      {/* ============================================================ */}
      <div
        style={{
          ...panel(),
          borderRadius: 20,
          padding: "28px 24px",
          border: `1px solid ${V.lineStrong}`,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: V.flood, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              <Clock size={15} /> Transparent Ledger
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: "4px 0 0" }}>
              Reward Points History
            </h2>
          </div>

          {/* Subfilter Pills */}
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
                  padding: "5px 12px",
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
            subtitle="Book games or share your referral link with friends to earn reward points!"
            accent={V.flood}
          />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredTransactions.map((tx) => {
              const isPositive = Number(tx.amount) > 0;
              const formattedDate = tx.created_at
                ? new Date(tx.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              return (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    background: V.pitchCard,
                    borderRadius: 12,
                    border: `1px solid ${V.line}`,
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isPositive ? "rgba(21, 128, 81, 0.12)" : "rgba(220, 38, 38, 0.12)",
                        color: isPositive ? V.confirmed : "#EF4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isPositive ? <Sparkles size={16} /> : <Wallet size={16} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: V.chalk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description || tx.type.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 11.5, color: V.chalkFaint, marginTop: 2 }}>
                        {formattedDate} · <span style={{ textTransform: "capitalize" }}>{tx.type.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: isPositive ? V.confirmed : "#EF4444",
                      }}
                    >
                      {isPositive ? `+${tx.amount}` : tx.amount} pts
                    </div>
                    {tx.balance_after !== undefined && tx.balance_after !== null && (
                      <div style={{ fontSize: 11, color: V.chalkFaint, marginTop: 2 }}>
                        Balance: {tx.balance_after} pts
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

