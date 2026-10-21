"use client";

import { useState } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import {
  Btn, Card, ConfirmModal, EmptyBlock, Icon, Modal, Pill, SearchInput,
  StatCard, StatGrid, StatusPill, font, inputStyle, labelStyle, mono,
} from "@/components/dashboard/kit";
import { formatBookingDate, formatINR, formatTime12, relativeTime } from "@/lib/dashboard/format";

export function CreateGameModal({ turfs, onClose, onCreated, showToast }) {
  const activeTurfs = (turfs || []).filter((t) => t.status === "live" && !t.archived_at);
  const [turfId, setTurfId] = useState(activeTurfs[0]?.id || "");
  const selectedTurf = activeTurfs.find((t) => t.id === turfId) || activeTurfs[0];

  const sports = selectedTurf?.sports || ["Football", "Cricket"];
  const [sport, setSport] = useState(sports[0] || "Football");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [matchDate, setMatchDate] = useState(today);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [pricePerPlayer, setPricePerPlayer] = useState("150");
  const [skillLevel, setSkillLevel] = useState("Any");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numMax = parseInt(maxPlayers, 10) || 0;
  const numPrice = parseFloat(pricePerPlayer) || 0;
  const potentialCollection = numMax * numPrice;

  const handleTurfChange = (newTurfId) => {
    setTurfId(newTurfId);
    const newTurf = activeTurfs.find((t) => t.id === newTurfId);
    if (newTurf?.sports?.length) {
      setSport(newTurf.sports[0]);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!turfId) {
      setError("Please select an active turf.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setError("Please provide a title with at least 3 characters.");
      return;
    }
    if (!matchDate || matchDate < today) {
      setError("Game date must be today or in the future.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    if (numMax < 2 || numMax > 50) {
      setError("Participants must be between 2 and 50.");
      return;
    }
    if (numPrice < 0) {
      setError("Participation fee must be non-negative.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turfId,
          sport,
          title: title.trim(),
          description: description.trim(),
          matchDate,
          startTime,
          endTime,
          maxPlayers: numMax,
          pricePerPlayer: numPrice,
          skillLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit game.");
        setSubmitting(false);
        return;
      }

      showToast("Game submitted for admin approval! 🎉", { type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Create game error:", err);
      setError("Connection failed. Check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create Community Game"
      subtitle="Schedule an open game at your turf with individual player tickets."
      onClose={onClose}
      maxWidth={540}
      footer={
        <>
          <Btn onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" busy={submitting} onClick={handleSubmit}>
            Submit for Admin Approval
          </Btn>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: `1px solid ${V.danger}55`,
            borderRadius: 8,
            padding: "10px 14px",
            color: V.danger,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <label>
          <span style={labelStyle}>Select Turf</span>
          {activeTurfs.length === 0 ? (
            <div style={{ color: V.danger, fontSize: 13 }}>
              You do not have any active, approved turfs. Please add or wait for turf approval before creating games.
            </div>
          ) : (
            <select
              style={inputStyle}
              value={turfId}
              onChange={(e) => handleTurfChange(e.target.value)}
            >
              {activeTurfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          )}
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span style={labelStyle}>Sport</span>
            <select
              style={inputStyle}
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              {(selectedTurf?.sports || ["Football", "Cricket", "Basketball", "Badminton"]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Skill Level</span>
            <select
              style={inputStyle}
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
            >
              <option value="Any">Any Skill Level</option>
              <option value="Beginner">Beginner Friendly</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced / Competitive</option>
            </select>
          </label>
        </div>

        <label>
          <span style={labelStyle}>Game Title</span>
          <input
            style={inputStyle}
            placeholder="e.g. Sunday Night 5v5 Friendly"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          <span style={labelStyle}>Rules / Notes (Optional)</span>
          <textarea
            style={{ ...inputStyle, resize: "vertical" }}
            rows={2}
            placeholder="e.g. Turf shoes only, bibs and match ball provided..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
          <label>
            <span style={labelStyle}>Date</span>
            <input
              type="date"
              style={inputStyle}
              min={today}
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
            />
          </label>
          <label>
            <span style={labelStyle}>Start Time</span>
            <input
              type="time"
              style={inputStyle}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label>
            <span style={labelStyle}>End Time</span>
            <input
              type="time"
              style={inputStyle}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span style={labelStyle}>Max Participants</span>
            <input
              type="number"
              style={inputStyle}
              min={2}
              max={50}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              required
            />
          </label>
          <label>
            <span style={labelStyle}>Individual Fee (₹ per player)</span>
            <input
              type="number"
              style={inputStyle}
              min={0}
              step="10"
              value={pricePerPlayer}
              onChange={(e) => setPricePerPlayer(e.target.value)}
              required
            />
          </label>
        </div>

        {/* Live Potential Collection Card */}
        <div style={{
          background: V.floodDim,
          border: `1px solid ${V.flood}4D`,
          borderRadius: 10,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Total Potential Collection
            </div>
            <div style={{ color: V.chalkDim, fontSize: 12, marginTop: 2 }}>
              {numMax} players × {formatINR(numPrice)} / player
            </div>
          </div>
          <div style={{ color: V.flood, fontFamily: font, fontSize: 22, fontWeight: 800 }}>
            {formatINR(potentialCollection)}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function EditGameModal({ game, onClose, onUpdated, showToast }) {
  const [title, setTitle] = useState(game.title || "");
  const [description, setDescription] = useState(game.description || "");
  const [maxPlayers, setMaxPlayers] = useState(String(game.max_players || 10));
  const [pricePerPlayer, setPricePerPlayer] = useState(String(game.price_per_player || 0));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numMax = parseInt(maxPlayers, 10) || 0;
  const numPrice = parseFloat(pricePerPlayer) || 0;

  const handleUpdate = async () => {
    setError("");
    if (!title.trim() || title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (numMax < 2 || numMax > 50) {
      setError("Max participants must be between 2 and 50.");
      return;
    }
    if (numPrice < 0) {
      setError("Fee must be non-negative.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/owner/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: title.trim(),
          description: description.trim(),
          maxPlayers: numMax,
          pricePerPlayer: numPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update game.");
        setSubmitting(false);
        return;
      }

      showToast("Game updated successfully.", { type: "success" });
      onUpdated();
      onClose();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit Community Game"
      subtitle="Modify game details while it is pending admin approval."
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <Btn onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" busy={submitting} onClick={handleUpdate}>Save Changes</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {error && <div style={{ color: V.danger, fontSize: 13 }}>{error}</div>}
        <label>
          <span style={labelStyle}>Game Title</span>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span style={labelStyle}>Description</span>
          <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span style={labelStyle}>Max Participants</span>
            <input type="number" style={inputStyle} min={2} max={50} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
          </label>
          <label>
            <span style={labelStyle}>Fee per Player (₹)</span>
            <input type="number" style={inputStyle} min={0} value={pricePerPlayer} onChange={(e) => setPricePerPlayer(e.target.value)} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

export function OwnerGamesTab({
  games = [],
  turfs = [],
  loading = false,
  onRefresh,
  showToast,
  onCreateClick,
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingGame, setCancellingGame] = useState(null);
  const [cancellingBusy, setCancellingBusy] = useState(false);
  const [editingGame, setEditingGame] = useState(null);

  const filteredGames = games.filter((g) => {
    if (filterStatus === "pending") {
      if (g.approval_status !== "pending" && g.status !== "pending_approval") return false;
    } else if (filterStatus === "approved") {
      if (g.approval_status !== "approved" || g.status === "cancelled" || g.status === "completed") return false;
    } else if (filterStatus === "rejected") {
      if (g.approval_status !== "rejected" && g.status !== "rejected") return false;
    } else if (filterStatus === "cancelled") {
      if (g.status !== "cancelled") return false;
    } else if (filterStatus === "completed") {
      if (g.status !== "completed") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (g.title || "").toLowerCase().includes(q);
      const matchTurf = (g.turf?.name || "").toLowerCase().includes(q);
      const matchSport = (g.sport || "").toLowerCase().includes(q);
      if (!matchTitle && !matchTurf && !matchSport) return false;
    }

    return true;
  });

  const pendingCount = games.filter((g) => g.approval_status === "pending" || g.status === "pending_approval").length;
  const approvedCount = games.filter((g) => g.approval_status === "approved" && g.status === "open").length;
  const totalPotential = games.reduce((acc, g) => acc + (Number(g.max_players || 0) * Number(g.price_per_player || 0)), 0);

  const handleCancelConfirm = async () => {
    if (!cancellingGame) return;
    setCancellingBusy(true);
    try {
      const res = await fetch(`/api/owner/games/${cancellingGame.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to cancel game.", { type: "error" });
        return;
      }
      showToast("Game cancelled.", { type: "info" });
      setCancellingGame(null);
      onRefresh();
    } catch {
      showToast("Network error. Try again.", { type: "error" });
    } finally {
      setCancellingBusy(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ color: V.chalk, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: font }}>Community Games</h2>
          <p style={{ color: V.chalkDim, fontSize: 13, margin: "4px 0 0" }}>
            Create and manage open games at your turfs with individual ticket pricing.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn icon="refresh" size="sm" onClick={onRefresh}>Refresh</Btn>
          <Btn variant="primary" icon="plus" onClick={onCreateClick}>Create Game</Btn>
        </div>
      </div>

      <StatGrid>
        <StatCard title="Total Games" value={games.length} icon="trophy" />
        <StatCard title="Pending Review" value={pendingCount} icon="clock" color={pendingCount > 0 ? V.pending : undefined} />
        <StatCard title="Approved & Live" value={approvedCount} icon="check" color={V.confirmed} />
        <StatCard title="Total Capacity Value" value={formatINR(totalPotential)} icon="rupee" />
      </StatGrid>

      <div style={{ marginTop: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${games.length})` },
            { id: "pending", label: `Pending Approval (${pendingCount})` },
            { id: "approved", label: `Approved (${approvedCount})` },
            { id: "rejected", label: "Rejected" },
            { id: "cancelled", label: "Cancelled" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              style={{
                background: filterStatus === tab.id ? V.floodDim : "transparent",
                border: `1px solid ${filterStatus === tab.id ? V.flood : V.line}`,
                borderRadius: 8,
                padding: "6px 14px",
                color: filterStatus === tab.id ? V.flood : V.chalkDim,
                fontWeight: filterStatus === tab.id ? 700 : 500,
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
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search games, turfs, sports..."
          style={{ maxWidth: 280 }}
        />
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Card pad={20}><div style={{ color: V.chalkDim }}>Loading games…</div></Card>
        </div>
      ) : filteredGames.length === 0 ? (
        <EmptyBlock
          emoji="🏆"
          title="No community games found"
          subtitle={
            filterStatus !== "all"
              ? "No games match the selected status filter."
              : "You haven't created any community games yet. Schedule a game to let individual players join and play!"
          }
          action={filterStatus === "all" ? <Btn variant="primary" icon="plus" onClick={onCreateClick}>Create First Game</Btn> : undefined}
        />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredGames.map((g) => {
            const isPending = g.approval_status === "pending" || g.status === "pending_approval";
            const isRejected = g.approval_status === "rejected" || g.status === "rejected";
            const isCancelled = g.status === "cancelled";
            const isFull = g.status === "full" || g.participant_count >= g.max_players;
            const potential = (g.max_players || 0) * (Number(g.price_per_player) || 0);

            return (
              <Card key={g.id} pad={20}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ minWidth: 260, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ color: V.chalk, fontWeight: 800, fontSize: 16 }}>{g.title}</span>
                      <Pill color={V.sky}>{g.sport}</Pill>
                      <StatusPill status={isPending ? "pending_approval" : isRejected ? "rejected" : g.status} />
                      {isFull && <Pill color={V.danger}>Full Capacity</Pill>}
                    </div>

                    <div style={{ color: V.chalkDim, fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      <span>🏟️ <strong style={{ color: V.chalk }}>{g.turf?.name || "Turf"}</strong> ({g.turf?.city || ""})</span>
                      <span>📅 {formatBookingDate(g.match_date)}</span>
                      <span>⏰ {formatTime12(g.start_time)} – {formatTime12(g.end_time || g.start_time)}</span>
                    </div>

                    {g.description && (
                      <div style={{ color: V.chalkFaint, fontSize: 12.5, marginTop: 6, fontStyle: "italic" }}>
                        "{g.description}"
                      </div>
                    )}

                    {isRejected && g.rejection_reason && (
                      <div style={{
                        marginTop: 10,
                        background: "rgba(239,68,68,0.08)",
                        border: `1px solid ${V.danger}44`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: V.danger,
                        fontSize: 12.5,
                      }}>
                        <strong>Admin Rejection Reason:</strong> {g.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12, fontSize: 13 }}>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Spots: </span>
                        <strong style={{ color: V.chalk, fontFamily: mono }}>{g.participant_count || 0}/{g.max_players}</strong>
                      </div>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Fee per Player: </span>
                        <strong style={{ color: V.flood, fontFamily: font }}>{formatINR(g.price_per_player)}</strong>
                      </div>
                      <div>
                        <span style={{ color: V.chalkFaint }}>Total Potential: </span>
                        <strong style={{ color: V.chalk, fontFamily: font }}>{formatINR(potential)}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {isPending && (
                      <Btn size="sm" onClick={() => setEditingGame(g)}>Edit Details</Btn>
                    )}
                    {!isCancelled && g.status !== "completed" && (
                      <Btn
                        variant="danger"
                        size="sm"
                        onClick={() => setCancellingGame(g)}
                      >
                        Cancel Game
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {cancellingGame && (
        <ConfirmModal
          title={`Cancel "${cancellingGame.title}"?`}
          message="Are you sure you want to cancel this game? Players who have joined will be notified, and the turf slot will reopen."
          confirmLabel="Cancel Game"
          busy={cancellingBusy}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancellingGame(null)}
        />
      )}

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onUpdated={onRefresh}
          showToast={showToast}
        />
      )}
    </>
  );
}
