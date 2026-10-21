"use client";

import { useState } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import {
  Btn, Card, ConfirmModal, EmptyBlock, Modal, Pill, SearchInput,
  StatCard, StatGrid, StatusPill, font, inputStyle, labelStyle, mono,
} from "@/components/dashboard/kit";
import { formatBookingDate, formatINR, formatTime12, relativeTime } from "@/lib/dashboard/format";

export function AdminRejectGameModal({ game, busy, onClose, onConfirm }) {
  const presets = [
    "Participation fee not aligned with venue standard",
    "Inappropriate or unclear game title/description",
    "Turf schedule conflict or maintenance block",
    "Capacity exceeds safe player limit for venue",
    "Other administrative reason",
  ];

  const [reasonPreset, setReasonPreset] = useState(presets[0]);
  const [customText, setCustomText] = useState("");

  const effectiveReason = reasonPreset === "Other administrative reason"
    ? customText.trim()
    : (customText.trim() ? `${reasonPreset}: ${customText.trim()}` : reasonPreset);

  return (
    <Modal
      title={`Reject "${game.title}"?`}
      subtitle={`Submitted by ${game.owner_name} · ${game.turf?.name || "Turf"}`}
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>Back</Btn>
          <Btn
            variant="danger"
            busy={busy}
            disabled={!effectiveReason}
            onClick={() => onConfirm(effectiveReason)}
          >
            Confirm Rejection
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <p style={{ color: V.chalkDim, fontSize: 13, margin: 0 }}>
          Please specify why this game cannot be approved. The reason will be sent to the turf owner.
        </p>

        <div>
          <span style={labelStyle}>Rejection Reason</span>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {presets.map((p) => {
              const active = reasonPreset === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReasonPreset(p)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    textAlign: "left",
                    fontSize: 13,
                    fontFamily: font,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    background: active ? V.floodDim : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? V.flood : V.line}`,
                    color: active ? V.flood : V.chalk,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{active ? "●" : "○"}</span>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <label>
          <span style={labelStyle}>
            {reasonPreset === "Other administrative reason" ? "Specify reason (required)" : "Additional notes for the owner (optional)"}
          </span>
          <textarea
            rows={2}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="e.g. Please adjust the participation fee to match standard hourly rates..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
      </div>
    </Modal>
  );
}

export function AdminGamesTab({
  games = [],
  loading = false,
  onRefresh,
  showToast,
}) {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [busyGameId, setBusyGameId] = useState(null);
  const [rejectingGame, setRejectingGame] = useState(null);

  const pendingGames = games.filter((g) => g.approval_status === "pending" || g.status === "pending_approval");
  const approvedGames = games.filter((g) => g.approval_status === "approved");
  const rejectedGames = games.filter((g) => g.approval_status === "rejected" || g.status === "rejected");

  const filtered = games.filter((g) => {
    if (filter === "pending") {
      if (g.approval_status !== "pending" && g.status !== "pending_approval") return false;
    } else if (filter === "approved") {
      if (g.approval_status !== "approved") return false;
    } else if (filter === "rejected") {
      if (g.approval_status !== "rejected" && g.status !== "rejected") return false;
    } else if (filter === "cancelled") {
      if (g.status !== "cancelled") return false;
    } else if (filter === "completed") {
      if (g.status !== "completed") return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (g.title || "").toLowerCase().includes(q);
      const matchTurf = (g.turf?.name || "").toLowerCase().includes(q);
      const matchOwner = (g.owner_name || "").toLowerCase().includes(q);
      const matchSport = (g.sport || "").toLowerCase().includes(q);
      if (!matchTitle && !matchTurf && !matchOwner && !matchSport) return false;
    }

    return true;
  });

  const decideGame = async (game, decision, rejectionReason = null) => {
    setBusyGameId(game.id);
    try {
      const res = await fetch("/api/admin/games/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          decision,
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to process game decision.", { type: "error" });
        return;
      }

      showToast(
        decision === "approve"
          ? `"${game.title}" approved and published!`
          : `"${game.title}" rejected. Owner notified.`,
        { type: decision === "approve" ? "success" : "info" }
      );
      setRejectingGame(null);
      onRefresh();
    } catch {
      showToast("Network error. Try again.", { type: "error" });
    } finally {
      setBusyGameId(null);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ color: V.chalk, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: font }}>Community Game Approvals</h2>
          <p style={{ color: V.chalkDim, fontSize: 13, margin: "4px 0 0" }}>
            Review, approve, or reject owner-managed games before they are published to players.
          </p>
        </div>
        <Btn icon="refresh" size="sm" onClick={onRefresh}>Refresh</Btn>
      </div>

      <StatGrid>
        <StatCard title="Pending Review" value={pendingGames.length} icon="clock" color={pendingGames.length > 0 ? V.pending : undefined} />
        <StatCard title="Approved Games" value={approvedGames.length} icon="check" color={V.confirmed} />
        <StatCard title="Rejected Games" value={rejectedGames.length} icon="x" color={rejectedGames.length > 0 ? V.danger : undefined} />
        <StatCard title="Total Submitted" value={games.length} icon="trophy" />
      </StatGrid>

      <div style={{ marginTop: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "pending", label: `Pending Review (${pendingGames.length})` },
            { id: "approved", label: `Approved (${approvedGames.length})` },
            { id: "rejected", label: `Rejected (${rejectedGames.length})` },
            { id: "cancelled", label: "Cancelled" },
            { id: "completed", label: "Completed" },
            { id: "all", label: `All (${games.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                background: filter === tab.id ? V.floodDim : "transparent",
                border: `1px solid ${filter === tab.id ? V.flood : V.line}`,
                borderRadius: 8,
                padding: "6px 14px",
                color: filter === tab.id ? V.flood : V.chalkDim,
                fontWeight: filter === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by game, turf, owner..."
          style={{ maxWidth: 280 }}
        />
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card pad={20}><div style={{ color: V.chalkDim }}>Loading community games…</div></Card>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyBlock
          emoji="🏆"
          title={filter === "pending" ? "No games awaiting approval" : "No games match filter"}
          subtitle={filter === "pending" ? "When owners schedule community games, they will appear here for review." : "Try clearing filters to see more games."}
        />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map((g) => {
            const isPending = g.approval_status === "pending" || g.status === "pending_approval";
            const potentialCollection = (g.max_players || 0) * (Number(g.price_per_player) || 0);
            const busy = busyGameId === g.id;

            return (
              <Card key={g.id} pad={20}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ minWidth: 280, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ color: V.chalk, fontWeight: 800, fontSize: 16 }}>{g.title}</span>
                      <Pill color={V.sky}>{g.sport}</Pill>
                      <StatusPill status={isPending ? "pending_approval" : g.approval_status === "rejected" ? "rejected" : g.status} />
                    </div>

                    <div style={{ color: V.chalkDim, fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      <span>🏟️ Turf: <strong style={{ color: V.chalk }}>{g.turf?.name || "Turf"}</strong> ({g.turf?.city || ""})</span>
                      <span>👤 Owner: <strong style={{ color: V.chalk }}>{g.owner_name || "Owner"}</strong></span>
                      {g.owner_email && <span>📧 {g.owner_email}</span>}
                    </div>

                    <div style={{ color: V.chalkDim, fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      <span>📅 Date: <strong style={{ color: V.chalk }}>{formatBookingDate(g.match_date)}</strong></span>
                      <span>⏰ Schedule: <strong style={{ color: V.chalk }}>{formatTime12(g.start_time)} – {formatTime12(g.end_time || g.start_time)}</strong></span>
                      <span>👥 Capacity: <strong style={{ color: V.chalk, fontFamily: mono }}>{g.max_players} players</strong></span>
                    </div>

                    {g.description && (
                      <div style={{ color: V.chalkFaint, fontSize: 12.5, marginTop: 8, fontStyle: "italic" }}>
                        "{g.description}"
                      </div>
                    )}

                    {g.approval_status === "rejected" && g.rejection_reason && (
                      <div style={{
                        marginTop: 10,
                        background: "rgba(239,68,68,0.08)",
                        border: `1px solid ${V.danger}44`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: V.danger,
                        fontSize: 12.5,
                      }}>
                        <strong>Rejection Reason:</strong> {g.rejection_reason}
                      </div>
                    )}

                    <div style={{
                      display: "flex",
                      gap: 20,
                      flexWrap: "wrap",
                      marginTop: 14,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${V.line}`,
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                    }}>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Individual Fee: </span>
                        <strong style={{ color: V.flood, fontFamily: font }}>{formatINR(g.price_per_player)}</strong>
                      </div>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Potential Collection: </span>
                        <strong style={{ color: V.chalk, fontFamily: font }}>{formatINR(potentialCollection)}</strong>
                      </div>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Joined Players: </span>
                        <strong style={{ color: V.chalk, fontFamily: mono }}>{g.participant_count || 0}/{g.max_players}</strong>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Btn
                        variant="danger"
                        icon="x"
                        disabled={busy}
                        onClick={() => setRejectingGame(g)}
                      >
                        Reject
                      </Btn>
                      <Btn
                        variant="primary"
                        icon="check"
                        busy={busy}
                        onClick={() => decideGame(g, "approve")}
                      >
                        Approve Game
                      </Btn>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {rejectingGame && (
        <AdminRejectGameModal
          game={rejectingGame}
          busy={busyGameId === rejectingGame.id}
          onClose={() => setRejectingGame(null)}
          onConfirm={(reason) => decideGame(rejectingGame, "reject", reason)}
        />
      )}
    </>
  );
}
