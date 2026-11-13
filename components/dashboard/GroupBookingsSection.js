"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { GroupBookingDetailsModal } from "./GroupBookingDetailsModal";
import {
  Users,
  Wallet,
  Check,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Copy,
  Share2,
  Plus,
  AlertTriangle,
} from "@/components/ui/icons";

export function GroupBookingsSection({ profile, showToast, onFindTurf }) {
  const [data, setData] = useState({ created: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("created"); // "created" or "joined"
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/group-bookings");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        showToast(json?.error || "Could not load group bookings.", { type: "error" });
      }
    } catch {
      showToast("Network error loading group bookings.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) fetchGroups();
  }, [profile?.id]);

  const handleJoinByCode = async (e) => {
    e?.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      showToast("Please enter a group invitation code.", { type: "info" });
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/group-bookings/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationCode: code }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json?.error || "Could not join group.", { type: "error" });
      } else {
        showToast(json.alreadyJoined ? "You are already a member of this group!" : "Successfully joined group booking!", { type: "success" });
        setShowJoinModal(false);
        setJoinCodeInput("");
        fetchGroups();
        if (json.group?.id) setSelectedGroupId(json.group.id);
      }
    } catch {
      showToast("Network error joining group.", { type: "error" });
    } finally {
      setJoining(false);
    }
  };

  const list = activeTab === "created" ? data.created : data.joined;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}40`, borderRadius: 8, padding: "4px 12px", marginBottom: 10 }}>
            <Users size={14} color={V.flood} />
            <span style={{ color: V.flood, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
              BILL SPLITTING & TEAMS
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: V.chalk, margin: "0 0 6px" }}>
            Group Bookings & Split Pay
          </h1>
          <p style={{ fontSize: 14.5, color: V.chalkDim, margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            Book turf venues together and split the cost equally or with custom shares. Lock the slot while friends pay before the deadline.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowJoinModal(true)}
            style={{ ...buttonStyle("secondary", "md"), display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Users size={14} /> Join with Code
          </button>
          {onFindTurf && (
            <button
              onClick={onFindTurf}
              style={{ ...buttonStyle("primary", "md"), display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Create Group Booking
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${V.line}`, paddingBottom: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("created")}
          style={{
            background: activeTab === "created" ? V.floodDim : "transparent",
            color: activeTab === "created" ? V.flood : V.chalkDim,
            border: `1px solid ${activeTab === "created" ? V.flood + "40" : "transparent"}`,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Created by Me ({data.created.length})
        </button>
        <button
          onClick={() => setActiveTab("joined")}
          style={{
            background: activeTab === "joined" ? V.floodDim : "transparent",
            color: activeTab === "joined" ? V.flood : V.chalkDim,
            border: `1px solid ${activeTab === "joined" ? V.flood + "40" : "transparent"}`,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Groups Joined ({data.joined.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="users"
          title={activeTab === "created" ? "No group bookings created yet" : "No joined group bookings"}
          subtitle={
            activeTab === "created"
              ? "Book a pitch and select 'Group Booking' to invite friends and split the cost."
              : "Ask your game leader for their invitation code or link to join and pay your share."
          }
          action={
            activeTab === "created" && onFindTurf
              ? { label: "Book a Turf", onClick: onFindTurf }
              : { label: "Join with Code", onClick: () => setShowJoinModal(true) }
          }
          accent={V.flood}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {list.map((group) => {
            const isConfirmed = group.status === "confirmed";
            const isPending = group.status === "pending";
            const isExpired = group.status === "expired";
            const isCancelled = group.status === "cancelled";

            const participants = group.participants || [];
            const paidCount = participants.filter((p) => p.payment_status === "paid").length;
            const myParticipant = participants.find((p) => p.player_id === profile?.id);
            const myPaid = myParticipant?.payment_status === "paid";

            return (
              <div
                key={group.id}
                style={{
                  ...panel(),
                  borderRadius: 16,
                  padding: "20px 22px",
                  border: `1px solid ${isConfirmed ? "rgba(21, 128, 81, 0.35)" : isPending ? V.flood + "40" : V.line}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: V.chalkFaint, textTransform: "uppercase" }}>
                        CODE: {group.invitation_code}
                      </span>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: "2px 0 0" }}>
                        {group.turf?.name || "Turf Venue"}
                      </h3>
                      <div style={{ fontSize: 12.5, color: V.chalkDim, marginTop: 2 }}>
                        {formatBookingDate(group.booking_date)} · {group.start_time?.slice(0, 5)} · {group.sport}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: isConfirmed
                          ? "rgba(21, 128, 81, 0.15)"
                          : isPending
                          ? "rgba(24, 168, 224, 0.15)"
                          : "rgba(220, 38, 38, 0.15)",
                        color: isConfirmed ? V.confirmed : isPending ? V.flood : "#EF4444",
                      }}
                    >
                      {isConfirmed ? "Confirmed" : isPending ? "Pending" : isExpired ? "Expired" : "Cancelled"}
                    </span>
                  </div>

                  {/* Summary row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: V.pitchCard, padding: "10px 14px", borderRadius: 10, margin: "14px 0", fontSize: 13 }}>
                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>Total Price</div>
                      <div style={{ color: V.chalk, fontWeight: 800 }}>₹{group.total_price}</div>
                    </div>
                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>Split Mode</div>
                      <div style={{ color: V.flood, fontWeight: 700, textTransform: "capitalize" }}>
                        {group.split_mode?.replace("_", " ")}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>Paid Players</div>
                      <div style={{ color: paidCount >= group.participant_count ? V.confirmed : V.chalk, fontWeight: 800 }}>
                        {paidCount} / {group.participant_count}
                      </div>
                    </div>
                  </div>

                  {/* My Share indicator */}
                  {myParticipant && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 14 }}>
                      <span style={{ color: V.chalkDim }}>Your Share:</span>
                      <span style={{ fontWeight: 800, color: myPaid ? V.confirmed : V.flood }}>
                        ₹{myParticipant.share_amount} ({myPaid ? "Paid" : "Pending"})
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 12, borderTop: `1px solid ${V.line}`, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    style={{ ...buttonStyle("primary", "sm"), flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {isPending && !myPaid ? "View & Pay Share" : "View Details"} <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join By Code Modal */}
      {showJoinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23, 43, 77, 0.55)", backdropFilter: "blur(6px)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...panel(true), borderRadius: 18, padding: 28, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: "0 0 6px" }}>Join Group Booking</h3>
            <p style={{ fontSize: 13, color: V.chalkDim, margin: "0 0 18px", lineHeight: 1.4 }}>
              Enter the 6-character invitation code from your game leader to join and split the turf booking fee.
            </p>

            <form onSubmit={handleJoinByCode}>
              <input
                type="text"
                placeholder="GRP-XXXXXX"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                style={{ width: "100%", padding: "12px 14px", background: V.pitch, border: `1px solid ${V.lineStrong}`, borderRadius: 10, color: V.flood, fontSize: 18, fontWeight: 800, letterSpacing: 2, textAlign: "center", fontFamily: "monospace", marginBottom: 16 }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button type="button" onClick={() => setShowJoinModal(false)} style={buttonStyle("secondary", "md")}>
                  Cancel
                </button>
                <button type="submit" disabled={joining} style={buttonStyle("primary", "md", joining)}>
                  {joining ? "Joining…" : "Join Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroupId && (
        <GroupBookingDetailsModal
          groupId={selectedGroupId}
          profile={profile}
          showToast={showToast}
          onClose={() => setSelectedGroupId(null)}
          onUpdate={fetchGroups}
        />
      )}
    </div>
  );
}

