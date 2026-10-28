"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel } from "@/lib/design-tokens";
import { SPORT_OPTIONS } from "@/lib/sports";
import { formatBookingDate, formatINR, formatTime12 } from "@/lib/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/api-response";

export function TournamentsSection({ profile, showToast }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(null); // fixture object
  const [sportFilter, setSportFilter] = useState("all");

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const url = sportFilter !== "all" ? `/api/tournaments?sport=${sportFilter}` : "/api/tournaments";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTournaments(data.tournaments || []);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not load tournaments.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [sportFilter]);

  const openTournamentDetail = async (tourId) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tourId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedTour(data.tournament);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not load tournament details.", { type: "error" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateFixtures = async (tournamentId) => {
    if (!confirm("Generate initial round fixtures for this tournament?")) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fixtures`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Fixtures generated successfully!", { type: "success" });
        openTournamentDetail(tournamentId);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Failed to generate fixtures.", { type: "error" });
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: V.chalk, margin: 0 }}>Tournaments & Leagues</h1>
          <p style={{ fontSize: 14, color: V.chalkDim, marginTop: 4 }}>
            Competitive cups, leagues, fixtures, verified entry fees, transparent prize pools, and live standings.
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
            <span>+</span> Host Tournament
          </button>
        </div>
      </div>

      {/* Sport Filter Chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 20 }}>
        {["all", ...SPORT_OPTIONS.slice(0, 7)].map((s) => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              background: sportFilter === s ? V.flood : V.pitchCard,
              color: sportFilter === s ? "#fff" : V.chalkDim,
              border: `1px solid ${sportFilter === s ? V.flood : V.line}`,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {s === "all" ? "All Sports" : s}
          </button>
        ))}
      </div>

      {/* TOURNAMENT DETAIL VIEW */}
      {selectedTour ? (
        <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <button
            onClick={() => setSelectedTour(null)}
            style={{ background: "transparent", border: "none", color: V.flood, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}
          >
            ← Back to tournaments
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                  {selectedTour.sport}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.pitch, color: V.chalkDim, border: `1px solid ${V.line}`, textTransform: "capitalize" }}>
                  {selectedTour.format}
                </span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700, textTransform: "capitalize",
                  background: selectedTour.status === "open" ? V.floodDim : V.pitch,
                  color: selectedTour.status === "open" ? V.flood : V.chalkDim,
                  border: `1px solid ${selectedTour.status === "open" ? V.flood : V.line}`,
                }}>
                  {selectedTour.status.replace("_", " ")}
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: V.chalk, margin: 0 }}>{selectedTour.title}</h2>
              <div style={{ fontSize: 13, color: V.chalkDim, marginTop: 4 }}>
                Hosted at <strong>{selectedTour.turf?.name || "Turf Ground"}</strong> • {selectedTour.turf?.city}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedTour.status === "open" && !selectedTour.userRegistration && (
                <button
                  onClick={() => setShowRegisterModal(true)}
                  style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Register Team ({formatINR(selectedTour.entry_fee)})
                </button>
              )}
              {selectedTour.userRegistration && (
                <span style={{ padding: "8px 14px", borderRadius: 8, background: V.floodDim, color: V.flood, fontWeight: 700, fontSize: 12.5 }}>
                  ✓ Registered as {selectedTour.userRegistration.team_name}
                </span>
              )}
              {(selectedTour.isOrganizer || selectedTour.isAdmin) && (
                <button
                  onClick={() => handleGenerateFixtures(selectedTour.id)}
                  style={{ background: V.pitch, border: `1px solid ${V.line}`, color: V.chalk, borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
                >
                  ⚡ Generate Fixtures
                </button>
              )}
            </div>
          </div>

          {/* Transparent Financial Highlights Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 20 }}>
            <div style={{ background: V.pitch, padding: 14, borderRadius: 10, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Entry Fee / Team</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: V.chalk, marginTop: 4 }}>{formatINR(selectedTour.entry_fee)}</div>
            </div>
            <div style={{ background: V.pitch, padding: 14, borderRadius: 10, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Guaranteed Prize Pool</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: V.aqua || V.flood, marginTop: 4 }}>{formatINR(selectedTour.prize_pool)}</div>
            </div>
            <div style={{ background: V.pitch, padding: 14, borderRadius: 10, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Registered Teams</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: V.chalk, marginTop: 4 }}>
                {selectedTour.registrations?.length || 0} / {selectedTour.max_teams}
              </div>
            </div>
            <div style={{ background: V.pitch, padding: 14, borderRadius: 10, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 11, color: V.chalkFaint, textTransform: "uppercase", fontWeight: 700 }}>Dates</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: V.chalk, marginTop: 6 }}>
                {formatBookingDate(selectedTour.start_date)} - {formatBookingDate(selectedTour.end_date)}
              </div>
            </div>
          </div>

          {/* Rules and Description */}
          {selectedTour.rules && (
            <div style={{ marginTop: 24, padding: 16, background: V.pitch, borderRadius: 10, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: V.chalkDim, textTransform: "uppercase", marginBottom: 6 }}>Tournament Rules & Guidelines</div>
              <div style={{ fontSize: 13, color: V.chalk, lineHeight: 1.5, whiteSpace: "pre-line" }}>{selectedTour.rules}</div>
            </div>
          )}

          {/* Fixtures & Scores */}
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: V.chalk, marginBottom: 12 }}>
              Fixtures & Match Results ({selectedTour.fixtures?.length || 0})
            </h3>
            {selectedTour.fixtures?.length === 0 ? (
              <div style={{ color: V.chalkFaint, fontSize: 13, padding: "16px 0" }}>
                Fixtures will be generated once team registration completes.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {selectedTour.fixtures.map((f) => {
                  const homeTeam = selectedTour.registrations?.find((r) => r.id === f.home_registration_id);
                  const awayTeam = selectedTour.registrations?.find((r) => r.id === f.away_registration_id);

                  return (
                    <div key={f.id} style={{
                      background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 10,
                      padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 11, color: V.chalkFaint, fontWeight: 700 }}>M#{f.match_number}</span>
                        <div style={{ fontSize: 14, fontWeight: 700, color: V.chalk }}>
                          <span style={{ color: f.winner_registration_id === f.home_registration_id ? V.flood : V.chalk }}>
                            {homeTeam?.team_name || "TBD"}
                          </span>
                          <span style={{ color: V.chalkFaint, margin: "0 10px" }}>vs</span>
                          <span style={{ color: f.winner_registration_id === f.away_registration_id ? V.flood : V.chalk }}>
                            {awayTeam?.team_name || "TBD"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {f.status === "completed" ? (
                          <div style={{ fontSize: 16, fontWeight: 800, color: V.chalk, background: V.pitchCard, padding: "4px 12px", borderRadius: 8, border: `1px solid ${V.line}` }}>
                            {f.home_score} - {f.away_score}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: V.chalkFaint }}>Scheduled</span>
                        )}

                        {(selectedTour.isOrganizer || selectedTour.isAdmin) && (
                          <button
                            onClick={() => setShowScoreModal(f)}
                            style={{ background: "transparent", border: `1px solid ${V.line}`, color: V.chalk, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            {f.status === "completed" ? "Edit Score" : "Enter Score"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standings Table */}
          {selectedTour.standings?.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: V.chalk, marginBottom: 12 }}>
                Tournament Standings
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Team</th>
                      <th style={{ padding: "8px 12px" }}>P</th>
                      <th style={{ padding: "8px 12px" }}>W</th>
                      <th style={{ padding: "8px 12px" }}>D</th>
                      <th style={{ padding: "8px 12px" }}>L</th>
                      <th style={{ padding: "8px 12px" }}>GD</th>
                      <th style={{ padding: "8px 12px" }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTour.standings.map((s, idx) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                        <td style={{ padding: "10px 12px", color: V.chalk, fontWeight: 700 }}>
                          #{idx + 1} {s.teamName}
                        </td>
                        <td style={{ padding: "10px 12px", color: V.chalkDim }}>{s.played}</td>
                        <td style={{ padding: "10px 12px", color: V.chalkDim }}>{s.won}</td>
                        <td style={{ padding: "10px 12px", color: V.chalkDim }}>{s.drawn}</td>
                        <td style={{ padding: "10px 12px", color: V.chalkDim }}>{s.lost}</td>
                        <td style={{ padding: "10px 12px", color: V.chalkDim }}>{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                        <td style={{ padding: "10px 12px", color: V.flood, fontWeight: 800 }}>{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tournament Cards Grid */
        <div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : tournaments.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No tournaments currently scheduled"
              description="Be the first organizer to host a cup or tournament on Velocity Turf!"
              actionLabel="Host Tournament"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTournamentDetail(t.id)}
                  style={{
                    background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14,
                    padding: 20, cursor: "pointer", transition: "transform 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = V.flood; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = V.line; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                      {t.sport}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700, textTransform: "capitalize",
                      background: t.status === "open" ? V.floodDim : V.pitch,
                      color: t.status === "open" ? V.flood : V.chalkDim,
                      border: `1px solid ${t.status === "open" ? V.flood : V.line}`,
                    }}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, marginTop: 12, marginBottom: 4 }}>
                    {t.title}
                  </h3>
                  <div style={{ fontSize: 12.5, color: V.chalkDim }}>
                    📍 {t.turf?.name || "Turf"} • {t.turf?.city}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, padding: "12px 0", borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}` }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: V.chalkFaint, textTransform: "uppercase" }}>Entry Fee</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: V.chalk }}>{formatINR(t.entryFee)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: V.chalkFaint, textTransform: "uppercase" }}>Prize Pool</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: V.aqua || V.flood }}>{formatINR(t.prizePool)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12, color: V.chalkFaint }}>
                    <span>Teams: <strong>{t.registeredTeamsCount} / {t.maxTeams}</strong></span>
                    <span>Starts: <strong>{formatBookingDate(t.startDate)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            showToast(`Tournament "${created.title}" submitted!`, { type: "success" });
            fetchTournaments();
            openTournamentDetail(created.id);
          }}
          showToast={showToast}
        />
      )}

      {/* REGISTER TEAM MODAL */}
      {showRegisterModal && selectedTour && (
        <RegisterTournamentModal
          tournament={selectedTour}
          profile={profile}
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => {
            setShowRegisterModal(false);
            showToast("Team successfully registered for tournament!", { type: "success" });
            openTournamentDetail(selectedTour.id);
          }}
          showToast={showToast}
        />
      )}

      {/* ENTER MATCH SCORE MODAL */}
      {showScoreModal && selectedTour && (
        <ScoreModal
          fixture={showScoreModal}
          tournament={selectedTour}
          onClose={() => setShowScoreModal(null)}
          onSaved={() => {
            setShowScoreModal(null);
            showToast("Match score updated!", { type: "success" });
            openTournamentDetail(selectedTour.id);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateTournamentModal({ onClose, onCreated, showToast }) {
  const [turfs, setTurfs] = useState([]);
  const [form, setForm] = useState({
    turfId: "",
    title: "",
    description: "",
    sport: "Football",
    format: "knockout",
    teamSize: 5,
    maxTeams: 8,
    entryFee: 1000,
    prizePool: 6000,
    rules: "Match duration: 2 halves of 20 mins. Direct red card results in 1-match suspension.",
    registrationDeadline: "",
    startDate: "",
    endDate: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/bookings")
      .catch(() => {})
      .then(async () => {
        // Fetch live turfs
        const res = await fetch("/api/admin/turfs/decision").catch(() => null);
      });
    // Load turfs
    const loadTurfs = async () => {
      try {
        const res = await fetch("/api/turfs?status=live").catch(() => null);
        if (res?.ok) {
          const d = await res.json();
          setTurfs(d.turfs || []);
          if (d.turfs?.[0]) setForm((f) => ({ ...f, turfId: d.turfs[0].id }));
        }
      } catch {}
    };
    loadTurfs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.turfId || !form.title) {
      showToast("Please complete required fields and select a venue.", { type: "info" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.tournament);
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not create tournament.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: 0 }}>Host a Tournament</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 20 }}>
          Organize leagues, knockouts, set rules, collect verified entry fees, and broadcast live scores.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Tournament Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bangalore Monsoon Cup 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
              >
                <option value="knockout">Knockout Bracket</option>
                <option value="league">League / Round-Robin</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Venue (Turf) ID *</label>
            <input
              type="text"
              required
              placeholder="Enter Turf Venue UUID"
              value={form.turfId}
              onChange={(e) => setForm({ ...form, turfId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Entry Fee per Team (₹)</label>
              <input
                type="number"
                min={0}
                value={form.entryFee}
                onChange={(e) => setForm({ ...form, entryFee: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Prize Pool (₹)</label>
              <input
                type="number"
                min={0}
                value={form.prizePool}
                onChange={(e) => setForm({ ...form, prizePool: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Reg. Deadline</label>
              <input
                type="date"
                required
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                style={{ width: "100%", padding: "8px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Start Date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                style={{ width: "100%", padding: "8px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 12.5 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>End Date</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                style={{ width: "100%", padding: "8px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 12.5 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Rules & Regulations</label>
            <textarea
              rows={3}
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
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
              disabled={busy}
              style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Submitting…" : "Host Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RegisterTournamentModal({ tournament, profile, onClose, onRegistered, showToast }) {
  const [teamName, setTeamName] = useState(profile?.full_name ? `${profile.full_name}'s Team` : "");
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    if (!teamName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: teamName.trim(), clientReportedAmount: tournament.entry_fee }),
      });
      const data = await res.json();
      if (res.ok) {
        onRegistered();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Registration failed. Please try again.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>Register for Tournament</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 16 }}>
          {tournament.title} • {tournament.sport}
        </p>

        <div style={{ background: V.pitch, padding: 14, borderRadius: 10, border: `1px solid ${V.line}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: V.chalkDim }}>
            <span>Entry Fee</span>
            <strong style={{ color: V.chalk }}>{formatINR(tournament.entry_fee)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: V.chalkDim, marginTop: 6 }}>
            <span>Payment Mode</span>
            <span style={{ color: V.flood, fontWeight: 700 }}>Simulated Demo Checkout</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Team Name *</label>
          <input
            type="text"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13.5 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 16px", color: V.chalk, fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleRegister}
            disabled={busy || !teamName.trim()}
            style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer" }}
          >
            {busy ? "Confirming…" : `Confirm & Pay ${formatINR(tournament.entry_fee)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreModal({ fixture, tournament, onClose, onSaved, showToast }) {
  const [homeScore, setHomeScore] = useState(fixture.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(fixture.away_score ?? 0);
  const [busy, setBusy] = useState(false);

  const homeTeam = tournament.registrations?.find((r) => r.id === fixture.home_registration_id)?.team_name || "Home Team";
  const awayTeam = tournament.registrations?.find((r) => r.id === fixture.away_registration_id)?.team_name || "Away Team";

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId: fixture.id, homeScore, awayScore }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not save score.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 400, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>Record Match Score</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 16 }}>
          Match #{fixture.match_number} • Round {fixture.round}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: V.chalk, marginBottom: 8 }}>{homeTeam}</div>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(Number(e.target.value))}
              style={{ width: 64, padding: "8px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 18, textAlign: "center", fontWeight: 800 }}
            />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: V.chalkFaint, marginTop: 20 }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: V.chalk, marginBottom: 8 }}>{awayTeam}</div>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(Number(e.target.value))}
              style={{ width: 64, padding: "8px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 18, textAlign: "center", fontWeight: 800 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 16px", color: V.chalk, fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer" }}
          >
            {busy ? "Saving…" : "Save Score"}
          </button>
        </div>
      </div>
    </div>
  );
}
