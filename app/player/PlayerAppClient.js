"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { SkeletonGrid, SkeletonCard, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { RankBadge } from "@/components/ui/rank-badge";
import { COLORS as V, FONT_DISPLAY, FONT_BODY, FONT_DATA, panel, floodGlow, buttonStyle } from "@/lib/design-tokens";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Rounds a Supabase "HH:MM:SS" time string down to "HH:MM" for display.
function fmtTime(t) {
  return t ? t.slice(0, 5) : t;
}

// Simple demand-based pricing: peak price once more than 70% of today's
// slots are taken, base price otherwise.
function calcPrice(turf, occupancy) {
  return occupancy > 70 ? Number(turf.peak_price) : Number(turf.base_price);
}


// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 20, color = "currentColor", filled = false }) => {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    search: <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    trophy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    lightning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    map: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
    clock: <><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" /></>,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    trending: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    sun: <><circle cx="12" cy="12" r="5" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
    rain: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19v2m4-2v2m4-2v2M3 15a7 7 0 0114 0H3z" />,
    qr: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4H6a2 2 0 00-2 2v6m8-8h6a2 2 0 012 2v6m-8-8v8m0 0H6m6 0h6m-6 0v8m-6-8H4m2 0v6a2 2 0 002 2h4M16 12h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4a2 2 0 012-2z" />,
    notification: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
    filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {icons[name]}
    </svg>
  );
};

// ============================================================
// ANIMATED COUNTER
// ============================================================
function AnimatedCounter({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ============================================================
// SLOT GRID COMPONENT
// ============================================================
function SlotGrid({ slots, onSelect, selected }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {slots.map((slot, i) => {
        const isSelected = selected === i;
        const color = slot.status === "booked" ? V.chalkFaint : slot.status === "locked" ? V.pending : V.flood;
        const bg = slot.status === "available" ? (isSelected ? V.flood : V.floodDim) : (slot.status === "locked" ? "rgba(245,166,35,0.12)" : "rgba(245,247,242,0.04)");
        return (
          <button
            key={i}
            onClick={() => slot.status === "available" && onSelect(i)}
            disabled={slot.status !== "available"}
            style={{
              padding: "10px 4px",
              borderRadius: 10,
              border: `1px solid ${isSelected ? V.flood : color + "40"}`,
              background: bg,
              color: isSelected ? V.pitch : color,
              fontSize: 12,
              fontWeight: 700,
              cursor: slot.status === "available" ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              fontFamily: FONT_DATA,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {slot.time}
            {slot.status === "locked" && (
              <div style={{ fontSize: 9, color: V.pending, marginTop: 2 }}>LOCKED</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// TURF CARD
// ============================================================
function TurfCard({ turf, onBook, onMatch }) {
  const price = calcPrice(turf, turf.occupancy);
  const isDynamic = turf.occupancy > 70;
  const sportEmoji = { Football: "⚽", Basketball: "🏀", Cricket: "🏏", Badminton: "🏸", Hockey: "🏑" };

  return (
    <div style={{
      ...panel(),
      borderRadius: 16,
      overflow: "hidden",
      transition: "transform 0.25s, border-color 0.25s",
      cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = V.lineStrong; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = V.line; }}
    >
      {/* Image Area */}
      <div style={{
        height: 150,
        background: V.pitchCardRaised,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderBottom: `1px solid ${V.line}`,
      }}>
        <div style={{ fontSize: 56, opacity: 0.5, filter: "grayscale(0.3)" }}>{sportEmoji[turf.sports[0]]}</div>
        {isDynamic && (
          <span style={{ position: "absolute", top: 12, left: 12, background: V.pitch, border: `1px solid ${V.pending}66`, color: V.pending, padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, fontFamily: FONT_BODY }}>
            HIGH DEMAND
          </span>
        )}
        {/* Occupancy bar */}
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: V.chalkFaint, fontSize: 10, fontFamily: FONT_BODY }}>Occupancy</span>
            <span style={{ color: turf.occupancy > 70 ? V.pending : V.confirmed, fontSize: 10, fontWeight: 700, fontFamily: FONT_DATA }}>{turf.occupancy}%</span>
          </div>
          <div style={{ height: 3, background: "rgba(245,247,242,0.1)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${turf.occupancy}%`, background: turf.occupancy > 70 ? V.pending : V.confirmed, borderRadius: 2, transition: "width 1s ease" }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h3 style={{ color: V.chalk, fontWeight: 400, fontSize: 22, margin: 0, fontFamily: FONT_DISPLAY, letterSpacing: 0.3 }}>{turf.name}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: V.chalkFaint, fontSize: 12, marginTop: 4, fontFamily: FONT_BODY }}>
              <Icon name="map" size={12} color={V.chalkFaint} />
              {turf.location}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: V.chalk, fontWeight: 700, fontSize: 20, fontFamily: FONT_DATA }}>
              ₹{price}
            </div>
            <div style={{ color: V.chalkFaint, fontSize: 10, fontFamily: FONT_BODY }}>/hour</div>
          </div>
        </div>

        {/* Sports */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {turf.sports.map(s => (
            <span key={s} style={{ background: V.floodDim, border: `1px solid ${V.flood}33`, color: V.flood, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: FONT_BODY }}>
              {s}
            </span>
          ))}
          {turf.amenities.slice(0, 2).map(a => (
            <span key={a} style={{ background: "transparent", border: `1px solid ${V.line}`, color: V.chalkDim, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: FONT_BODY }}>
              {a}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Icon key={i} name="star" size={12} filled={i < Math.round(turf.rating)} color={i < Math.round(turf.rating) ? V.flood : V.line} />
            ))}
          </div>
          <span style={{ color: V.chalk, fontWeight: 700, fontSize: 13, fontFamily: FONT_DATA }}>{turf.rating}</span>
          <span style={{ color: V.chalkFaint, fontSize: 12, fontFamily: FONT_BODY }}>({turf.reviews} reviews)</span>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => onBook(turf)} style={buttonStyle("primary", "md")}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Book now
          </button>
          <button onClick={() => onMatch(turf)} style={buttonStyle("secondary", "md")}
            onMouseEnter={e => { e.currentTarget.style.borderColor = V.lineStrong; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = V.line; }}
          >
            Join game
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOOKING MODAL
// ============================================================
function BookingModal({ turf, profile, supabase, onClose, onConfirm, showToast }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(1); // 1: slot, 2: confirm, 3: success
  const [timer, setTimer] = useState(600);
  const [submitting, setSubmitting] = useState(false);
  const price = turf ? calcPrice(turf, turf.occupancy) : 0;
  const points = Math.floor(price * 0.1);

  useEffect(() => {
    if (step === 2 && timer > 0) {
      const t = setInterval(() => setTimer(p => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [step, timer]);

  if (!turf) return null;

  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handlePay = async () => {
    if (selectedSlot === null || !profile?.id) return;
    setSubmitting(true);
    const slot = turf.slots[selectedSlot];
    const { error } = await supabase.from("bookings").insert({
      turf_id: turf.id,
      player_id: profile.id,
      booking_date: todayStr(),
      start_time: slot.raw_time,
      sport: turf.sports[0],
      players_count: 1,
      price,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        showToast("That slot was just taken — pick another.", { type: "error" });
        setStep(1);
      } else {
        showToast("Couldn't complete the booking. Try again.", { type: "error" });
      }
      return;
    }
    setStep(3);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        ...panel(true), borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto",
        animation: "slideUp 0.3s ease",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${V.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: V.chalk, margin: 0, fontSize: 24, fontFamily: FONT_DISPLAY, fontWeight: 400 }}>
              {step === 3 ? "Booking confirmed" : `Book ${turf.name}`}
            </h2>
            <p style={{ color: V.chalkFaint, margin: "4px 0 0", fontSize: 13, fontFamily: FONT_BODY }}>{turf.location}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ color: V.chalkDim, fontSize: 14, fontFamily: FONT_BODY }}>Select time slot</span>
                <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: FONT_BODY }}>
                  <span style={{ color: V.flood }}>● Available</span>
                  <span style={{ color: V.pending }}>● Locked</span>
                  <span style={{ color: V.chalkFaint }}>● Booked</span>
                </div>
              </div>
              <SlotGrid slots={turf.slots} onSelect={setSelectedSlot} selected={selectedSlot} />
              <div style={{ marginTop: 16, padding: "12px 16px", background: V.pitchCardRaised, borderRadius: 12, border: `1px solid ${V.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: V.chalkDim, fontSize: 13, fontFamily: FONT_BODY }}>Price / hour</span>
                  <span style={{ color: V.chalk, fontWeight: 700, fontFamily: FONT_DATA }}>₹{price}</span>
                </div>
                {turf.occupancy > 70 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: V.pending, fontFamily: FONT_BODY }}>Peak pricing — high demand</div>
                )}
              </div>
              <button
                disabled={selectedSlot === null}
                onClick={() => { setStep(2); setTimer(600); }}
                style={{
                  marginTop: 16, width: "100%", padding: "14px", borderRadius: 12,
                  background: selectedSlot !== null ? V.flood : V.line,
                  color: selectedSlot !== null ? V.pitch : V.chalkFaint, border: "none", fontWeight: 800, fontSize: 15, cursor: selectedSlot !== null ? "pointer" : "not-allowed",
                  fontFamily: FONT_BODY,
                }}
              >
                Continue to payment →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Slot Lock Timer */}
              <div style={{ background: "rgba(245,166,35,0.1)", border: `1px solid ${V.pending}4D`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: V.pending, fontWeight: 700, fontSize: 13, fontFamily: FONT_BODY }}>Slot locked for you</div>
                  <div style={{ color: V.chalkDim, fontSize: 12, marginTop: 2, fontFamily: FONT_BODY }}>Complete payment to confirm</div>
                </div>
                <div style={{ color: V.pending, fontWeight: 800, fontSize: 24, fontFamily: FONT_DATA }}>
                  {formatTimer(timer)}
                </div>
              </div>

              {/* Booking Summary */}
              <div style={{ background: V.pitchCardRaised, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${V.line}` }}>
                <h4 style={{ color: V.chalkFaint, fontSize: 12, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1, fontFamily: FONT_BODY }}>Booking summary</h4>
                {[
                  ["Turf", turf.name],
                  ["Location", turf.location],
                  ["Time slot", turf.slots[selectedSlot]?.time + " - " + (parseInt(turf.slots[selectedSlot]?.time) + 1) + ":00"],
                  ["Duration", "1 hour"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY }}>{k}</span>
                    <span style={{ color: V.chalk, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{v}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: V.line, margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: V.chalkDim, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY }}>Total</span>
                  <span style={{ color: V.flood, fontSize: 20, fontWeight: 800, fontFamily: FONT_DATA }}>₹{price}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: V.confirmed, fontFamily: FONT_BODY }}>
                  +{points} reward points earned on this booking
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: "13px", borderRadius: 12, background: "transparent", border: `1px solid ${V.line}`, color: V.chalk, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>
                  ← Back
                </button>
                <button disabled={submitting} onClick={handlePay} style={{
                  padding: "13px", borderRadius: 12, background: V.flood,
                  border: "none", color: V.pitch, fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontFamily: FONT_BODY,
                  opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? "Processing…" : `Pay ₹${price} →`}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: V.floodDim, border: `1px solid ${V.flood}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Icon name="check" size={28} color={V.flood} />
              </div>
              <h3 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 400, marginBottom: 8 }}>You're all set</h3>
              <p style={{ color: V.chalkDim, marginBottom: 24, fontFamily: FONT_BODY, fontSize: 14 }}>Your slot at {turf.name} has been confirmed. A QR code has been sent to your email.</p>

              {/* QR Placeholder */}
              <div style={{ background: V.chalk, width: 140, height: 140, margin: "0 auto 20px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, padding: 12 }}>
                  {[...Array(25)].map((_, i) => (
                    <div key={i} style={{ width: 8, height: 8, background: Math.random() > 0.4 ? V.pitch : "transparent", borderRadius: 1 }} />
                  ))}
                </div>
              </div>

              <div style={{ background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ color: V.chalkDim, fontSize: 14, fontFamily: FONT_BODY }}>Reward points earned</span>
                <span style={{ color: V.flood, fontWeight: 800, fontSize: 20, fontFamily: FONT_DATA }}>+{points} pts</span>
              </div>

              <button onClick={onConfirm} style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: V.flood,
                border: "none", color: V.pitch, fontWeight: 800, fontSize: 15, cursor: "pointer",
                fontFamily: FONT_BODY,
              }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HERO SECTION
// ============================================================
function HeroSection({ onExplore }) {
  const [stats] = useState({ turfs: 240, cities: 18, bookings: 52000, players: 91000 });
  const [searchVal, setSearchVal] = useState("");

  const submitSearch = () => onExplore(searchVal);

  return (
    <div className="vt-hero" style={{
      minHeight: "min(88vh, 720px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "80px 24px 60px",
    }}>
      {/* One orchestrated moment: a single floodlight glow, not a field of orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(${V.line} 1px, transparent 1px), linear-gradient(90deg, ${V.line} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: "0%",
          width: 700, height: 500,
          background: `radial-gradient(ellipse at top, ${V.flood}18 0%, transparent 65%)`,
          transform: "translate(-50%, -20%)",
          animation: "heroFloodlight 3s ease-out",
        }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(48px, 8vw, 84px)",
          lineHeight: 0.95,
          margin: "0 0 24px",
          fontFamily: FONT_DISPLAY,
          letterSpacing: 0.5,
        }}>
          <span style={{ color: V.chalk }}>Play on</span>
          <br />
          <span style={{ color: V.flood }}>your terms</span>
        </h1>

        <p style={{ color: V.chalkDim, fontSize: 18, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.6, fontFamily: FONT_BODY }}>
          Real turf availability, honest pricing, and a QR code the moment you book. No guesswork.
        </p>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, maxWidth: 520, margin: "0 auto 48px", background: V.pitchCard, borderRadius: 14, padding: 10, border: `1px solid ${V.line}`, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingLeft: 12 }}>
            <Icon name="search" size={18} color={V.chalkFaint} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitSearch()}
              placeholder="Search turfs, sports, locations…"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: V.chalk, fontSize: 15, fontFamily: FONT_BODY,
              }}
            />
          </div>
          <button onClick={submitSearch} style={{ ...buttonStyle("primary", "lg"), whiteSpace: "nowrap" }}>
            Find turfs
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 600, margin: "0 auto" }}>
          {[
            { value: stats.turfs, label: "Premium turfs", suffix: "+" },
            { value: stats.cities, label: "Cities", suffix: "" },
            { value: stats.bookings, label: "Bookings", suffix: "+" },
            { value: stats.players, label: "Players", suffix: "+" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: V.chalk, fontSize: 28, fontFamily: FONT_DATA, fontWeight: 700 }}>
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 4, fontFamily: FONT_BODY }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes heroFloodlight {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-height: 820px) {
          .vt-hero h1 { font-size: clamp(40px, 7vw, 64px) !important; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// DISCOVER / TURF LIST
// ============================================================
function DiscoverSection({ turfs, onBook, onMatch, isLoading, initialSearch = "" }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState(initialSearch);
  const sports = ["All", "Football", "Basketball", "Cricket"];

  useEffect(() => { setSearch(initialSearch); }, [initialSearch]);

  const q = search.trim().toLowerCase();
  const filtered = turfs
    .filter(t => filter === "All" || t.sports.includes(filter))
    .filter(t => !q || t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.sports.some(s => s.toLowerCase().includes(q)));

  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: 0 }}>
              Nearby turfs
            </h2>
            <p style={{ color: V.chalkFaint, margin: "6px 0 0", fontSize: 14, fontFamily: FONT_BODY }}>Ranked by availability</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {sports.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "8px 16px", borderRadius: 8,
                background: filter === s ? V.flood : "transparent",
                border: `1px solid ${filter === s ? V.flood : V.line}`,
                color: filter === s ? V.pitch : V.chalkDim,
                cursor: "pointer", fontSize: 13, fontWeight: 700,
                fontFamily: FONT_BODY, transition: "all 0.2s",
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 12, padding: "10px 14px", marginBottom: 32, maxWidth: 420 }}>
          <Icon name="search" size={16} color={V.chalkFaint} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, area, or sport…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: V.chalk, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: V.chalkFaint, cursor: "pointer", fontSize: 15, padding: 0 }}>×</button>
          )}
        </div>

        {isLoading ? (
          <SkeletonGrid count={3} minColWidth={320} cardHeight={160} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={q ? `No turfs match "${search}"` : "No turfs match that filter"}
            subtitle={q ? "Try a different name, area, or sport." : "Try a different sport, or check back later as new turfs come online."}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {filtered.map(t => (
              <TurfCard key={t.id} turf={t} onBook={onBook} onMatch={onMatch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MATCHMAKING SECTION
// ============================================================
function MatchmakingSection({ matches, onJoin, onLeave, isLoading, joinedMatchIds }) {
  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 8, padding: "5px 14px", marginBottom: 12 }}>
            <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: 0.4 }}>MATCHMAKING</span>
          </div>
          <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: 0 }}>Join a game</h2>
          <p style={{ color: V.chalkFaint, margin: "6px 0 0", fontFamily: FONT_BODY }}>Grouped with players close to your skill level</p>
        </div>

        {isLoading ? (
          <div style={{ display: "grid", gap: 16 }}>
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon="🎮"
            title="No open matches right now"
            subtitle="Check back soon, or start your own game and invite players."
            accent={V.flood}
          />
        ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {matches.map(m => {
            const fill = m.players / m.max;
            const skillColor = m.skill === "Beginner" ? V.confirmed : m.skill === "Intermediate" ? V.info : V.pending;
            return (
              <div key={m.id} style={{
                ...panel(), borderRadius: 14, padding: "20px 24px",
                display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = V.lineStrong}
                onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 22, opacity: 0.7 }}>{m.sport === "Football" ? "⚽" : m.sport === "Basketball" ? "🏀" : "🏏"}</span>
                    <div>
                      <h3 style={{ color: V.chalk, margin: 0, fontSize: 20, fontFamily: FONT_DISPLAY, fontWeight: 400 }}>{m.sport} match</h3>
                      <span style={{ color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY }}>{m.turf}</span>
                    </div>
                    <span style={{
                      marginLeft: 8,
                      background: "transparent",
                      color: skillColor,
                      border: `1px solid ${skillColor}55`,
                      padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: FONT_BODY,
                    }}>
                      {m.skill}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: V.chalkDim, fontSize: 13, fontFamily: FONT_BODY }}>
                      <Icon name="clock" size={13} color={V.chalkFaint} />
                      {m.date}, {m.time}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: V.chalkDim, fontSize: 13, fontFamily: FONT_BODY }}>
                      <Icon name="users" size={13} color={V.chalkFaint} />
                      {m.players}/{m.max} players
                    </div>
                  </div>
                  {/* Fill bar */}
                  <div style={{ height: 5, background: V.line, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${fill * 100}%`,
                      background: fill > 0.8 ? V.pending : V.flood,
                      borderRadius: 3, transition: "width 1s ease",
                    }} />
                  </div>
                </div>
                {joinedMatchIds?.has(m.id) ? (
                  <button onClick={() => onLeave(m)} style={{
                    background: "transparent", border: `1px solid ${V.danger}55`, borderRadius: 10, padding: "12px 24px",
                    color: V.danger, fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: FONT_BODY, whiteSpace: "nowrap",
                  }}>
                    Leave
                  </button>
                ) : (
                  <button disabled={fill >= 1} onClick={() => onJoin(m)} style={{
                    background: fill >= 1 ? "transparent" : V.flood,
                    border: fill >= 1 ? `1px solid ${V.line}` : "none", borderRadius: 10, padding: "12px 24px", color: fill >= 1 ? V.chalkFaint : V.pitch, fontWeight: 800,
                    cursor: fill >= 1 ? "not-allowed" : "pointer", fontSize: 14, fontFamily: FONT_BODY,
                    whiteSpace: "nowrap",
                  }}>
                    {fill >= 1 ? "Full" : "Join →"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LOYALTY LEDGER
// ============================================================
function LoyaltySection({ isLoading, leaderboard, myPoints }) {
  const nextMilestone = 2000;
  const progress = Math.min(1, myPoints / nextMilestone);
  const myRank = leaderboard.find(p => p.isYou)?.rank;

  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 8, padding: "5px 14px", marginBottom: 12 }}>
            <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: 0.4 }}>GAMIFICATION</span>
          </div>
          <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: 0 }}>Loyalty ledger</h2>
        </div>

        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* My Points Card */}
          <div style={{ ...panel(true), borderRadius: 16, padding: 28 }}>
            <div style={{ color: V.chalkFaint, fontSize: 13, marginBottom: 8, fontFamily: FONT_BODY }}>Your balance</div>
            <div style={{ color: V.chalk, fontFamily: FONT_DATA, fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
              {myPoints.toLocaleString()}
              <span style={{ fontSize: 16, color: V.flood, marginLeft: 8 }}>pts</span>
            </div>
            <div style={{ margin: "20px 0 8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: V.chalkFaint, fontSize: 12, fontFamily: FONT_BODY }}>Progress to gold</span>
              <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ height: 6, background: V.line, borderRadius: 4 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: V.flood, borderRadius: 4 }} />
            </div>
            <div style={{ color: V.chalkFaint, fontSize: 11, marginTop: 6, fontFamily: FONT_BODY }}>{Math.max(0, nextMilestone - myPoints)} pts to next milestone</div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Your rank", value: myRank ? `#${myRank}` : "Unranked" },
                { label: "Points balance", value: myPoints.toLocaleString() },
              ].map(s => (
                <div key={s.label} style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 12, border: `1px solid ${V.line}` }}>
                  <div style={{ color: V.chalkFaint, fontSize: 11, fontFamily: FONT_BODY }}>{s.label}</div>
                  <div style={{ color: V.chalk, fontWeight: 700, fontSize: 15, marginTop: 4, fontFamily: FONT_DATA }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ ...panel(), borderRadius: 16, padding: 28 }}>
            <div style={{ color: V.chalkFaint, fontSize: 13, marginBottom: 16, fontFamily: FONT_BODY }}>Community leaderboard</div>
            {leaderboard.length === 0 ? (
              <EmptyState icon="🏆" title="No points on the board yet" subtitle="Complete a booking to start earning loyalty points." accent={V.flood} />
            ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {leaderboard.map(p => (
                <div key={p.rank} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: p.isYou ? V.floodDim : "transparent",
                  border: `1px solid ${p.isYou ? V.flood + "40" : V.line}`,
                  borderRadius: 10,
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => { if (!p.isYou) e.currentTarget.style.borderColor = V.lineStrong; }}
                  onMouseLeave={e => { if (!p.isYou) e.currentTarget.style.borderColor = V.line; }}
                >
                  <RankBadge rank={p.rank} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: p.isYou ? V.flood : V.chalk, fontWeight: 600, fontSize: 14, fontFamily: FONT_BODY }}>{p.name}</div>
                  </div>
                  <div style={{ color: V.chalk, fontWeight: 800, fontFamily: FONT_DATA, fontSize: 14 }}>
                    {p.points.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardSection({ isLoading, bookings, matchesJoined, onCancel }) {
  const upcoming = bookings.filter(b => ["pending", "confirmed"].includes(b.status));
  const totalSpent = bookings.filter(b => ["confirmed", "completed"].includes(b.status)).reduce((sum, b) => sum + b.price, 0);
  const hoursPlayed = bookings.filter(b => b.status === "completed").length;

  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: "0 0 32px" }}>My dashboard</h2>

        {isLoading ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} lines={1} />)}
            </div>
            <Skeleton width={160} height={14} style={{ marginBottom: 16 }} />
            <div style={{ display: "grid", gap: 12 }}>
              {[...Array(2)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
            </div>
          </>
        ) : (
        <>
        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total spent", value: `₹${totalSpent.toLocaleString()}`, icon: "trending" },
            { label: "Completed bookings", value: hoursPlayed, icon: "clock" },
            { label: "Matches joined", value: matchesJoined, icon: "trophy" },
            { label: "Upcoming", value: upcoming.length, icon: "calendar" },
          ].map(s => (
            <div key={s.label} style={{ ...panel(), borderRadius: 14, padding: "20px 22px", transition: "transform 0.2s, border-color 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = V.lineStrong; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = V.line; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ background: V.floodDim, borderRadius: 8, padding: 8 }}>
                  <Icon name={s.icon} size={18} color={V.flood} />
                </div>
              </div>
              <div style={{ color: V.chalk, fontWeight: 700, fontSize: 24, fontFamily: FONT_DATA }}>{s.value}</div>
              <div style={{ color: V.chalkFaint, fontSize: 12, marginTop: 4, fontFamily: FONT_BODY }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Bookings */}
        <h3 style={{ color: V.chalkDim, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px", fontFamily: FONT_BODY }}>Upcoming bookings</h3>
        {upcoming.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No upcoming bookings"
            subtitle="Head to Discover to find a turf and lock in your next game."
          />
        ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {upcoming.map((b, i) => (
            <div key={i} style={{ ...panel(), borderRadius: 12, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = V.lineStrong}
              onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: V.pitchCardRaised, border: `1px solid ${V.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {b.sport === "Football" ? "⚽" : "🏀"}
                </div>
                <div>
                  <div style={{ color: V.chalk, fontWeight: 700, fontSize: 16, fontFamily: FONT_BODY }}>{b.turf}</div>
                  <div style={{ color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY }}>{b.date} · {b.time} · {b.sport}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontFamily: FONT_DATA, color: V.chalk, fontWeight: 700 }}>₹{b.price}</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY,
                  background: "transparent",
                  color: b.status === "confirmed" ? V.confirmed : V.pending,
                  border: `1px solid currentColor`,
                }}>
                  {b.status === "confirmed" ? "Confirmed" : "Pending"}
                </span>
                <button style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "8px 14px", color: V.chalkDim, cursor: "pointer", fontSize: 13, fontFamily: FONT_BODY, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = V.lineStrong}
                  onMouseLeave={e => e.currentTarget.style.borderColor = V.line}
                >
                  View QR
                </button>
                <button onClick={() => { if (window.confirm(`Cancel your booking at ${b.turf}?`)) onCancel(b.id); }} style={{ background: "transparent", border: `1px solid ${V.danger}55`, borderRadius: 8, padding: "8px 14px", color: V.danger, cursor: "pointer", fontSize: 13, fontFamily: FONT_BODY, transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(240,85,74,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function PlayerAppClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [bookingTurf, setBookingTurf] = useState(null);

  const [turfs, setTurfs] = useState([]);
  const [turfsLoading, setTurfsLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [myBookings, setMyBookings] = useState([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(true);
  const [matchesJoinedCount, setMatchesJoinedCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedMatchIds, setJoinedMatchIds] = useState(new Set());

  async function fetchTurfs() {
    const { data, error } = await supabase
      .from("turfs")
      .select("*")
      .eq("status", "live")
      .order("rating", { ascending: false });
    if (error) {
      showToast("Couldn't load turfs. Try refreshing.", { type: "error" });
      setTurfsLoading(false);
      return;
    }
    const date = todayStr();
    const withSlots = await Promise.all((data || []).map(async (t) => {
      const { data: slots } = await supabase.rpc("turf_slots", { p_turf_id: t.id, p_date: date });
      const slotList = (slots || []).map(s => ({ time: fmtTime(s.slot_time), raw_time: s.slot_time, status: s.status }));
      const bookedCount = slotList.filter(s => s.status !== "available").length;
      const occupancy = slotList.length ? Math.round((bookedCount / slotList.length) * 100) : 0;
      return { ...t, location: t.address, reviews: t.review_count, slots: slotList, occupancy };
    }));
    setTurfs(withSlots);
    setTurfsLoading(false);
  }

  async function fetchMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*, turf:turfs(name), match_participants(count)")
      .in("status", ["open", "full"])
      .order("match_date", { ascending: true });
    if (error) {
      showToast("Couldn't load matches. Try refreshing.", { type: "error" });
      setMatchesLoading(false);
      return;
    }
    const today = todayStr();
    setMatches((data || []).map(m => ({
      id: m.id,
      sport: m.sport,
      turf: m.turf?.name || "Turf",
      turf_id: m.turf_id,
      time: fmtTime(m.start_time),
      date: m.match_date === today ? "Today" : m.match_date,
      players: m.match_participants?.[0]?.count ?? 0,
      max: m.max_players,
      skill: m.skill_level,
    })));
    setMatchesLoading(false);
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase.from("leaderboard").select("*").order("rank").limit(10);
    if (error) {
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboard((data || []).map(p => ({
      rank: p.rank,
      name: p.player_id === profile?.id ? "You" : (p.full_name || "Player"),
      points: p.points,
      isYou: p.player_id === profile?.id,
    })));
    setLeaderboardLoading(false);
  }

  async function fetchMyBookings() {
    if (!profile?.id) { setMyBookingsLoading(false); return; }
    const { data, error } = await supabase
      .from("bookings")
      .select("*, turf:turfs(name)")
      .eq("player_id", profile.id)
      .order("booking_date", { ascending: true });
    if (error) {
      setMyBookingsLoading(false);
      return;
    }
    const today = todayStr();
    setMyBookings((data || []).map(b => ({
      id: b.id,
      turf: b.turf?.name || "Turf",
      date: b.booking_date === today ? "Today" : b.booking_date,
      time: fmtTime(b.start_time),
      sport: b.sport,
      price: Number(b.price),
      status: b.status,
    })));
    setMyBookingsLoading(false);

    const { count } = await supabase
      .from("match_participants")
      .select("id", { count: "exact", head: true })
      .eq("player_id", profile.id);
    setMatchesJoinedCount(count || 0);
  }

  async function fetchNotifications() {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) setNotifications(data || []);
  }

  async function fetchJoinedMatches() {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("match_participants")
      .select("match_id")
      .eq("player_id", profile.id);
    if (!error) setJoinedMatchIds(new Set((data || []).map(r => r.match_id)));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    if (error) {
      showToast("Couldn't cancel that booking.", { type: "error" });
      return;
    }
    showToast("Booking cancelled.", { type: "info" });
    fetchMyBookings();
    fetchTurfs();
  };

  const handleLeaveMatch = async (match) => {
    if (!profile?.id) return;
    const { error } = await supabase.from("match_participants").delete()
      .eq("match_id", match.id).eq("player_id", profile.id);
    if (error) {
      showToast("Couldn't leave the match.", { type: "error" });
      return;
    }
    showToast(`Left "${match.sport} Match" at ${match.turf}.`, { type: "info" });
    fetchMatches();
    fetchJoinedMatches();
  };

  useEffect(() => {
    fetchTurfs();
    fetchMatches();
    fetchLeaderboard();
    fetchMyBookings();
    fetchNotifications();
    fetchJoinedMatches();

    // Live slot/match/notification updates: when anyone books a slot,
    // joins a match, or a new notification arrives, refresh so every open
    // tab reflects it without a manual reload.
    const channel = supabase
      .channel("player-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchTurfs();
        fetchMyBookings();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants" }, () => { fetchMatches(); fetchJoinedMatches(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const isTabLoading = (tab) => {
    if (tab === "discover") return turfsLoading;
    if (tab === "matches") return matchesLoading;
    if (tab === "loyalty") return leaderboardLoading;
    if (tab === "dashboard") return myBookingsLoading;
    return false;
  };

  const handleBook = (turf) => setBookingTurf(turf);
  const handleBookingClose = () => setBookingTurf(null);

  const handleJoin = async (match) => {
    if (!profile?.id) return;
    const { error } = await supabase.from("match_participants").insert({ match_id: match.id, player_id: profile.id });
    if (error) {
      if (error.code === "23505") {
        showToast("You've already joined this match.", { type: "info" });
      } else {
        showToast("Couldn't join the match. Try again.", { type: "error" });
      }
      return;
    }
    showToast(`Joined "${match.sport} Match" at ${match.turf}! 🎉`, { type: "success" });
    fetchMatches();
    fetchJoinedMatches();
  };

  const handleBookingConfirmed = () => {
    handleBookingClose();
    showToast("Booking confirmed! Check your email for QR code. 🎉", { type: "success" });
    fetchTurfs();
    fetchMyBookings();
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (profile?.full_name || profile?.email || "P").trim().charAt(0).toUpperCase();

  const TABS = [
    { id: "home", label: "Home", icon: "home" },
    { id: "discover", label: "Discover", icon: "search" },
    { id: "matches", label: "Matches", icon: "users" },
    { id: "loyalty", label: "Loyalty", icon: "trophy" },
    { id: "dashboard", label: "Dashboard", icon: "calendar" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${V.pitch}; }
        ::-webkit-scrollbar-thumb { background: ${V.flood}; border-radius: 2px; }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input::placeholder { color: ${V.chalkFaint}; }

        /* Exactly one nav renders at a time: top bar on desktop, tab bar on mobile. */
        .vt-top-nav { display: flex; }
        .vt-bottom-nav { display: none; }
        .vt-mobile-topbar { display: none; }
        @media (max-width: 767px) {
          .vt-top-nav { display: none !important; }
          .vt-bottom-nav { display: flex !important; }
          .vt-mobile-topbar { display: flex !important; }
          .vt-main-content { padding-top: 56px !important; padding-bottom: 80px !important; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: V.pitch,
        color: V.chalk,
        fontFamily: FONT_BODY,
        position: "relative",
      }}>
        {/* SLIM TOP BAR (Mobile only) — the bottom tab bar is all navigation,
            so account actions (notifications, sign out) live here instead. */}
        <div className="vt-mobile-topbar" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(7,13,10,0.94)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V.line}`,
          padding: "0 16px", height: 56,
          alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: V.flood, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontSize: 15, color: V.pitch }}>V</div>
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.3, color: V.chalk }}>VELOCITY TURF</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={toggleNotifications} aria-label="Notifications" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Icon name="notification" size={15} />
              {unreadCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: V.flood }} />}
            </button>
            <button onClick={handleSignOut} aria-label="Sign out" title="Sign out" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>

        {/* TOP NAV (Desktop) */}
        <nav className="vt-top-nav" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(7,13,10,0.92)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V.line}`,
          padding: "0 32px",
          height: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: V.flood, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontSize: 18, color: V.pitch }}>V</div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.3, fontFamily: FONT_BODY }}>
              <span style={{ color: V.chalk }}>VELOCITY</span>
              <span style={{ color: V.flood }}> TURF</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", borderRadius: 8,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${V.flood}` : "2px solid transparent",
                color: activeTab === tab.id ? V.chalk : V.chalkDim,
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                transition: "color 0.2s, border-color 0.2s", fontFamily: FONT_BODY,
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <button onClick={toggleNotifications} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Icon name="notification" size={16} />
              {unreadCount > 0 && <span style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: "50%", background: V.flood }} />}
            </button>
            <button onClick={handleSignOut} title="Sign out" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: V.chalkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </nav>
        {showNotifications && (
          <>
            <div onClick={() => setShowNotifications(false)} style={{ position: "fixed", inset: 0, zIndex: 899 }} />
            <div style={{
              position: "fixed", top: 70, right: 16, width: "min(320px, calc(100vw - 32px))", maxHeight: 420, overflowY: "auto",
              background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)", zIndex: 1000,
            }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.line}`, fontWeight: 700, fontSize: 13, color: V.chalk, fontFamily: FONT_BODY }}>
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY }}>
                  Nothing yet — booking updates will show up here.
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${V.line}`, background: n.read ? "transparent" : V.floodDim }}>
                    <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 3 }}>{n.title}</div>
                    {n.body && <div style={{ color: V.chalkDim, fontSize: 12.5, fontFamily: FONT_BODY, lineHeight: 1.4 }}>{n.body}</div>}
                    <div style={{ color: V.chalkFaint, fontSize: 10.5, marginTop: 4, fontFamily: FONT_BODY }}>
                      {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* MAIN CONTENT */}
        <main className="vt-main-content" style={{ paddingTop: 64, paddingBottom: 80 }}>
          {activeTab === "home" && (
            <>
              <HeroSection onExplore={(query) => { setSearchQuery(query || ""); setActiveTab("discover"); }} />
              {/* Smart suggestion banner */}
              <div style={{ padding: "0 24px 60px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                  <div style={{
                    background: V.pitchCard, border: `1px solid ${V.line}`,
                    borderLeft: `3px solid ${V.flood}`,
                    borderRadius: "4px 14px 14px 4px", padding: "24px 32px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
                  }}>
                    <div>
                      <div style={{ color: V.chalk, fontWeight: 700, fontSize: 18, fontFamily: FONT_BODY }}>Best time to play: tomorrow, 7 AM</div>
                      <div style={{ color: V.chalkDim, fontSize: 13.5, marginTop: 4, fontFamily: FONT_BODY }}>Clear skies, 32% less demand, ₹960 average price</div>
                    </div>
                    <button onClick={() => setActiveTab("discover")} style={{
                      background: "transparent",
                      border: `1px solid ${V.flood}`, borderRadius: 10, padding: "11px 24px",
                      color: V.flood, fontWeight: 700, cursor: "pointer", fontSize: 14,
                      fontFamily: FONT_BODY,
                    }}>
                      Book for tomorrow
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "discover" && <DiscoverSection turfs={turfs} onBook={handleBook} onMatch={(turf) => { setActiveTab("matches"); showToast(`Showing open matches — look for ones at ${turf.name}.`, { type: "info" }); }} isLoading={isTabLoading("discover")} initialSearch={searchQuery} />}
          {activeTab === "matches" && <MatchmakingSection onJoin={handleJoin} onLeave={handleLeaveMatch} isLoading={isTabLoading("matches")} matches={matches} joinedMatchIds={joinedMatchIds} />}
          {activeTab === "loyalty" && <LoyaltySection isLoading={isTabLoading("loyalty")} leaderboard={leaderboard} myPoints={leaderboard.find(p => p.isYou)?.points ?? 0} />}
          {activeTab === "dashboard" && <DashboardSection isLoading={isTabLoading("dashboard")} bookings={myBookings} matchesJoined={matchesJoinedCount} onCancel={handleCancelBooking} />}
        </main>

        {/* BOTTOM TAB BAR (Mobile feel) */}
        <div className="vt-bottom-nav" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(7,13,10,0.94)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${V.line}`,
          justifyContent: "space-around", padding: "8px 0 12px",
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 16px", borderRadius: 12,
              color: activeTab === tab.id ? V.flood : V.chalkFaint,
              transition: "color 0.2s",
            }}>
              <Icon name={tab.icon} size={20} color={activeTab === tab.id ? V.flood : V.chalkFaint} />
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: V.flood }} />
              )}
            </button>
          ))}
        </div>

        {/* BOOKING MODAL */}
        {bookingTurf && (
          <BookingModal turf={bookingTurf} profile={profile} supabase={supabase} onClose={handleBookingClose} onConfirm={handleBookingConfirmed} showToast={showToast} />
        )}

        {/* Real-time indicator */}
        <div style={{
          position: "fixed", bottom: 76, right: 20, zIndex: 800,
          background: V.pitchCardRaised, border: `1px solid ${V.flood}44`,
          borderRadius: 50, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: V.flood, display: "block" }} />
          <span style={{ color: V.flood, fontSize: 11, fontWeight: 700, fontFamily: FONT_DATA }}>LIVE</span>
        </div>
      </div>
    </>
  );
}
