"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel, buttonStyle } from "@/lib/design-tokens";
import { formatBookingDate, formatINR } from "@/lib/dashboard/format";
import { EmptyBlock, Card, Pill } from "@/components/dashboard/kit";
import {
  Users,
  Wallet,
  Check,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  AlertTriangle,
} from "@/components/ui/icons";

export function AdminGroupBookingsSection({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [groupBookings, setGroupBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchGroupBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/group-bookings");
      const json = await res.json();
      if (res.ok) {
        setGroupBookings(json.groupBookings || []);
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
    fetchGroupBookings();
  }, []);

  const filtered = groupBookings.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = g.invitation_code?.toLowerCase().includes(q);
      const matchTurf = g.turf?.name?.toLowerCase().includes(q);
      const matchLeader = g.leader?.full_name?.toLowerCase().includes(q) || g.leader?.email?.toLowerCase().includes(q);
      if (!matchCode && !matchTurf && !matchLeader) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: V.chalk, margin: "0 0 4px" }}>
            Group Bookings & Split Bill Audit
          </h1>
          <p style={{ fontSize: 13.5, color: V.chalkDim, margin: 0 }}>
            Monitor group reservations, participant payment collections, deadline statuses, and refund records.
          </p>
        </div>

        <button
          onClick={fetchGroupBookings}
          disabled={loading}
          style={{ ...buttonStyle("secondary", "sm"), display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={13} className={loading ? "vt-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by code, turf or leader…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            background: V.pitch,
            border: `1px solid ${V.line}`,
            borderRadius: 8,
            padding: "8px 12px",
            color: V.chalk,
            fontSize: 13,
          }}
        />

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "all", label: "All" },
            { id: "confirmed", label: "Confirmed" },
            { id: "pending", label: "Pending" },
            { id: "expired", label: "Expired" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                background: statusFilter === tab.id ? V.flood : V.pitchCard,
                color: statusFilter === tab.id ? "#fff" : V.chalkDim,
                border: `1px solid ${statusFilter === tab.id ? V.flood : V.line}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <EmptyBlock message="Loading group bookings…" />
      ) : filtered.length === 0 ? (
        <EmptyBlock message="No group bookings matching your filter." />
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${V.line}`, borderRadius: 12, background: V.pitchCard }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.lineStrong}`, color: V.chalkFaint, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Code</th>
                <th style={{ padding: "12px 16px" }}>Turf</th>
                <th style={{ padding: "12px 16px" }}>Leader</th>
                <th style={{ padding: "12px 16px" }}>Date & Slot</th>
                <th style={{ padding: "12px 16px" }}>Split Mode</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Total (INR)</th>
                <th style={{ padding: "12px 16px" }}>Paid Players</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const participants = g.participants || [];
                const paidCount = participants.filter((p) => p.payment_status === "paid").length;
                return (
                  <tr key={g.id} style={{ borderBottom: `1px solid ${V.line}`, color: V.chalk }}>
                    <td style={{ padding: "12px 16px", fontWeight: 800, fontFamily: "monospace", color: V.flood }}>
                      {g.invitation_code}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700 }}>{g.turf?.name || "Turf"}</div>
                      <div style={{ fontSize: 11, color: V.chalkFaint }}>{g.turf?.city}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div>{g.leader?.full_name || "Leader"}</div>
                      <div style={{ fontSize: 11, color: V.chalkFaint }}>{g.leader?.email}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div>{formatBookingDate(g.booking_date)}</div>
                      <div style={{ fontSize: 11, color: V.chalkFaint }}>{g.start_time?.slice(0, 5)} · {g.sport}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                      {g.split_mode?.replace("_", " ")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800 }}>
                      ₹{g.total_price}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 700, color: paidCount >= g.participant_count ? V.confirmed : V.chalk }}>
                        {paidCount} / {g.participant_count}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Pill
                        variant={
                          g.status === "confirmed" ? "success" : g.status === "pending" ? "info" : "danger"
                        }
                      >
                        {g.status}
                      </Pill>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => setSelectedGroup(g)}
                        style={{ ...buttonStyle("secondary", "sm"), padding: "4px 8px", fontSize: 11 }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Details Modal */}
      {selectedGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23, 43, 77, 0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...panel(true), borderRadius: 16, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>
                Group #{selectedGroup.invitation_code} Details
              </h3>
              <button onClick={() => setSelectedGroup(null)} style={{ background: "transparent", border: "none", color: V.chalkFaint, cursor: "pointer", fontSize: 16 }}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, fontSize: 13, background: V.pitch, padding: 14, borderRadius: 10 }}>
              <div><strong>Turf:</strong> {selectedGroup.turf?.name}</div>
              <div><strong>Total Price:</strong> ₹{selectedGroup.total_price}</div>
              <div><strong>Leader:</strong> {selectedGroup.leader?.full_name}</div>
              <div><strong>Split Mode:</strong> {selectedGroup.split_mode}</div>
              <div><strong>Status:</strong> {selectedGroup.status}</div>
              <div><strong>Deadline:</strong> {new Date(selectedGroup.expires_at).toLocaleString()}</div>
            </div>

            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: V.chalkFaint, marginBottom: 10 }}>
              Participants & Shares
            </h4>
            <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
              {(selectedGroup.participants || []).map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: V.pitchCard, borderRadius: 8, fontSize: 12.5 }}>
                  <span>{i + 1}. {p.player?.full_name || p.guest_name || "Participant"} ({p.role})</span>
                  <span>
                    Share: <strong>₹{p.share_amount}</strong> · <span style={{ color: p.payment_status === "paid" ? V.confirmed : "#EF4444", fontWeight: 700 }}>{p.payment_status}</span>
                  </span>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: V.chalkFaint, marginBottom: 10 }}>
              Transactions ({selectedGroup.transactions?.length || 0})
            </h4>
            <div style={{ display: "grid", gap: 6 }}>
              {(selectedGroup.transactions || []).length === 0 ? (
                <div style={{ fontSize: 12, color: V.chalkFaint }}>No payment transactions recorded yet.</div>
              ) : (
                selectedGroup.transactions.map((tx) => (
                  <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: V.pitch, borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: V.chalk }}>{tx.transaction_reference}</div>
                      <div style={{ fontSize: 11, color: V.chalkFaint }}>{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: tx.status === "success" ? V.confirmed : "#EF4444" }}>
                        ₹{tx.amount} ({tx.status})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

