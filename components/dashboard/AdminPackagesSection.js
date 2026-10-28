"use client";

import { useState, useEffect } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { SPORT_OPTIONS } from "@/lib/sports";
import { formatINR } from "@/lib/dashboard/format";
import { EmptyBlock, Card, Pill } from "@/components/dashboard/kit";
import { extractErrorMessage } from "@/lib/api-response";

export function AdminPackagesSection({ showToast }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 1800,
    totalSessions: 5,
    validityDays: 30,
    eligibleSports: [],
    offPeakOnly: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages || []);
      }
    } catch {
      showToast("Could not load packages.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleActive = async (pkgId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Package ${!currentActive ? "activated" : "deactivated"}.`, { type: "success" });
        fetchPackages();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Failed to update status.", { type: "error" });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          restrictions: { off_peak_only: form.offPeakOnly },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("New package published!", { type: "success" });
        setShowModal(false);
        fetchPackages();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not save package.", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: 0 }}>Sports Packages & Pass Management</h2>
          <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4 }}>
            Configure session bundles, pricing tiers, validity windows, and sport restrictions.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Add New Package
        </button>
      </div>

      {loading ? (
        <div style={{ color: V.chalkDim, fontSize: 13, padding: 24 }}>Loading packages…</div>
      ) : packages.length === 0 ? (
        <EmptyBlock emoji="🎟️" title="No packages configured" subtitle="Create session passes for players to purchase and redeem." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {packages.map((pkg) => (
            <Card key={pkg.id} pad={20}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 700 }}>
                      {pkg.total_sessions} SESSIONS
                    </span>
                    <Pill tone={pkg.is_active ? "green" : "gray"}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </Pill>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: "0 0 4px" }}>{pkg.name}</h3>
                  <div style={{ fontSize: 13, color: V.chalkDim }}>
                    Price: <strong>{formatINR(pkg.price)}</strong> • Validity: <strong>{pkg.validity_days} days</strong> • Sports: {pkg.eligible_sports?.length ? pkg.eligible_sports.join(", ") : "All"}
                  </div>
                  {pkg.description && (
                    <div style={{ fontSize: 12.5, color: V.chalkFaint, marginTop: 4 }}>{pkg.description}</div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${pkg.is_active ? (V.danger || "#ef4444") : V.flood}`,
                      color: pkg.is_active ? (V.danger || "#ef4444") : V.flood,
                      borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {pkg.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE PACKAGE MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>Add New Sports Package</h2>
            <form onSubmit={handleSave} style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 4 }}>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10-Session All-Sport Pass"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 4 }}>Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 4 }}>Sessions *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={form.totalSessions}
                    onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 4 }}>Validity (Days) *</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={form.validityDays}
                  onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 14px", color: V.chalk, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer" }}
                >
                  {saving ? "Saving…" : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
