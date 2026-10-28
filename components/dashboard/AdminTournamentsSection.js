"use client";

import { useState, useEffect } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import { EmptyBlock, Card, Pill } from "@/components/dashboard/kit";
import { extractErrorMessage } from "@/lib/api-response";

export function AdminTournamentsSection({ showToast }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      if (res.ok) {
        setTournaments(data.tournaments || []);
      }
    } catch {
      showToast("Could not fetch tournaments.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleDecision = async (tournamentId, decision) => {
    let reason = "";
    if (decision === "reject") {
      reason = prompt("Please provide a reason for rejecting this tournament:") || "";
      if (!reason.trim()) return;
    }
    setActingId(tournamentId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Tournament ${decision === "approve" ? "approved" : "rejected"}.`, { type: "success" });
        fetchTournaments();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Action failed.", { type: "error" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: 0 }}>Tournament Governance & Approvals</h2>
          <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4 }}>
            Review platform tournaments, verify transparent prize funding, and approve or reject events.
          </p>
        </div>
        <button
          onClick={fetchTournaments}
          style={{ background: V.pitchCard, border: `1px solid ${V.line}`, color: V.chalk, borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ color: V.chalkDim, fontSize: 13, padding: 24 }}>Loading tournaments…</div>
      ) : tournaments.length === 0 ? (
        <EmptyBlock emoji="🏆" title="No tournaments created yet" subtitle="When organizers create tournaments, they will appear here for platform governance." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {tournaments.map((t) => (
            <Card key={t.id} pad={20}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                      {t.sport}
                    </span>
                    <span style={{ fontSize: 11, color: V.chalkDim }}>
                      Turf: <strong>{t.turf?.name}</strong> • Organizer: {t.organizer?.full_name || "Organizer"}
                    </span>
                    <Pill tone={t.adminApprovalStatus === "approved" ? "green" : t.adminApprovalStatus === "rejected" ? "red" : "amber"}>
                      Admin: {t.adminApprovalStatus}
                    </Pill>
                    <Pill tone={t.turfApprovalStatus === "approved" ? "green" : t.turfApprovalStatus === "rejected" ? "red" : "amber"}>
                      Venue: {t.turfApprovalStatus}
                    </Pill>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: "0 0 4px" }}>{t.title}</h3>
                  <div style={{ fontSize: 12.5, color: V.chalkDim }}>
                    Dates: <strong>{formatBookingDate(t.startDate)} – {formatBookingDate(t.endDate)}</strong> • Teams: {t.registeredTeamsCount}/{t.maxTeams} • Entry: {formatINR(t.entryFee)} • Prize: {formatINR(t.prizePool)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {t.adminApprovalStatus === "pending" && (
                    <>
                      <button
                        onClick={() => handleDecision(t.id, "reject")}
                        disabled={actingId === t.id}
                        style={{
                          background: "transparent", border: `1px solid ${V.danger || "#ef4444"}`, borderRadius: 8,
                          padding: "8px 14px", color: V.danger || "#ef4444", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleDecision(t.id, "approve")}
                        disabled={actingId === t.id}
                        style={{
                          background: V.flood, color: "#fff", border: "none", borderRadius: 8,
                          padding: "8px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        {actingId === t.id ? "Approving…" : "Approve Tournament"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
