"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS as V, panel } from "@/lib/design-tokens";
import { formatBookingDate, formatINR, formatTime12 } from "@/lib/dashboard/format";
import {
  Btn, Card, DataTable, EmptyBlock, ErrorBanner, Icon, Pill, SearchInput,
  SectionTitle, Segmented, StatCard, StatGrid, StatusPill, font, mono,
} from "@/components/dashboard/kit";
import { QrCameraScanner } from "@/components/dashboard/QrCameraScanner";
import { parseBookingQr } from "@/lib/qr/booking-qr";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "@/components/ui/icons";

export function OwnerQrCheckinSection({
  turfs = [],
  bookings = [],
  onRefresh,
  onViewBookingDetail,
  profile,
  onBack,
}) {
  const { showToast } = useToast();

  // Mode: "scanner" or "roster"
  const [activeView, setActiveView] = useState("scanner");

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [checkinSuccessMsg, setCheckinSuccessMsg] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  // Attendance Roster Filters
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [rosterDateFilter, setRosterDateFilter] = useState("today"); // "today" | "all" | "upcoming"
  const [rosterTurfFilter, setRosterTurfFilter] = useState("all");
  const [rosterSportFilter, setRosterSportFilter] = useState("all");
  const [rosterStatusFilter, setRosterStatusFilter] = useState("all");
  const [rosterQuery, setRosterQuery] = useState("");

  // Sports list from turfs
  const availableSports = useMemo(() => {
    const set = new Set();
    turfs.forEach((t) => (t.sports || []).forEach((s) => set.add(s)));
    bookings.forEach((b) => b.sport && set.add(b.sport));
    return Array.from(set);
  }, [turfs, bookings]);

  // Handle Verify API call
  async function handleVerify(codeToVerify) {
    const cleanId = parseBookingQr(codeToVerify);
    if (!cleanId) {
      setVerificationError("Invalid booking ID or QR format. Please verify the code.");
      return;
    }

    setVerifying(true);
    setVerificationError("");
    setCheckinSuccessMsg("");
    setVerifiedBooking(null);

    try {
      const res = await fetch(`/api/bookings/checkin?bookingId=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok) {
        setVerificationError(data.error || "Failed to verify booking.");
        return;
      }

      setVerifiedBooking(data);
      // Automatically pause camera scanning so user can review booking details
      setIsScanning(false);
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationError("Network error while verifying ticket. Please retry.");
    } finally {
      setVerifying(false);
    }
  }

  // Handle Confirm Attendance
  async function handleConfirmAttendance() {
    if (!verifiedBooking?.booking?.id) return;
    setCheckingIn(true);
    setVerificationError("");

    try {
      const res = await fetch("/api/bookings/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: verifiedBooking.booking.id,
          status: "checked_in",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVerificationError(data.error || "Failed to confirm attendance.");
        if (data.already_checked_in) {
          setVerifiedBooking((prev) => prev ? {
            ...prev,
            already_checked_in: true,
            booking: {
              ...prev.booking,
              attendance_status: "checked_in",
              checked_in_at: data.checked_in_at || new Date().toISOString(),
            },
          } : null);
        }
        return;
      }

      const checkInTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setCheckinSuccessMsg(`Player Checked In Successfully at ${checkInTime}!`);
      showToast("Player Checked In Successfully!", { type: "success" });

      // Update current verified card state
      setVerifiedBooking((prev) => prev ? {
        ...prev,
        already_checked_in: true,
        booking: {
          ...prev.booking,
          attendance_status: "checked_in",
          checked_in_at: new Date().toISOString(),
          checked_in_by_name: profile?.full_name || "Owner",
        },
      } : null);

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Attendance confirm error:", err);
      setVerificationError("Network error while recording attendance.");
    } finally {
      setCheckingIn(false);
    }
  }

  // Reset scanner to scan next
  function handleResetScanner() {
    setVerifiedBooking(null);
    setVerificationError("");
    setCheckinSuccessMsg("");
    setManualCode("");
    setIsScanning(true);
  }

  // Attendance Roster Statistics
  const rosterStats = useMemo(() => {
    const todayBookings = bookings.filter((b) => b.booking_date === todayStr && b.status !== "cancelled" && b.status !== "rejected");
    const checkedInToday = todayBookings.filter((b) => b.attendance_status === "checked_in").length;
    const expectedToday = todayBookings.length;
    const pendingArrivals = todayBookings.filter((b) => (b.attendance_status || "not_arrived") === "not_arrived").length;
    const noShowsToday = todayBookings.filter((b) => b.attendance_status === "no_show").length;

    return { checkedInToday, expectedToday, pendingArrivals, noShowsToday };
  }, [bookings, todayStr]);

  // Filtered Roster Bookings
  const filteredRosterBookings = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      // Date filter
      if (rosterDateFilter === "today" && b.booking_date !== todayStr) return false;
      if (rosterDateFilter === "upcoming" && b.booking_date < todayStr) return false;

      // Turf filter
      if (rosterTurfFilter !== "all" && b.turf_id !== rosterTurfFilter) return false;

      // Sport filter
      if (rosterSportFilter !== "all" && b.sport !== rosterSportFilter) return false;

      // Status filter
      if (rosterStatusFilter === "checked_in" && b.attendance_status !== "checked_in") return false;
      if (rosterStatusFilter === "not_arrived" && (b.attendance_status || "not_arrived") !== "not_arrived") return false;
      if (rosterStatusFilter === "no_show" && b.attendance_status !== "no_show") return false;

      // Search query
      if (q) {
        const matchesPlayer = (b.player || b.player_name || "").toLowerCase().includes(q);
        const matchesTurf = (b.turf || b.turf_name || "").toLowerCase().includes(q);
        const matchesId = (b.id || "").toLowerCase().includes(q);
        const matchesSport = (b.sport || "").toLowerCase().includes(q);
        if (!matchesPlayer && !matchesTurf && !matchesId && !matchesSport) return false;
      }

      return true;
    });
  }, [bookings, rosterDateFilter, rosterTurfFilter, rosterSportFilter, rosterStatusFilter, rosterQuery, todayStr]);

  // Roster Table Columns
  const rosterColumns = [
    {
      key: "time",
      label: "Schedule",
      width: "1.3fr",
      render: (r) => (
        <div>
          <div style={{ color: V.chalk, fontWeight: 700 }}>{formatBookingDate(r.booking_date || r.date)}</div>
          <div style={{ color: V.chalkFaint, fontSize: 11.5 }}>{formatTime12(r.start_time || r.time)}</div>
        </div>
      ),
    },
    {
      key: "player",
      label: "Player",
      width: "1.4fr",
      render: (r) => (
        <div>
          <div style={{ color: V.chalk, fontWeight: 700 }}>{r.player || r.player_name || "Customer"}</div>
          <div style={{ color: V.chalkFaint, fontSize: 11, fontFamily: mono }}>{r.id.slice(0, 8)}…</div>
        </div>
      ),
    },
    {
      key: "turf",
      label: "Venue & Sport",
      width: "1.4fr",
      render: (r) => (
        <div>
          <div style={{ color: V.chalk, fontWeight: 600 }}>{r.turf || r.turf_name || "Turf"}</div>
          <div style={{ color: V.chalkDim, fontSize: 11.5 }}>{r.sport}</div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span style={{ fontFamily: font, color: V.chalk, fontWeight: 700 }}>
          {formatINR(r.price ?? r.amount ?? r.total_amount ?? 0)}
        </span>
      ),
    },
    {
      key: "attendance",
      label: "Attendance",
      width: "1.2fr",
      render: (r) => {
        const att = r.attendance_status || "not_arrived";
        if (att === "checked_in") {
          return (
            <div>
              <Pill color="#10B981">Checked In</Pill>
              {r.checked_in_at && (
                <div style={{ color: V.chalkFaint, fontSize: 10.5, marginTop: 3 }}>
                  {new Date(r.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          );
        }
        if (att === "no_show") {
          return <Pill color="#EF4444">No Show</Pill>;
        }
        return <Pill color="#F59E0B">Pending Arrival</Pill>;
      },
    },
    {
      key: "actions",
      label: "Actions",
      width: "1.3fr",
      align: "right",
      render: (r) => {
        const isChecked = r.attendance_status === "checked_in";
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {!isChecked && (
              <Btn
                size="sm"
                variant="primary"
                onClick={async () => {
                  await handleVerify(r.id);
                  setActiveView("scanner");
                }}
              >
                Check In
              </Btn>
            )}
            {onViewBookingDetail && (
              <Btn size="sm" variant="ghost" onClick={() => onViewBookingDetail(r)}>
                Details
              </Btn>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Top Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="vt-mobile-back-circle-btn"
              aria-label="Back to overview"
            >
              <ArrowLeft size={18} color="#172B4D" />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ color: V.chalk, fontFamily: font, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>
              Check-in
            </h2>
            <p style={{ color: V.chalkDim, margin: "4px 0 0", fontSize: 13 }}>
              Scan player QR tickets to verify bookings and stop duplicate arrivals.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setActiveView("scanner")}
            style={{
              background: activeView === "scanner" ? "#172B4D" : "#FFFFFF",
              color: activeView === "scanner" ? "#FFFFFF" : "#172B4D",
              border: activeView === "scanner" ? "none" : "1px solid #E5EDF5",
              borderRadius: 999,
              padding: "9px 22px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Live scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveView("roster")}
            style={{
              background: activeView === "roster" ? "#172B4D" : "#FFFFFF",
              color: activeView === "roster" ? "#FFFFFF" : "#172B4D",
              border: activeView === "roster" ? "none" : "1px solid #E5EDF5",
              borderRadius: 999,
              padding: "9px 22px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>Roster</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.85 }}>{rosterStats.expectedToday}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: LIVE QR SCANNER & CHECK-IN VERIFICATION
      ========================================================================== */}
      {activeView === "scanner" && (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Main 2-column or 1-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 24 }}>
          {/* Top Card: Camera Viewfinder */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
              border: "1px solid #E5EDF5",
              boxShadow: "0 4px 14px rgba(23, 105, 232, 0.04)",
            }}
          >
            <QrCameraScanner
              isScanning={isScanning}
              onStartScan={() => {
                setVerificationError("");
                setCheckinSuccessMsg("");
                setIsScanning(true);
              }}
              onStopScan={() => setIsScanning(false)}
              onScan={(code) => handleVerify(code)}
              onError={(err) => setVerificationError(err)}
            />
          </div>

          {/* Middle Card: Manual Booking ID Input */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "18px 20px",
              border: "1px solid #E5EDF5",
              boxShadow: "0 4px 14px rgba(23, 105, 232, 0.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: "#718096", textTransform: "uppercase", marginBottom: 12 }}>
              OR ENTER BOOKING ID
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) handleVerify(manualCode.trim());
              }}
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste booking ID"
                aria-label="Booking ID"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid #E5EDF5",
                  background: "#FFFFFF",
                  color: "#172B4D",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || verifying}
                style={{
                  background: "#172B4D",
                  color: "#FFFFFF",
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  opacity: !manualCode.trim() || verifying ? 0.6 : 1,
                }}
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </form>

            {verificationError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                {verificationError}
              </div>
            )}
          </div>

            {/* Right Card: Verified Booking & Attendance Confirmation */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1px solid #E5EDF5",
                boxShadow: "0 4px 14px rgba(23, 105, 232, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: "#718096", textTransform: "uppercase" }}>
                VERIFIED TICKET
              </div>

              {verifying ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: V.chalkDim }}>
                  <Icon name="refresh" size={28} className="animate-spin" />
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: 15 }}>Verifying Ticket…</div>
                  <div style={{ fontSize: 12.5, color: V.chalkFaint }}>Checking booking validity and turf authorization</div>
                </div>
              ) : verifiedBooking ? (
                <div style={{ display: "grid", gap: 18 }}>
                  {/* Status Banner */}
                  {checkinSuccessMsg ? (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        background: "#ECFDF5",
                        border: "2px solid #10B981",
                        color: "#065F46",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#10B981",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="check" size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>Player Checked In Successfully</div>
                        <div style={{ fontSize: 12.5, opacity: 0.9 }}>{checkinSuccessMsg}</div>
                      </div>
                    </div>
                  ) : verifiedBooking.already_checked_in ? (
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: "#FFFBEB",
                        border: "2px solid #F59E0B",
                        color: "#92400E",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Icon name="alertTriangle" size={24} color="#D97706" />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Already Checked In</div>
                        <div style={{ fontSize: 12.5 }}>
                          This player was checked in at{" "}
                          {verifiedBooking.booking.checked_in_at
                            ? new Date(verifiedBooking.booking.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "an earlier time"}
                          {verifiedBooking.booking.checked_in_by_name && ` by ${verifiedBooking.booking.checked_in_by_name}`}.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "12px 18px",
                        borderRadius: 12,
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        color: "#1E40AF",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Icon name="shieldCheck" size={20} color="#2563EB" />
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        Ticket Verified · Ready for Check-in
                      </div>
                    </div>
                  )}

                  {/* Warning if date is not today */}
                  {verifiedBooking.warning && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#FEF3C7",
                        border: "1px solid #FCD34D",
                        color: "#B45309",
                        fontSize: 12.5,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Icon name="alert" size={16} />
                      <span>{verifiedBooking.warning}</span>
                    </div>
                  )}

                  {/* Booking Details Grid */}
                  <div
                    style={{
                      background: V.pitchCardRaised,
                      borderRadius: 12,
                      padding: 16,
                      border: `1px solid ${V.line}`,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 18px",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Player</div>
                      <div style={{ color: V.chalk, fontWeight: 800, fontSize: 15, marginTop: 2 }}>
                        {verifiedBooking.booking.player?.name || "Customer"}
                      </div>
                      {verifiedBooking.booking.player?.phone && (
                        <div style={{ color: V.chalkDim, fontSize: 11.5, marginTop: 2 }}>
                          {verifiedBooking.booking.player.phone}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Booking ID</div>
                      <div style={{ color: V.chalk, fontFamily: mono, fontWeight: 700, fontSize: 12.5, marginTop: 2 }}>
                        {verifiedBooking.booking.id}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Turf / Venue</div>
                      <div style={{ color: V.chalk, fontWeight: 700, marginTop: 2 }}>
                        {verifiedBooking.booking.turf_name}
                      </div>
                      <div style={{ color: V.chalkFaint, fontSize: 11.5 }}>
                        {verifiedBooking.booking.sport}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Schedule</div>
                      <div style={{ color: V.chalk, fontWeight: 700, marginTop: 2 }}>
                        {formatBookingDate(verifiedBooking.booking.booking_date)}
                      </div>
                      <div style={{ color: V.chalkDim, fontSize: 11.5 }}>
                        {formatTime12(verifiedBooking.booking.start_time)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Payment</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <StatusPill status={verifiedBooking.booking.payment_status} />
                        <span style={{ fontWeight: 700, color: V.chalk }}>
                          {formatINR(verifiedBooking.booking.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Attendance State</div>
                      <div style={{ marginTop: 2 }}>
                        <Pill
                          color={
                            verifiedBooking.booking.attendance_status === "checked_in"
                              ? "#10B981"
                              : verifiedBooking.booking.attendance_status === "no_show"
                                ? "#EF4444"
                                : "#F59E0B"
                          }
                        >
                          {verifiedBooking.booking.attendance_status === "checked_in"
                            ? "Checked In"
                            : verifiedBooking.booking.attendance_status === "no_show"
                              ? "No Show"
                              : "Not Arrived"}
                        </Pill>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    {!verifiedBooking.already_checked_in && verifiedBooking.is_confirmed && (
                      <Btn
                        variant="primary"
                        icon="check"
                        busy={checkingIn}
                        onClick={handleConfirmAttendance}
                        style={{ flex: 1, padding: "12px 20px", fontSize: 15 }}
                      >
                        Confirm Attendance
                      </Btn>
                    )}

                    <Btn
                      variant={verifiedBooking.already_checked_in ? "primary" : "secondary"}
                      icon="camera"
                      onClick={handleResetScanner}
                      style={{ flex: verifiedBooking.already_checked_in ? 1 : undefined }}
                    >
                      Scan Next Player
                    </Btn>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "#F3E8FF",
                      color: "#9333EA",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Icon name="qr" size={24} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#172B4D", marginBottom: 4 }}>
                    No ticket scanned yet
                  </div>
                  <div style={{ fontSize: 12.5, color: "#718096", maxWidth: 300, lineHeight: 1.4 }}>
                    Verified bookings show up here with turf, time and player.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: ATTENDANCE MANAGEMENT ROSTER & HISTORY
      ========================================================================== */}
      {activeView === "roster" && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Summary Stat Cards */}
          <StatGrid min={170}>
            <StatCard
              label="Checked-in Today"
              value={rosterStats.checkedInToday}
              icon="checkCircle"
              color="#10B981"
              sub={`${rosterStats.expectedToday ? Math.round((rosterStats.checkedInToday / rosterStats.expectedToday) * 100) : 0}% turn-out rate`}
            />
            <StatCard
              label="Pending Arrivals"
              value={rosterStats.pendingArrivals}
              icon="clock"
              color="#F59E0B"
              sub="Awaiting player check-in"
            />
            <StatCard
              label="Expected Today"
              value={rosterStats.expectedToday}
              icon="calendar"
              color={V.sky}
              sub="Total confirmed bookings"
            />
            <StatCard
              label="No-Shows"
              value={rosterStats.noShowsToday}
              icon="xCircle"
              color="#EF4444"
              sub="Marked absent"
            />
          </StatGrid>

          {/* Roster Filters Toolbar */}
          <Card pad={14} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Date Scope */}
              <Segmented
                label="Date Range"
                value={rosterDateFilter}
                onChange={setRosterDateFilter}
                options={[
                  { id: "today", label: "Today" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "all", label: "All Time" },
                ]}
              />

              {/* Turf Filter */}
              {turfs.length > 1 && (
                <select
                  value={rosterTurfFilter}
                  onChange={(e) => setRosterTurfFilter(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: `1px solid ${V.lineStrong}`,
                    background: "#FFFFFF",
                    fontSize: 12.5,
                    fontFamily: font,
                    fontWeight: 600,
                    color: V.chalk,
                    outline: "none",
                  }}
                  aria-label="Filter by turf"
                >
                  <option value="all">All Turfs</option>
                  {turfs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Attendance Status Filter */}
              <select
                value={rosterStatusFilter}
                onChange={(e) => setRosterStatusFilter(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 9,
                  border: `1px solid ${V.lineStrong}`,
                  background: "#FFFFFF",
                  fontSize: 12.5,
                  fontFamily: font,
                  fontWeight: 600,
                  color: V.chalk,
                  outline: "none",
                }}
                aria-label="Filter by attendance status"
              >
                <option value="all">All Attendance</option>
                <option value="checked_in">Checked In Only</option>
                <option value="not_arrived">Pending (Not Arrived)</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            {/* Search filter */}
            <SearchInput
              value={rosterQuery}
              onChange={setRosterQuery}
              placeholder="Search by player or turf…"
            />
          </Card>

          {/* Roster Data Table (Desktop) */}
          <div className="vt-desktop-only">
            <DataTable
              columns={rosterColumns}
              rows={filteredRosterBookings}
              keyField="id"
              empty="No bookings found matching your attendance filters."
              pageSize={15}
            />
          </div>

          {/* Roster Cards (Mobile) */}
          <div className="vt-mobile-only">
            {filteredRosterBookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#718096", fontSize: 13.5, background: "#FFFFFF", borderRadius: 20, border: "1px solid #E5EDF5" }}>
                No bookings found matching your attendance filters.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredRosterBookings.map((b) => {
                  const att = b.attendance_status || "not_arrived";
                  const isCheckedIn = att === "checked_in";
                  const isNoShow = att === "no_show";
                  const playerName = b.player?.name || "Customer";
                  const initial = playerName.charAt(0).toUpperCase() || "P";
                  return (
                    <div
                      key={b.id}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 20,
                        padding: "16px 18px",
                        border: "1px solid #E5EDF5",
                        boxShadow: "0 4px 14px rgba(23, 105, 232, 0.04)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
                              color: "#FFFFFF",
                              fontWeight: 900,
                              fontSize: 15,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#172B4D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {playerName}
                            </div>
                            <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>
                              {b.turf_name} · #{b.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Pill color={isCheckedIn ? "#10B981" : isNoShow ? "#EF4444" : "#F59E0B"}>
                            {isCheckedIn ? "Checked In" : isNoShow ? "No Show" : "Pending"}
                          </Pill>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #F0F4F8", fontSize: 12.5 }}>
                        <span style={{ fontWeight: 700, color: "#172B4D" }}>
                          {formatBookingDate(b.booking_date)} · {formatTime12(b.start_time)}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {b.sport && <Pill color={V.sky}>{b.sport}</Pill>}
                          <span style={{ fontWeight: 800, color: "#172B4D" }}>{formatINR(b.total_amount)}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                        {!isCheckedIn ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateAttendance(b.id, "checked_in")}
                            style={{
                              flex: 1,
                              background: "#1769E8",
                              color: "#FFFFFF",
                              borderRadius: 999,
                              padding: "9px 14px",
                              fontSize: 13,
                              fontWeight: 800,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Check In
                          </button>
                        ) : (
                          <div style={{ flex: 1, background: "#DCFCE7", color: "#15803D", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 800, textAlign: "center" }}>
                            ✓ Checked In
                          </div>
                        )}
                        {onViewBookingDetail && (
                          <button
                            type="button"
                            onClick={() => onViewBookingDetail(b)}
                            style={{
                              background: "#FFFFFF",
                              color: "#172B4D",
                              border: "1px solid #E5EDF5",
                              borderRadius: 999,
                              padding: "9px 16px",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
