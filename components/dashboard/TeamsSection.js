"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { SPORT_OPTIONS } from "@/lib/sports";
import { formatBookingDate, formatTime12 } from "@/lib/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/api-response";

export function TeamsSection({ profile, showToast, onSelectTeamForBooking }) {
  const [myTeams, setMyTeams] = useState([]);
  const [otherTeams, setOtherTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [activeTab, setActiveTab] = useState("my"); // "my" or "browse"
  const [joinToken, setJoinToken] = useState("");
  const [joining, setJoining] = useState(false);

  // Check URL query param for joinTeam
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("joinTeam");
      if (token) {
        setJoinToken(token);
        handleJoinTeam(token);
      }
    }
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (res.ok) {
        setMyTeams(data.myTeams || []);
        setOtherTeams(data.otherTeams || []);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not load teams. Check your connection.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const openTeamDetail = async (teamId) => {
    setTeamDetailLoading(true);
    setSelectedTeam(null);
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedTeam(data.team);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not load team details.", { type: "error" });
    } finally {
      setTeamDetailLoading(false);
    }
  };

  const handleJoinTeam = async (tokenToUse) => {
    const token = tokenToUse || joinToken;
    if (!token.trim()) {
      showToast("Please enter an invitation token.", { type: "info" });
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully joined "${data.teamName}"!`, { type: "success" });
        setJoinToken("");
        fetchTeams();
        if (data.teamId) openTeamDetail(data.teamId);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Failed to join team.", { type: "error" });
    } finally {
      setJoining(false);
    }
  };

  const handleRemoveMember = async (teamId, playerId, isSelf) => {
    if (!confirm(isSelf ? "Are you sure you want to leave this team?" : "Remove this player from the roster?")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, action: isSelf ? "leave" : "remove" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Roster updated.", { type: "success" });
        if (isSelf) {
          setSelectedTeam(null);
          fetchTeams();
        } else {
          openTeamDetail(teamId);
        }
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Failed to update roster.", { type: "error" });
    }
  };

  const handleRevokeInvite = async (teamId, token) => {
    if (!confirm("Revoke this invite link? Anyone with this link will no longer be able to join.")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Invitation link revoked.", { type: "success" });
        openTeamDetail(teamId);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Failed to revoke invite.", { type: "error" });
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: V.chalk, margin: 0 }}>Team Management</h1>
          <p style={{ fontSize: 14, color: V.chalkDim, marginTop: 4 }}>
            Create squads, manage rosters, share private invite links, and track team match bookings.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: V.flood, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span>+</span> Create Team
          </button>
        </div>
      </div>

      {/* Join Team by Token Banner */}
      <div style={{
        background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 12,
        padding: "16px 20px", marginBottom: 24, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: V.chalk }}>Have an invitation code or link?</div>
          <div style={{ fontSize: 12.5, color: V.chalkDim, marginTop: 2 }}>Enter your captain’s invitation code below to join the squad.</div>
        </div>
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 380 }}>
          <input
            type="text"
            placeholder="Paste invite token here…"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            style={{
              flex: 1, padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`,
              borderRadius: 8, color: V.chalk, fontSize: 13,
            }}
          />
          <button
            onClick={() => handleJoinTeam()}
            disabled={joining || !joinToken.trim()}
            style={{
              background: V.aqua || V.flood, color: "#000", border: "none", borderRadius: 8,
              padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: joining ? "wait" : "pointer",
            }}
          >
            {joining ? "Joining…" : "Join"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, borderBottom: `1px solid ${V.line}`, marginBottom: 20 }}>
        <button
          onClick={() => { setSelectedTeam(null); setActiveTab("my"); }}
          style={{
            padding: "10px 16px", background: "transparent", border: "none",
            borderBottom: activeTab === "my" ? `2px solid ${V.flood}` : "2px solid transparent",
            color: activeTab === "my" ? V.flood : V.chalkDim, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          My Teams ({myTeams.length})
        </button>
        <button
          onClick={() => { setSelectedTeam(null); setActiveTab("browse"); }}
          style={{
            padding: "10px 16px", background: "transparent", border: "none",
            borderBottom: activeTab === "browse" ? `2px solid ${V.flood}` : "2px solid transparent",
            color: activeTab === "browse" ? V.flood : V.chalkDim, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Community Teams ({otherTeams.length})
        </button>
      </div>

      {/* Detail View of Selected Team */}
      {selectedTeam ? (
        <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <button
                onClick={() => setSelectedTeam(null)}
                style={{ background: "transparent", border: "none", color: V.flood, fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}
              >
                ← Back to teams
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: V.floodDim,
                  color: V.flood, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800,
                }}>
                  {selectedTeam.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: V.chalk, margin: 0 }}>{selectedTeam.name}</h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                      {selectedTeam.sport}
                    </span>
                    <span style={{ fontSize: 12, color: V.chalkDim }}>
                      Captain: <strong>{selectedTeam.captain?.full_name || "Captain"}</strong>
                    </span>
                  </div>
                </div>
              </div>
              {selectedTeam.description && (
                <p style={{ fontSize: 13.5, color: V.chalkDim, marginTop: 12, maxWidth: 600 }}>{selectedTeam.description}</p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedTeam.isCaptain && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8,
                    padding: "8px 14px", color: V.chalk, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  🔗 Generate Private Invite Link
                </button>
              )}
              {selectedTeam.isMember && !selectedTeam.isCaptain && (
                <button
                  onClick={() => handleRemoveMember(selectedTeam.id, profile?.id, true)}
                  style={{
                    background: "transparent", border: `1px solid ${V.danger || "#ef4444"}`, borderRadius: 8,
                    padding: "8px 14px", color: V.danger || "#ef4444", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Leave Team
                </button>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: V.chalk, marginBottom: 12 }}>
              Team Roster ({selectedTeam.members?.length || 0})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Player</th>
                    <th style={{ padding: "8px 12px" }}>Role</th>
                    <th style={{ padding: "8px 12px" }}>Joined</th>
                    {selectedTeam.isCaptain && <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.members?.map((m) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                      <td style={{ padding: "12px", color: V.chalk, fontWeight: 600 }}>
                        {m.name}
                        {m.email && <div style={{ fontSize: 11, color: V.chalkFaint, fontWeight: 400 }}>{m.email}</div>}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: m.role === "captain" ? V.flood : V.pitch,
                          color: m.role === "captain" ? "#fff" : V.chalkDim,
                          border: `1px solid ${m.role === "captain" ? V.flood : V.line}`,
                        }}>
                          {m.role === "captain" ? "⭐ Captain" : "Member"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: V.chalkDim }}>
                        {m.joinedAt ? formatBookingDate(m.joinedAt.slice(0, 10)) : "Active"}
                      </td>
                      {selectedTeam.isCaptain && (
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          {m.role !== "captain" && (
                            <button
                              onClick={() => handleRemoveMember(selectedTeam.id, m.playerId, false)}
                              style={{
                                background: "transparent", border: "none", color: V.danger || "#ef4444",
                                fontSize: 12, cursor: "pointer", fontWeight: 600,
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Invites (for Captain) */}
          {selectedTeam.isCaptain && selectedTeam.invites?.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: V.chalk, marginBottom: 12 }}>
                Active Invitation Links
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                {selectedTeam.invites.map((inv) => (
                  <div key={inv.id} style={{
                    background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8,
                    padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                  }}>
                    <div style={{ fontSize: 12.5 }}>
                      <code style={{ color: V.flood, fontWeight: 700 }}>{inv.token}</code>
                      <span style={{ color: V.chalkDim, marginLeft: 10 }}>Uses: {inv.uses} / {inv.max_uses}</span>
                      <span style={{ color: V.chalkFaint, marginLeft: 10 }}>Expires: {formatBookingDate(inv.expires_at.slice(0, 10))}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/player?joinTeam=${inv.token}`;
                          navigator.clipboard.writeText(url);
                          showToast("Invite link copied to clipboard!", { type: "success" });
                        }}
                        style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: V.chalk, cursor: "pointer" }}
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(selectedTeam.id, inv.token)}
                        style={{ background: "transparent", border: `1px solid ${V.danger || "#ef4444"}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: V.danger || "#ef4444", cursor: "pointer" }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Bookings */}
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: V.chalk, marginBottom: 12 }}>
              Team Match Bookings ({selectedTeam.bookings?.length || 0})
            </h3>
            {selectedTeam.bookings?.length === 0 ? (
              <div style={{ color: V.chalkFaint, fontSize: 13, padding: 12 }}>
                No bookings recorded for this team yet. Choose &quot;Book on behalf of team&quot; when reserving a turf slot.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {selectedTeam.bookings.map((b) => (
                  <div key={b.id} style={{
                    background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8,
                    padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: V.chalk, fontSize: 14 }}>{b.turf?.name || "Turf Ground"}</div>
                      <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 2 }}>
                        {formatBookingDate(b.booking_date)} at {formatTime12(b.start_time)} • {b.sport}
                      </div>
                    </div>
                    <span style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: b.status === "confirmed" ? V.floodDim : V.pitch,
                      color: b.status === "confirmed" ? V.flood : V.chalkDim,
                      border: `1px solid ${b.status === "confirmed" ? V.flood : V.line}`,
                      textTransform: "capitalize",
                    }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Team Cards List */
        <div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (activeTab === "my" ? myTeams : otherTeams).length === 0 ? (
            <EmptyState
              icon="👥"
              title={activeTab === "my" ? "You haven't joined any teams yet" : "No other teams found"}
              description={activeTab === "my" ? "Create a team to manage rosters, generate invite links, and book grounds together." : "Be the first to create a public team for your favorite sport!"}
              actionLabel={activeTab === "my" ? "Create Team" : undefined}
              onAction={activeTab === "my" ? () => setShowCreateModal(true) : undefined}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {(activeTab === "my" ? myTeams : otherTeams).map((team) => (
                <div
                  key={team.id}
                  onClick={() => openTeamDetail(team.id)}
                  style={{
                    background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14,
                    padding: 20, cursor: "pointer", transition: "transform 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = V.flood; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = V.line; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: V.floodDim,
                      color: V.flood, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 800,
                    }}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                      {team.sport}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: V.chalk, marginTop: 14, marginBottom: 4 }}>
                    {team.name}
                  </h3>
                  <p style={{ fontSize: 12.5, color: V.chalkDim, margin: 0, minHeight: 36, lineClamp: 2 }}>
                    {team.description || "Active community sports team."}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${V.line}`, fontSize: 12, color: V.chalkFaint }}>
                    <span>Roster: <strong>{team.memberCount} members</strong></span>
                    {team.isCaptain && (
                      <span style={{ color: V.flood, fontWeight: 700 }}>⭐ Captain</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            showToast(`Team "${created.name}" created!`, { type: "success" });
            fetchTeams();
            openTeamDetail(created.id);
          }}
          showToast={showToast}
        />
      )}

      {/* GENERATE INVITE MODAL */}
      {showInviteModal && selectedTeam && (
        <InviteModal
          team={selectedTeam}
          onClose={() => setShowInviteModal(false)}
          onGenerated={(inv) => {
            setShowInviteModal(false);
            showToast("Private invitation link generated!", { type: "success" });
            openTeamDetail(selectedTeam.id);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onCreated, showToast }) {
  const [form, setForm] = useState({ name: "", sport: "Football", description: "", logoUrl: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.team);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not create team. Try again.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: 0 }}>Create a Team</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 20 }}>
          You will be assigned as the team captain. You can invite players and book venues together.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Team Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Indiranagar Strikers FC"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Sport *</label>
            <select
              value={form.sport}
              onChange={(e) => setForm({ ...form, sport: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
            >
              {SPORT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Description</label>
            <textarea
              rows={3}
              placeholder="Tell other players what kind of team this is (skill level, training days)..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 16px", color: V.chalk, fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !form.name.trim()}
              style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Creating…" : "Create Squad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteModal({ team, onClose, onGenerated, showToast }) {
  const [maxUses, setMaxUses] = useState(10);
  const [expiryHours, setExpiryHours] = useState(72);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUses, expiryHours }),
      });
      const data = await res.json();
      if (res.ok) {
        onGenerated(data.invite);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not generate invite link.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>Private Team Invite Link</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 16 }}>
          Generate a private join link for {team.name}. Anyone with this link can join your roster up to the max usage limit.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Max Uses</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Expires After</label>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
            >
              <option value={24}>24 hours</option>
              <option value={72}>3 days (72 hours)</option>
              <option value={168}>7 days (168 hours)</option>
              <option value={720}>30 days</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 16px", color: V.chalk, fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Generating…" : "Generate Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
