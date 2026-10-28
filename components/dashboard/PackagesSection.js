"use client";

import { useState, useEffect } from "react";
import { COLORS as V, panel } from "@/lib/design-tokens";
import { SPORT_OPTIONS } from "@/lib/sports";
import { formatBookingDate, formatINR, formatTime12 } from "@/lib/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/api-response";

export function PackagesSection({ profile, showToast, onPassPurchased }) {
  const [packages, setPackages] = useState([]);
  const [myPackages, setMyPackages] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackageForCheckout, setSelectedPackageForCheckout] = useState(null);
  const [activeTab, setActiveTab] = useState("passes"); // "passes" or "my_passes"
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      // 1. Fetch available packages
      const res = await fetch("/api/packages");
      const data = await res.json();
      if (res.ok) setPackages(data.packages || []);

      // 2. Fetch user's packages if logged in
      if (profile?.id) {
        const userRes = await fetch("/api/player/packages");
        const userData = await userRes.json();
        if (userRes.ok) {
          setMyPackages(userData.packages || []);
          setRedemptions(userData.redemptions || []);
        }
      }
    } catch {
      showToast("Could not load sports packages.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [profile?.id]);

  const activeMyPasses = myPackages.filter((p) => p.status === "active" && p.remainingSessions > 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: V.chalk, margin: 0 }}>Sports Packages & Passes</h1>
          <p style={{ fontSize: 14, color: V.chalkDim, marginTop: 4 }}>
            Save with session bundles, monthly subscriptions, and redeem directly at checkout.
          </p>
        </div>
        {profile?.role === "admin" && (
          <button
            onClick={() => setShowConfigModal(true)}
            style={{
              background: V.pitchCard, border: `1px solid ${V.line}`, color: V.chalk, borderRadius: 10,
              padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            ⚙️ Configure Packages
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, borderBottom: `1px solid ${V.line}`, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("passes")}
          style={{
            padding: "10px 16px", background: "transparent", border: "none",
            borderBottom: activeTab === "passes" ? `2px solid ${V.flood}` : "2px solid transparent",
            color: activeTab === "passes" ? V.flood : V.chalkDim, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Explore Passes ({packages.length})
        </button>
        {profile?.id && (
          <button
            onClick={() => setActiveTab("my_passes")}
            style={{
              padding: "10px 16px", background: "transparent", border: "none",
              borderBottom: activeTab === "my_passes" ? `2px solid ${V.flood}` : "2px solid transparent",
              color: activeTab === "my_passes" ? V.flood : V.chalkDim, fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            My Active Passes ({activeMyPasses.length})
          </button>
        )}
      </div>

      {/* Active Tab: Explore Passes */}
      {activeTab === "passes" && (
        <div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : packages.length === 0 ? (
            <EmptyState
              icon="🎟️"
              title="No sports packages available right now"
              description="Packages are being updated by administrators. Check back shortly."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16,
                    padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = V.flood; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = V.line; }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: V.floodDim, color: V.flood, fontWeight: 800 }}>
                        {pkg.totalSessions} SESSIONS
                      </span>
                      <span style={{ fontSize: 12, color: V.chalkDim }}>
                        Valid for {pkg.validityDays} days
                      </span>
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, marginTop: 14, marginBottom: 6 }}>
                      {pkg.name}
                    </h3>
                    <p style={{ fontSize: 13, color: V.chalkDim, margin: 0, minHeight: 40, lineHeight: 1.4 }}>
                      {pkg.description || "Versatile session bundle across all supported venues."}
                    </p>

                    {/* Pricing */}
                    <div style={{ marginTop: 20, padding: "14px 0", borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}` }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: V.chalk }}>{formatINR(pkg.price)}</span>
                        <span style={{ fontSize: 12.5, color: V.chalkFaint }}>({formatINR(pkg.pricePerSession)}/session)</span>
                      </div>
                    </div>

                    {/* Eligibility & Restrictions Badge List */}
                    <div style={{ marginTop: 14, fontSize: 12, color: V.chalkDim }}>
                      <div style={{ marginBottom: 4 }}>
                        Sports: <strong>{pkg.eligibleSports.length ? pkg.eligibleSports.join(", ") : "All Sports"}</strong>
                      </div>
                      <div>
                        Restrictions: <strong>{pkg.restrictions?.off_peak_only ? "Off-peak hours only" : "Any time slot"}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <button
                      onClick={() => {
                        if (!profile?.id) {
                          showToast("Please sign in to purchase sports passes.", { type: "info" });
                          return;
                        }
                        setSelectedPackageForCheckout(pkg);
                      }}
                      style={{
                        width: "100%", background: V.flood, color: "#fff", border: "none",
                        borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                      }}
                    >
                      Buy Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Tab: My Passes */}
      {activeTab === "my_passes" && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, marginBottom: 16 }}>
            Your Sports Passes & Redemptions
          </h2>

          {myPackages.length === 0 ? (
            <EmptyState
              icon="🎟️"
              title="You don't own any active passes yet"
              description="Purchase a 5-session, 10-session, or monthly pass to save on regular bookings."
              actionLabel="Browse Passes"
              onAction={() => setActiveTab("passes")}
            />
          ) : (
            <div>
              {/* Passes Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 32 }}>
                {myPackages.map((up) => (
                  <div key={up.id} style={{
                    background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14,
                    padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>{up.packageName}</h3>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                          background: up.status === "active" ? V.floodDim : V.pitch,
                          color: up.status === "active" ? V.flood : V.chalkFaint,
                          border: `1px solid ${up.status === "active" ? V.flood : V.line}`,
                        }}>
                          {up.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: up.remainingSessions > 0 ? V.flood : V.chalkFaint }}>
                          {up.remainingSessions}
                        </span>
                        <span style={{ fontSize: 13, color: V.chalkDim }}>of {up.totalSessions} sessions left</span>
                      </div>

                      <div style={{ marginTop: 14, fontSize: 12, color: V.chalkFaint }}>
                        <div>Expires: <strong>{formatBookingDate(up.expiresAt.slice(0, 10))}</strong></div>
                        <div style={{ marginTop: 2 }}>Ref: <code>{up.transactionReference}</code></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Redemption History */}
              <h3 style={{ fontSize: 16, fontWeight: 800, color: V.chalk, marginBottom: 12 }}>
                Redemption & Usage History ({redemptions.length})
              </h3>
              {redemptions.length === 0 ? (
                <div style={{ color: V.chalkFaint, fontSize: 13, padding: 12 }}>
                  No sessions have been redeemed from your passes yet.
                </div>
              ) : (
                <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${V.line}`, color: V.chalkFaint, textAlign: "left" }}>
                        <th style={{ padding: "10px 14px" }}>Date</th>
                        <th style={{ padding: "10px 14px" }}>Pass</th>
                        <th style={{ padding: "10px 14px" }}>Action</th>
                        <th style={{ padding: "10px 14px" }}>Remaining After</th>
                        <th style={{ padding: "10px 14px" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.map((r) => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                          <td style={{ padding: "10px 14px", color: V.chalkDim }}>{formatBookingDate(r.created_at.slice(0, 10))}</td>
                          <td style={{ padding: "10px 14px", color: V.chalk, fontWeight: 600 }}>{r.user_package?.package?.name || "Pass"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                              background: r.action === "refund" ? V.floodDim : V.pitch,
                              color: r.action === "refund" ? V.flood : (V.danger || "#ef4444"),
                            }}>
                              {r.action === "refund" ? "+1 Restored" : "-1 Redeemed"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: V.chalk, fontWeight: 700 }}>{r.remaining_after}</td>
                          <td style={{ padding: "10px 14px", color: V.chalkFaint }}>{r.notes || "Booking session"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BUY PASS MODAL */}
      {selectedPackageForCheckout && (
        <BuyPassModal
          pkg={selectedPackageForCheckout}
          onClose={() => setSelectedPackageForCheckout(null)}
          onSuccess={() => {
            setSelectedPackageForCheckout(null);
            showToast(`"${selectedPackageForCheckout.name}" activated!`, { type: "success" });
            fetchPackages();
            setActiveTab("my_passes");
            if (onPassPurchased) onPassPurchased();
          }}
          showToast={showToast}
        />
      )}

      {/* ADMIN CONFIGURE PASS MODAL */}
      {showConfigModal && (
        <AdminConfigModal
          onClose={() => setShowConfigModal(false)}
          onSaved={() => {
            setShowConfigModal(false);
            showToast("New sports package published!", { type: "success" });
            fetchPackages();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function BuyPassModal({ pkg, onClose, onSuccess, showToast }) {
  const [busy, setBusy] = useState(false);

  const handleConfirmPurchase = async () => {
    setBusy(true);
    try {
      // 1. Checkout order
      const checkoutRes = await fetch("/api/player/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(extractErrorMessage(checkoutData));

      // 2. Confirm order
      const confirmRes = await fetch("/api/player/packages/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          transactionReference: checkoutData.order?.transactionReference,
          clientReportedAmount: pkg.price,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(extractErrorMessage(confirmData));

      onSuccess();
    } catch (err) {
      showToast(err.message || "Purchase failed. Try again.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: V.chalk, margin: 0 }}>Purchase Sports Pass</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 16 }}>
          {pkg.name} • {pkg.totalSessions} Sessions
        </p>

        <div style={{ background: V.pitch, padding: 16, borderRadius: 12, border: `1px solid ${V.line}`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: V.chalkDim, marginBottom: 8 }}>
            <span>Total Payable</span>
            <strong style={{ color: V.chalk, fontSize: 16 }}>{formatINR(pkg.price)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: V.chalkDim, marginBottom: 8 }}>
            <span>Validity</span>
            <span style={{ color: V.chalk }}>{pkg.validityDays} Days</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: V.chalkDim }}>
            <span>Mode</span>
            <span style={{ color: V.flood, fontWeight: 700 }}>Simulated Demo Checkout</span>
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
            onClick={handleConfirmPurchase}
            disabled={busy}
            style={{ background: V.flood, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 13.5, cursor: busy ? "wait" : "pointer" }}
          >
            {busy ? "Activating Pass…" : `Pay ${formatINR(pkg.price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminConfigModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 2000,
    totalSessions: 5,
    validityDays: 30,
    eligibleSports: [],
    offPeakOnly: false,
  });
  const [busy, setBusy] = useState(false);

  const toggleSport = (sport) => {
    setForm((f) => ({
      ...f,
      eligibleSports: f.eligibleSports.includes(sport)
        ? f.eligibleSports.filter((s) => s !== sport)
        : [...f.eligibleSports, sport],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
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
        onSaved();
      } else {
        showToast(extractErrorMessage(data), { type: "error" });
      }
    } catch {
      showToast("Could not save package.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: V.chalk, margin: 0 }}>Configure Sports Package</h2>
        <p style={{ fontSize: 13, color: V.chalkDim, marginTop: 4, marginBottom: 16 }}>
          Set prices, session allowances, validity, and usage restrictions.
        </p>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Package Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 5-Session Badminton Pass"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Price (₹) *</label>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Total Sessions *</label>
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Validity (Days) *</label>
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

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: V.chalkDim, marginBottom: 6 }}>Eligible Sports (Leave blank for all)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SPORT_OPTIONS.slice(0, 6).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSport(s)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    background: form.eligibleSports.includes(s) ? V.flood : V.pitch,
                    color: form.eligibleSports.includes(s) ? "#fff" : V.chalkDim,
                    border: `1px solid ${form.eligibleSports.includes(s) ? V.flood : V.line}`,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="offPeak"
              checked={form.offPeakOnly}
              onChange={(e) => setForm({ ...form, offPeakOnly: e.target.checked })}
            />
            <label htmlFor="offPeak" style={{ fontSize: 12.5, color: V.chalkDim }}>Restrict pass to off-peak hours only</label>
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
              {busy ? "Saving…" : "Save Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
