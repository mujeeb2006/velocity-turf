"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import {
  Users,
  Wallet,
  Check,
  CheckCircle,
  Clock,
  ArrowRight,
  Copy,
  Share2,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Info,
} from "@/components/ui/icons";

export function GroupBookingDetailsModal({
  groupId,
  invitationCode,
  profile,
  onClose,
  showToast,
  onUpdate,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  const [reimbursing, setReimbursing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const param = groupId || invitationCode;
      const res = await fetch(`/api/group-bookings/${param}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json.summary?.secondsRemaining) {
          setSecondsRemaining(json.summary.secondsRemaining);
        }
      } else {
        showToast(json?.error || "Could not load group details.", { type: "error" });
      }
    } catch {
      showToast("Network error loading group booking.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [groupId, invitationCode]);

  // Live countdown ticker
  useEffect(() => {
    if (!data?.group?.expires_at) return;
    const expiresAt = new Date(data.group.expires_at).getTime();

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
      if (diff === 0 && data?.group?.status === "pending") {
        clearInterval(timer);
        fetchDetails(); // Auto refresh when expired
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.group?.expires_at, data?.group?.status]);

  if (loading && !data) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(23, 43, 77, 0.45)", backdropFilter: "blur(6px)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ ...panel(true), borderRadius: 18, padding: 32, maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{ width: 24, height: 24, border: "2px solid #18A8E0", borderRightColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: V.chalk, fontSize: 14 }}>Loading group details…</div>
        </div>
      </div>
    );
  }

  const group = data?.group;
  const participants = data?.participants || [];
  const summary = data?.summary || {};
  const isLeader = data?.isLeader;
  const myParticipant = data?.myParticipant;
  const isInstant = group?.payment_mode === "leader_immediate";

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/player?joinGroup=${group.invitation_code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    showToast("Group invite link copied!", { type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/player?joinGroup=${group.invitation_code}`;
    const shareData = {
      title: `Join my ${group.sport} game on Velocity Turf`,
      text: `Join our group booking for ${group.turf?.name || "turf"} on ${formatBookingDate(group.booking_date)} at ${group.start_time?.slice(0, 5)}. Use code: ${group.invitation_code}`,
      url: link,
    };
    if (navigator?.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // 1. Pay my share (Standard Split)
  const handlePayShare = async () => {
    if (!myParticipant || paying) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/group-bookings/${group.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: myParticipant.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Payment failed. Please retry.", { type: "error" });
      } else {
        showToast(
          json.groupConfirmed
            ? "Payment confirmed! All shares collected — turf slot is officially confirmed!"
            : "Your share payment was successful!",
          { type: "success" }
        );
        fetchDetails();
        onUpdate?.();
      }
    } catch {
      showToast("Network error processing payment.", { type: "error" });
    } finally {
      setPaying(false);
    }
  };

  // 2. Leader Option 1: Leader Guarantee (Pay Outstanding Balance)
  const handlePayBalance = async () => {
    if (payingBalance) return;
    if (!window.confirm(`Pay the remaining balance of ₹${summary.remainingBalance} to confirm this booking immediately?`)) return;
    setPayingBalance(true);
    try {
      const res = await fetch(`/api/group-bookings/${group.id}/pay-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Could not complete balance payment.", { type: "error" });
      } else {
        showToast("Remaining balance paid! Group booking is now officially confirmed.", { type: "success" });
        fetchDetails();
        onUpdate?.();
      }
    } catch {
      showToast("Network error paying remaining balance.", { type: "error" });
    } finally {
      setPayingBalance(false);
    }
  };

  // 3. Leader Option 2: Replace Unpaid Participant
  const handleReplaceMember = async (pId) => {
    if (!window.confirm("Remove this unpaid participant and free up the spot for a replacement player?")) return;
    setRemovingId(pId);
    try {
      const res = await fetch(`/api/group-bookings/${group.id}/replace-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldParticipantId: pId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Could not replace participant.", { type: "error" });
      } else {
        showToast("Participant removed. You can now invite a replacement player.", { type: "info" });
        fetchDetails();
        onUpdate?.();
      }
    } catch {
      showToast("Network error replacing participant.", { type: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  // 4. Leader Option 3: Cancel Group Booking & Refund All
  const handleCancelGroup = async () => {
    if (!window.confirm("Cancel this group booking? The slot hold will be released and any collected contributions will be refunded.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/group-bookings/${group.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by leader" }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Could not cancel group booking.", { type: "error" });
      } else {
        showToast("Group booking cancelled and refunds initiated.", { type: "info" });
        fetchDetails();
        onUpdate?.();
      }
    } catch {
      showToast("Network error cancelling group booking.", { type: "error" });
    } finally {
      setCancelling(false);
    }
  };

  // 5. Member Reimburse Leader (Instant Booking Mode)
  const handleReimburse = async () => {
    if (!myParticipant || reimbursing) return;
    setReimbursing(true);
    try {
      const res = await fetch(`/api/group-bookings/${group.id}/reimburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: myParticipant.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Could not process reimbursement.", { type: "error" });
      } else {
        showToast("Reimbursement sent to the group leader! Thank you.", { type: "success" });
        fetchDetails();
        onUpdate?.();
      }
    } catch {
      showToast("Network error processing reimbursement.", { type: "error" });
    } finally {
      setReimbursing(false);
    }
  };

  const isConfirmed = group?.status === "confirmed";
  const isPending = group?.status === "pending";
  const isExpired = group?.status === "expired" || summary?.isExpired;
  const isCancelled = group?.status === "cancelled";
  const isUrgent = isPending && secondsRemaining > 0 && secondsRemaining <= 180;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23, 43, 77, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          ...panel(true),
          borderRadius: 20,
          maxWidth: 640,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px 26px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: V.flood, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase" }}>
              <Users size={14} /> Group Booking #{group?.invitation_code}
              {isInstant && (
                <span style={{ background: "rgba(21, 128, 81, 0.15)", color: V.confirmed, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>
                  Instant Confirmed
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: "4px 0 2px" }}>
              {group?.turf?.name || "Turf Venue"}
            </h2>
            <div style={{ fontSize: 13, color: V.chalkDim }}>
              {formatBookingDate(group?.booking_date)} · {group?.start_time?.slice(0, 5)} (1 hr) · {group?.sport}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${V.line}`,
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: V.chalkDim,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Slot Hold Countdown Banner */}
        {isPending && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isUrgent ? "rgba(239, 68, 68, 0.12)" : "rgba(24, 168, 224, 0.1)",
              border: `1px solid ${isUrgent ? "rgba(239, 68, 68, 0.4)" : "rgba(24, 168, 224, 0.3)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={20} color={isUrgent ? "#EF4444" : V.flood} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isUrgent ? "#EF4444" : V.chalk }}>
                  {isUrgent ? "Temporary Slot Hold Expiring Soon!" : "Temporary Slot Hold Active"}
                </div>
                <div style={{ fontSize: 11.5, color: V.chalkDim }}>
                  {isUrgent
                    ? "Complete shares or guarantee balance to avoid automatic cancellation."
                    : "Slot is exclusively reserved while your group pays."}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: isUrgent ? "#EF4444" : V.flood, fontFamily: "monospace" }}>
                {formatCountdown(secondsRemaining)}
              </div>
              <div style={{ fontSize: 10, color: V.chalkFaint, textTransform: "uppercase" }}>Time Left</div>
            </div>
          </div>
        )}

        {/* Status Callout Banner */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: isConfirmed
              ? "rgba(21, 128, 81, 0.12)"
              : isPending
              ? "rgba(24, 168, 224, 0.08)"
              : "rgba(220, 38, 38, 0.1)",
            border: `1px solid ${
              isConfirmed
                ? "rgba(21, 128, 81, 0.3)"
                : isPending
                ? "rgba(24, 168, 224, 0.25)"
                : "rgba(220, 38, 38, 0.3)"
            }`,
          }}
        >
          {isConfirmed && <CheckCircle size={22} color={V.confirmed} />}
          {isPending && <Clock size={22} color={V.flood} />}
          {(isExpired || isCancelled) && <AlertTriangle size={22} color="#EF4444" />}

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: isConfirmed ? V.confirmed : isPending ? V.chalk : "#EF4444" }}>
              {isConfirmed && (isInstant ? "Instant Booking Officially Confirmed!" : "Booking Officially Confirmed!")}
              {isPending && "Awaiting Group Share Payments"}
              {isExpired && "Payment Deadline Expired — Slot Hold Released"}
              {isCancelled && "Group Booking Cancelled"}
            </div>
            <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 2 }}>
              {isConfirmed && (isInstant ? "Leader guaranteed full payment upfront. Members can reimburse their shares." : "All shares collected. Your slot is exclusively confirmed at the venue.")}
              {isPending && "If unpaid by deadline, the slot will be released automatically and any paid contributions refunded."}
              {isExpired && "The temporary slot hold was released for other players. Collected payments are refunded."}
              {isCancelled && "This booking was cancelled by the leader. All contributions have been refunded."}
            </div>
          </div>
        </div>

        {/* Progress & Split Breakdown */}
        <div style={{ background: V.pitchCard, borderRadius: 14, padding: "16px 18px", border: `1px solid ${V.line}`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase" }}>
              {isInstant
                ? `Reimbursements (${summary.reimbursedCount || 0}/${(summary.totalCount || 1) - 1} Friends Reimbursed)`
                : `Collection Progress (${summary.paidCount}/${summary.totalCount} Players Paid)`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: summary.isFullyPaid ? V.confirmed : V.flood }}>
              {summary.progressPercentage}%
            </span>
          </div>

          <div style={{ height: 8, background: V.pitch, borderRadius: 6, overflow: "hidden", border: `1px solid ${V.lineStrong}`, marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${summary.progressPercentage}%`, background: summary.isFullyPaid ? V.confirmed : V.flood, transition: "width 0.3s ease" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center", paddingTop: 8, borderTop: `1px solid ${V.lineStrong}` }}>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase" }}>Total Booking</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: V.chalk, marginTop: 2 }}>₹{summary.totalPrice}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase" }}>{isInstant ? "Reimbursed" : "Collected"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: V.confirmed, marginTop: 2 }}>
                ₹{isInstant ? summary.reimbursedAmount || 0 : summary.totalPaid}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase" }}>Remaining</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: summary.remainingBalance === 0 ? V.confirmed : V.chalk, marginTop: 2 }}>
                ₹{summary.remainingBalance}
              </div>
            </div>
          </div>
        </div>

        {/* Invite Link & Code Card */}
        {(isPending || isInstant) && (
          <div style={{ background: V.pitch, borderRadius: 12, padding: "14px 16px", border: `1px solid ${V.lineStrong}`, marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", marginBottom: 6 }}>
              {isInstant ? "Invite Friends to Join & Reimburse" : "Invite Friends to Split the Bill"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, fontWeight: 800, color: V.flood, fontFamily: "monospace" }}>
                {group?.invitation_code}
              </div>
              <button onClick={handleCopyLink} style={{ ...buttonStyle("secondary", "sm"), display: "inline-flex", alignItems: "center", gap: 4 }}>
                {copied ? <Check size={13} color={V.confirmed} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Link"}
              </button>
              <button onClick={handleShare} style={{ ...buttonStyle("primary", "sm"), display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Share2 size={13} /> Share
              </button>
            </div>
          </div>
        )}

        {/* Participants Table */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" }}>
            Participants ({participants.length}/{group?.participant_count})
          </h4>

          <div style={{ display: "grid", gap: 8 }}>
            {participants.map((p, idx) => {
              const isMe = p.player_id === profile?.id;
              const isPaid = p.payment_status === "paid";
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: V.pitchCard,
                    borderRadius: 10,
                    border: `1px solid ${isMe ? V.flood + "40" : V.line}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPaid ? "rgba(21, 128, 81, 0.2)" : "rgba(24, 168, 224, 0.15)", color: isPaid ? V.confirmed : V.flood, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: V.chalk }}>
                        {p.player?.full_name || p.guest_name || `Participant #${idx + 1}`}
                        {isMe && <span style={{ color: V.flood, marginLeft: 6, fontSize: 11, fontWeight: 800 }}>(You)</span>}
                        {p.role === "leader" && <span style={{ color: V.chalkFaint, marginLeft: 6, fontSize: 11 }}>· Leader</span>}
                      </div>
                      <div style={{ fontSize: 11, color: V.chalkFaint }}>
                        Share: <strong>₹{p.share_amount}</strong> {isPaid && p.paid_at && `· Paid ${new Date(p.paid_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: isPaid ? "rgba(21, 128, 81, 0.15)" : "rgba(24, 168, 224, 0.12)",
                        color: isPaid ? V.confirmed : V.flood,
                      }}
                    >
                      {isPaid ? "Paid" : "Pending"}
                    </span>

                    {/* Leader replace/remove button */}
                    {isLeader && isPending && !isPaid && p.role !== "leader" && (
                      <button
                        onClick={() => handleReplaceMember(p.id)}
                        disabled={removingId === p.id}
                        title="Remove or replace unpaid player"
                        style={{
                          background: "transparent",
                          border: `1px solid ${V.lineStrong}`,
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          color: "#EF4444",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <UserPlus size={12} /> Replace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Payment Actions */}
        {isPending && myParticipant && myParticipant.payment_status !== "paid" && (
          <div style={{ background: "rgba(24, 168, 224, 0.08)", border: `1px solid ${V.flood}40`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase" }}>Your Share Amount</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: V.chalk, marginTop: 2 }}>₹{myParticipant.share_amount}</div>
              </div>
              <button
                onClick={handlePayShare}
                disabled={paying}
                style={{ ...buttonStyle("primary", "md", paying), display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {paying ? "Processing payment…" : `Pay My Share · ₹${myParticipant.share_amount}`}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: V.chalkDim }}>
              Slot is held temporarily. It will be officially confirmed once all members complete their payment.
            </div>
          </div>
        )}

        {/* Member Reimbursement Action (Instant Booking) */}
        {isInstant && myParticipant && myParticipant.role !== "leader" && myParticipant.payment_status !== "paid" && (
          <div style={{ background: "rgba(21, 128, 81, 0.08)", border: `1px solid rgba(21, 128, 81, 0.3)`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase" }}>Reimbursement Share</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: V.chalk, marginTop: 2 }}>₹{myParticipant.share_amount}</div>
              </div>
              <button
                onClick={handleReimburse}
                disabled={reimbursing}
                style={{ ...buttonStyle("primary", "md", reimbursing), background: V.confirmed, borderColor: V.confirmed, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {reimbursing ? "Processing…" : `Reimburse Leader · ₹${myParticipant.share_amount}`}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: V.chalkDim }}>
              Booking is already confirmed! Reimbursing directly reimburses your group leader.
            </div>
          </div>
        )}

        {/* Leader 3 Options When Unpaid Participants Exist */}
        {isLeader && isPending && summary.remainingBalance > 0 && (
          <div style={{ background: V.pitch, border: `1px solid ${V.lineStrong}`, borderRadius: 14, padding: "16px 18px", marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: V.flood, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={15} /> Leader Resolution Options
            </div>
            <div style={{ fontSize: 12, color: V.chalkDim, marginBottom: 14 }}>
              If a participant does not pay before the temporary hold expires, choose one of these options:
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {/* Option 1: Leader Guarantee */}
              <button
                onClick={handlePayBalance}
                disabled={payingBalance}
                style={{
                  ...buttonStyle("primary", "md", payingBalance),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 800 }}>Pay Outstanding Balance (Leader Guarantee)</div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>Confirm booking immediately by paying the remaining balance.</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>₹{summary.remainingBalance}</div>
              </button>

              {/* Option 2: Replacement Player info */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: V.chalk }}>Invite Replacement Player</div>
                  <div style={{ fontSize: 11, color: V.chalkFaint }}>Click "Replace" next to an unpaid participant above or share code.</div>
                </div>
                <button
                  onClick={handleShare}
                  style={{ ...buttonStyle("secondary", "sm"), display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Share2 size={12} /> Invite Substitute
                </button>
              </div>

              {/* Option 3: Cancel Group Booking */}
              <div style={{ textAlign: "right", marginTop: 4 }}>
                <button
                  onClick={handleCancelGroup}
                  disabled={cancelling}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#EF4444",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {cancelling ? "Cancelling…" : "Option 3: Cancel Group Booking & Refund All"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
