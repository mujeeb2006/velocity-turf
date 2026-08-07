"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// DESIGN TOKENS & CONSTANTS
// ============================================================
const COLORS = {
  electricBlue: "#0EA5E9",
  pitchGreen: "#22C55E",
  energyOrange: "#F97316",
  dark: "#050A14",
  darkCard: "#0D1526",
  darkBorder: "rgba(14,165,233,0.15)",
  glass: "rgba(13,21,38,0.7)",
};

const TURFS = [
  {
    id: 1,
    name: "Arena Nova",
    location: "Sector 18, Noida",
    sports: ["Football", "Cricket"],
    base: 1200,
    peak: 1800,
    rating: 4.9,
    reviews: 284,
    occupancy: 85,
    amenities: ["Floodlights", "Parking", "Cafeteria", "Showers"],
    slots: generateSlots(85),
    weather: "clear",
    image: "football",
  },
  {
    id: 2,
    name: "Zen Court",
    location: "Koramangala, Bengaluru",
    sports: ["Basketball", "Badminton"],
    base: 800,
    peak: 1200,
    rating: 4.7,
    reviews: 192,
    occupancy: 60,
    amenities: ["AC Hall", "Lockers", "WiFi"],
    slots: generateSlots(60),
    weather: "rain",
    image: "basketball",
  },
  {
    id: 3,
    name: "Apex Field",
    location: "Andheri, Mumbai",
    sports: ["Football", "Hockey"],
    base: 1500,
    peak: 2200,
    rating: 4.8,
    reviews: 341,
    occupancy: 45,
    amenities: ["Floodlights", "Turf", "Cafeteria"],
    slots: generateSlots(45),
    weather: "clear",
    image: "football",
  },
];

const LEADERBOARD = [
  { rank: 1, name: "Rahul M.", points: 4280, streak: 12, badge: "🏆" },
  { rank: 2, name: "Priya S.", points: 3940, streak: 9, badge: "🥈" },
  { rank: 3, name: "Arjun K.", points: 3710, streak: 7, badge: "🥉" },
  { rank: 4, name: "Sneha P.", points: 2890, streak: 5, badge: "⭐" },
  { rank: 5, name: "You", points: 1650, streak: 3, badge: "🎯" },
];

const MATCHES = [
  { id: 1, sport: "Football", turf: "Arena Nova", time: "6:00 PM", date: "Today", players: 7, max: 10, skill: "Intermediate" },
  { id: 2, sport: "Basketball", turf: "Zen Court", time: "8:00 AM", date: "Tomorrow", players: 4, max: 6, skill: "Beginner" },
  { id: 3, sport: "Cricket", turf: "Arena Nova", time: "4:00 PM", date: "Today", players: 16, max: 22, skill: "Advanced" },
];

function generateSlots(occupancy) {
  const hours = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  return hours.map((h, i) => ({
    time: h,
    status: i < Math.floor(hours.length * occupancy / 100) ? (Math.random() > 0.3 ? "booked" : "locked") : "available",
  }));
}

function calcPrice(turf, weather) {
  let price = turf.base;
  let modifier = 1;
  if (turf.occupancy > 80) modifier += 0.2;
  if (weather === "rain") modifier -= 0.1;
  return Math.round(price * modifier);
}

// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 20, color = "currentColor" }) => {
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {icons[name]}
    </svg>
  );
};

// ============================================================
// GLASSMORPHISM STYLES
// ============================================================
const glassStyle = (extra = {}) => ({
  background: "rgba(13, 21, 38, 0.75)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(14,165,233,0.15)",
  ...extra,
});

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
        const color = slot.status === "booked" ? "#374151" : slot.status === "locked" ? COLORS.energyOrange : COLORS.pitchGreen;
        const bg = slot.status === "available" ? (isSelected ? COLORS.pitchGreen : "rgba(34,197,94,0.1)") : (slot.status === "locked" ? "rgba(249,115,22,0.1)" : "rgba(55,65,81,0.3)");
        return (
          <button
            key={i}
            onClick={() => slot.status === "available" && onSelect(i)}
            disabled={slot.status !== "available"}
            style={{
              padding: "10px 4px",
              borderRadius: 10,
              border: `1px solid ${isSelected ? COLORS.pitchGreen : color + "40"}`,
              background: bg,
              color: isSelected ? "#fff" : color,
              fontSize: 12,
              fontWeight: 600,
              cursor: slot.status === "available" ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              fontFamily: "'Space Mono', monospace",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {slot.time}
            {slot.status === "locked" && (
              <div style={{ fontSize: 9, color: COLORS.energyOrange, marginTop: 2 }}>LOCKED</div>
            )}
            {isSelected && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.2)", borderRadius: 10 }} />
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
  const price = calcPrice(turf, turf.weather);
  const isDynamic = turf.occupancy > 80;
  const hasDiscount = turf.weather === "rain";

  const sportEmoji = { Football: "⚽", Basketball: "🏀", Cricket: "🏏", Badminton: "🏸", Hockey: "🏑" };
  const bgGradients = {
    football: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(34,197,94,0.08) 100%)",
    basketball: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(14,165,233,0.08) 100%)",
  };

  return (
    <div style={{
      ...glassStyle(),
      borderRadius: 20,
      overflow: "hidden",
      transition: "transform 0.3s, box-shadow 0.3s",
      cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(14,165,233,0.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Image Area */}
      <div style={{
        height: 160,
        background: bgGradients[turf.image] || bgGradients.football,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        <div style={{ fontSize: 64, opacity: 0.6 }}>{sportEmoji[turf.sports[0]]}</div>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 50%, rgba(5,10,20,0.9) 100%)",
        }} />
        {/* Badges */}
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
          {isDynamic && (
            <span style={{ background: "rgba(249,115,22,0.9)", color: "#fff", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
              🔥 HIGH DEMAND
            </span>
          )}
          {hasDiscount && (
            <span style={{ background: "rgba(14,165,233,0.9)", color: "#fff", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
              🌧 RAIN DEAL
            </span>
          )}
        </div>
        {/* Occupancy bar */}
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>Occupancy</span>
            <span style={{ color: turf.occupancy > 80 ? COLORS.energyOrange : COLORS.pitchGreen, fontSize: 10, fontWeight: 700 }}>{turf.occupancy}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${turf.occupancy}%`, background: turf.occupancy > 80 ? `linear-gradient(90deg, ${COLORS.energyOrange}, #ef4444)` : `linear-gradient(90deg, ${COLORS.pitchGreen}, ${COLORS.electricBlue})`, borderRadius: 2, transition: "width 1s ease" }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 18, margin: 0, fontFamily: "'Exo 2', sans-serif" }}>{turf.name}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 }}>
              <Icon name="map" size={12} color={COLORS.electricBlue} />
              {turf.location}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, fontFamily: "'Space Mono', monospace" }}>
              ₹{price}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>/hour</div>
          </div>
        </div>

        {/* Sports */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {turf.sports.map(s => (
            <span key={s} style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.3)", color: COLORS.electricBlue, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {sportEmoji[s]} {s}
            </span>
          ))}
          {turf.amenities.slice(0, 2).map(a => (
            <span key={a} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>
              {a}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Icon key={i} name="star" size={12} color={i < Math.floor(turf.rating) ? "#FBBF24" : "rgba(255,255,255,0.2)"} />
            ))}
          </div>
          <span style={{ color: "#FBBF24", fontWeight: 700, fontSize: 13 }}>{turf.rating}</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({turf.reviews} reviews)</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name={turf.weather === "rain" ? "rain" : "sun"} size={14} color={turf.weather === "rain" ? COLORS.electricBlue : "#FBBF24"} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{turf.weather === "rain" ? "Rain" : "Clear"}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => onBook(turf)} style={{
            background: `linear-gradient(135deg, ${COLORS.electricBlue}, #0284c7)`,
            color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "'Exo 2', sans-serif", transition: "opacity 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Book Now
          </button>
          <button onClick={() => onMatch(turf)} style={{
            background: "rgba(34,197,94,0.1)", color: COLORS.pitchGreen, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "'Exo 2', sans-serif", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOOKING MODAL
// ============================================================
function BookingModal({ turf, onClose, onConfirm }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(1); // 1: slot, 2: confirm, 3: success
  const [timer, setTimer] = useState(600);
  const price = turf ? calcPrice(turf, turf.weather) : 0;
  const points = Math.floor(price * 0.1);

  useEffect(() => {
    if (step === 2 && timer > 0) {
      const t = setInterval(() => setTimer(p => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [step, timer]);

  if (!turf) return null;

  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        ...glassStyle(), borderRadius: 24, width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto",
        animation: "slideUp 0.3s ease",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(14,165,233,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>
              {step === 3 ? "✅ Booking Confirmed!" : `Book ${turf.name}`}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: "4px 0 0", fontSize: 13 }}>{turf.location}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Select Time Slot</span>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ color: COLORS.pitchGreen }}>● Available</span>
                  <span style={{ color: COLORS.energyOrange }}>● Locked</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>● Booked</span>
                </div>
              </div>
              <SlotGrid slots={turf.slots} onSelect={setSelectedSlot} selected={selectedSlot} />
              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(14,165,233,0.05)", borderRadius: 12, border: "1px solid rgba(14,165,233,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Price / Hour</span>
                  <span style={{ color: "#fff", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>₹{price}</span>
                </div>
                {turf.occupancy > 80 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: COLORS.energyOrange }}>🔥 +20% surge — high demand</div>
                )}
                {turf.weather === "rain" && (
                  <div style={{ marginTop: 4, fontSize: 11, color: COLORS.electricBlue }}>🌧 -10% rain discount applied</div>
                )}
              </div>
              <button
                disabled={selectedSlot === null}
                onClick={() => { setStep(2); setTimer(600); }}
                style={{
                  marginTop: 16, width: "100%", padding: "14px", borderRadius: 14,
                  background: selectedSlot !== null ? `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})` : "rgba(255,255,255,0.1)",
                  color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: selectedSlot !== null ? "pointer" : "not-allowed",
                  fontFamily: "'Exo 2', sans-serif",
                }}
              >
                Continue to Payment →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Slot Lock Timer */}
              <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: COLORS.energyOrange, fontWeight: 700, fontSize: 13 }}>⏳ Slot Locked for You</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Complete payment to confirm</div>
                </div>
                <div style={{ color: COLORS.energyOrange, fontWeight: 800, fontSize: 24, fontFamily: "'Space Mono', monospace" }}>
                  {formatTimer(timer)}
                </div>
              </div>

              {/* Booking Summary */}
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <h4 style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>Booking Summary</h4>
                {[
                  ["Turf", turf.name],
                  ["Location", turf.location],
                  ["Time Slot", turf.slots[selectedSlot]?.time + " - " + (parseInt(turf.slots[selectedSlot]?.time) + 1) + ":00"],
                  ["Duration", "1 Hour"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{k}</span>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 600 }}>Total</span>
                  <span style={{ color: COLORS.electricBlue, fontSize: 20, fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>₹{price}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: COLORS.pitchGreen }}>
                  🎯 +{points} Reward Points earned on this booking
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "'Exo 2', sans-serif" }}>
                  ← Back
                </button>
                <button onClick={() => setStep(3)} style={{
                  padding: "13px", borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`,
                  border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
                }}>
                  Pay ₹{price} →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
              <h3 style={{ color: "#fff", fontFamily: "'Exo 2', sans-serif", fontSize: 22, marginBottom: 8 }}>You're All Set!</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>Your slot at {turf.name} has been confirmed. A QR code has been sent to your email.</p>

              {/* QR Placeholder */}
              <div style={{ background: "#fff", width: 140, height: 140, margin: "0 auto 20px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, padding: 12 }}>
                  {[...Array(25)].map((_, i) => (
                    <div key={i} style={{ width: 8, height: 8, background: Math.random() > 0.4 ? "#050A14" : "transparent", borderRadius: 1 }} />
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Reward Points Earned</span>
                <span style={{ color: COLORS.pitchGreen, fontWeight: 800, fontSize: 20, fontFamily: "'Space Mono', monospace" }}>+{points} pts</span>
              </div>

              <button onClick={onClose} style={{
                width: "100%", padding: "14px", borderRadius: 14,
                background: `linear-gradient(135deg, ${COLORS.pitchGreen}, ${COLORS.electricBlue})`,
                border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                fontFamily: "'Exo 2', sans-serif",
              }}>
                Done 🎯
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

  return (
    <div style={{
      minHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "80px 24px 60px",
    }}>
      {/* Animated background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        {/* Orbs */}
        {[
          { x: "10%", y: "20%", color: COLORS.electricBlue, size: 500, opacity: 0.08 },
          { x: "80%", y: "60%", color: COLORS.pitchGreen, size: 400, opacity: 0.07 },
          { x: "50%", y: "10%", color: COLORS.energyOrange, size: 300, opacity: 0.05 },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute", left: orb.x, top: orb.y,
            width: orb.size, height: orb.size,
            borderRadius: "50%",
            background: orb.color,
            filter: "blur(100px)",
            opacity: orb.opacity,
            transform: "translate(-50%, -50%)",
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 50, padding: "6px 16px", marginBottom: 32 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.pitchGreen, display: "inline-block", boxShadow: `0 0 10px ${COLORS.pitchGreen}` }} />
          <span style={{ color: COLORS.electricBlue, fontSize: 13, fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>AI-POWERED SPORTS BOOKING</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(48px, 8vw, 88px)",
          fontWeight: 900,
          lineHeight: 1.0,
          margin: "0 0 24px",
          fontFamily: "'Exo 2', sans-serif",
          letterSpacing: "-2px",
        }}>
          <span style={{ color: "#fff" }}>Play on</span>
          <br />
          <span style={{
            background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>Your Terms</span>
        </h1>

        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Book premium turfs with AI-driven pricing, real-time slot availability, and instant QR access.
        </p>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, maxWidth: 520, margin: "0 auto 48px", background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 8, border: "1px solid rgba(14,165,233,0.2)" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingLeft: 12 }}>
            <Icon name="search" size={18} color={COLORS.electricBlue} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search turfs, sports, locations..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 15, fontFamily: "'Exo 2', sans-serif",
              }}
            />
          </div>
          <button onClick={onExplore} style={{
            background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`,
            border: "none", borderRadius: 12, padding: "12px 24px",
            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
            fontFamily: "'Exo 2', sans-serif", whiteSpace: "nowrap",
          }}>
            Find Turfs →
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 600, margin: "0 auto" }}>
          {[
            { value: stats.turfs, label: "Premium Turfs", suffix: "+" },
            { value: stats.cities, label: "Cities", suffix: "" },
            { value: stats.bookings, label: "Bookings", suffix: "+" },
            { value: stats.players, label: "Players", suffix: "+" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 28, fontFamily: "'Space Mono', monospace" }}>
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>SCROLL TO EXPLORE</span>
        <div style={{ width: 1, height: 40, background: `linear-gradient(${COLORS.electricBlue}, transparent)` }} />
      </div>
    </div>
  );
}

// ============================================================
// DISCOVER / TURF LIST
// ============================================================
function DiscoverSection({ onBook, onMatch }) {
  const [filter, setFilter] = useState("All");
  const sports = ["All", "Football", "Basketball", "Cricket"];

  const filtered = filter === "All" ? TURFS : TURFS.filter(t => t.sports.includes(filter));

  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ color: "#fff", fontFamily: "'Exo 2', sans-serif", fontSize: 32, fontWeight: 800, margin: 0 }}>
              Nearby Turfs
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: "6px 0 0", fontSize: 14 }}>AI-ranked by availability & weather</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {sports.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "8px 16px", borderRadius: 50,
                background: filter === s ? COLORS.electricBlue : "rgba(255,255,255,0.05)",
                border: `1px solid ${filter === s ? COLORS.electricBlue : "rgba(255,255,255,0.1)"}`,
                color: filter === s ? "#fff" : "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
                fontFamily: "'Exo 2', sans-serif", transition: "all 0.2s",
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {filtered.map(t => (
            <TurfCard key={t.id} turf={t} onBook={onBook} onMatch={onMatch} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MATCHMAKING SECTION
// ============================================================
function MatchmakingSection({ onJoin }) {
  return (
    <div style={{ padding: "60px 24px", background: "rgba(34,197,94,0.02)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 50, padding: "5px 14px", marginBottom: 12 }}>
            <span style={{ color: COLORS.pitchGreen, fontSize: 12, fontWeight: 700 }}>🤖 AI MATCHMAKING</span>
          </div>
          <h2 style={{ color: "#fff", fontFamily: "'Exo 2', sans-serif", fontSize: 32, fontWeight: 800, margin: 0 }}>Join a Game</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>Collaborative filtering groups you with players of your skill level</p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {MATCHES.map(m => {
            const fill = m.players / m.max;
            return (
              <div key={m.id} style={{
                ...glassStyle(), borderRadius: 18, padding: "20px 24px",
                display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(34,197,94,0.35)`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `rgba(14,165,233,0.15)`}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{m.sport === "Football" ? "⚽" : m.sport === "Basketball" ? "🏀" : "🏏"}</span>
                    <div>
                      <h3 style={{ color: "#fff", margin: 0, fontSize: 17, fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>{m.sport} Match</h3>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{m.turf}</span>
                    </div>
                    <span style={{
                      marginLeft: 8,
                      background: m.skill === "Beginner" ? "rgba(34,197,94,0.15)" : m.skill === "Intermediate" ? "rgba(14,165,233,0.15)" : "rgba(249,115,22,0.15)",
                      color: m.skill === "Beginner" ? COLORS.pitchGreen : m.skill === "Intermediate" ? COLORS.electricBlue : COLORS.energyOrange,
                      border: `1px solid currentColor`,
                      opacity: 0.9,
                      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    }}>
                      {m.skill}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                      <Icon name="clock" size={13} color={COLORS.electricBlue} />
                      {m.date}, {m.time}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                      <Icon name="users" size={13} color={COLORS.pitchGreen} />
                      {m.players}/{m.max} players
                    </div>
                  </div>
                  {/* Fill bar */}
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${fill * 100}%`,
                      background: fill > 0.8 ? `linear-gradient(90deg, ${COLORS.energyOrange}, #ef4444)` : `linear-gradient(90deg, ${COLORS.pitchGreen}, ${COLORS.electricBlue})`,
                      borderRadius: 3, transition: "width 1s ease",
                    }} />
                  </div>
                </div>
                <button onClick={() => onJoin(m)} style={{
                  background: fill >= 1 ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${COLORS.pitchGreen}, ${COLORS.electricBlue})`,
                  border: "none", borderRadius: 14, padding: "12px 24px", color: "#fff", fontWeight: 700,
                  cursor: fill >= 1 ? "not-allowed" : "pointer", fontSize: 14, fontFamily: "'Exo 2', sans-serif",
                  whiteSpace: "nowrap",
                }}>
                  {fill >= 1 ? "Full" : "Join →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOYALTY LEDGER
// ============================================================
function LoyaltySection() {
  const userPoints = 1650;
  const nextMilestone = 2000;
  const progress = userPoints / nextMilestone;

  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 50, padding: "5px 14px", marginBottom: 12 }}>
            <span style={{ color: COLORS.energyOrange, fontSize: 12, fontWeight: 700 }}>🏆 GAMIFICATION</span>
          </div>
          <h2 style={{ color: "#fff", fontFamily: "'Exo 2', sans-serif", fontSize: 32, fontWeight: 800, margin: 0 }}>Loyalty Ledger</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* My Points Card */}
          <div style={{ ...glassStyle(), borderRadius: 20, padding: 28, background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(14,165,233,0.05))" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 8 }}>Your Balance</div>
            <div style={{ color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
              {userPoints.toLocaleString()}
              <span style={{ fontSize: 18, color: COLORS.energyOrange, marginLeft: 8 }}>pts</span>
            </div>
            <div style={{ margin: "20px 0 8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Progress to Gold</span>
              <span style={{ color: COLORS.energyOrange, fontSize: 12, fontWeight: 700 }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${COLORS.energyOrange}, #FBBF24)`, borderRadius: 4 }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 6 }}>{nextMilestone - userPoints} pts to next milestone</div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Booking Streak", value: "3 days 🔥" },
                { label: "Total Bookings", value: "14" },
                { label: "Referrals", value: "3 friends" },
                { label: "Rank", value: "#5 🎯" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{s.label}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ ...glassStyle(), borderRadius: 20, padding: 28 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16 }}>Community Leaderboard</div>
            <div style={{ display: "grid", gap: 10 }}>
              {LEADERBOARD.map(p => (
                <div key={p.rank} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: p.name === "You" ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.name === "You" ? "rgba(14,165,233,0.25)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 12,
                }}>
                  <span style={{ fontSize: 18, width: 28 }}>{p.badge}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: p.name === "You" ? COLORS.electricBlue : "#fff", fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{p.streak} day streak 🔥</div>
                  </div>
                  <div style={{ color: COLORS.energyOrange, fontWeight: 800, fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
                    {p.points.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardSection() {
  const upcoming = [
    { turf: "Arena Nova", sport: "Football", date: "Apr 8", time: "6:00 PM", status: "confirmed", price: 1440 },
    { turf: "Zen Court", sport: "Basketball", date: "Apr 10", time: "8:00 AM", status: "pending", price: 800 },
  ];

  return (
    <div style={{ padding: "60px 24px", background: "rgba(14,165,233,0.01)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ color: "#fff", fontFamily: "'Exo 2', sans-serif", fontSize: 32, fontWeight: 800, margin: "0 0 32px" }}>My Dashboard</h2>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Spent", value: "₹18,240", icon: "trending", color: COLORS.electricBlue },
            { label: "Hours Played", value: "42 hrs", icon: "clock", color: COLORS.pitchGreen },
            { label: "Reward Points", value: "1,650", icon: "trophy", color: COLORS.energyOrange },
            { label: "Active Streak", value: "3 days", icon: "lightning", color: "#A855F7" },
          ].map(s => (
            <div key={s.label} style={{ ...glassStyle(), borderRadius: 18, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ background: s.color + "18", borderRadius: 10, padding: 8 }}>
                  <Icon name={s.icon} size={18} color={s.color} />
                </div>
              </div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Bookings */}
        <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Upcoming Bookings</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {upcoming.map((b, i) => (
            <div key={i} style={{ ...glassStyle(), borderRadius: 16, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.electricBlue + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {b.sport === "Football" ? "⚽" : "🏀"}
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Exo 2', sans-serif" }}>{b.turf}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{b.date} · {b.time} · {b.sport}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", color: "#fff", fontWeight: 700 }}>₹{b.price}</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: b.status === "confirmed" ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                  color: b.status === "confirmed" ? COLORS.pitchGreen : COLORS.energyOrange,
                  border: `1px solid currentColor`, opacity: 0.9,
                }}>
                  {b.status === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                </span>
                <button style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>
                  View QR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NOTIFICATION TOAST
// ============================================================
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 2000,
      ...glassStyle({ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.3)" }),
      borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
      animation: "slideIn 0.3s ease", maxWidth: 360,
    }}>
      <span style={{ fontSize: 20 }}>🔔</span>
      <span style={{ color: "#fff", fontSize: 14 }}>{message}</span>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function PlayerAppClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("home");
  const [bookingTurf, setBookingTurf] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => setToast(msg);

  const handleBook = (turf) => setBookingTurf(turf);
  const handleBookingClose = () => setBookingTurf(null);
  const handleJoin = (match) => showToast(`Joined "${match.sport} Match" at ${match.turf}! 🎉`);

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
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050A14; }
        ::-webkit-scrollbar-thumb { background: #0EA5E9; border-radius: 2px; }
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
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: COLORS.dark,
        color: "#fff",
        fontFamily: "'Exo 2', sans-serif",
        position: "relative",
      }}>
        {/* TOP NAV (Desktop) */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          ...glassStyle({ background: "rgba(5,10,20,0.85)" }),
          borderBottom: "1px solid rgba(14,165,233,0.1)",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.5, fontFamily: "'Exo 2', sans-serif" }}>
              <span style={{ color: "#fff" }}>VELOCITY</span>
              <span style={{ color: COLORS.electricBlue }}> TURF</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", borderRadius: 10,
                background: activeTab === tab.id ? "rgba(14,165,233,0.15)" : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent",
                color: activeTab === tab.id ? COLORS.electricBlue : "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                transition: "all 0.2s", fontFamily: "'Exo 2', sans-serif",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => showToast("Real-time slot updates active! 🔴")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 38, height: 38, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Icon name="notification" size={16} />
              <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: COLORS.energyOrange, animation: "pulse 2s infinite" }} />
            </button>
            <button onClick={handleSignOut} title="Sign out" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 38, height: 38, cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="logout" size={16} />
            </button>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {initial}
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main style={{ paddingTop: 64, paddingBottom: 80 }}>
          {activeTab === "home" && (
            <>
              <HeroSection onExplore={() => setActiveTab("discover")} />
              {/* AI Smart Suggestions Banner */}
              <div style={{ padding: "0 24px 60px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                  <div style={{
                    ...glassStyle({ background: "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(34,197,94,0.05))" }),
                    borderRadius: 20, padding: "24px 32px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
                  }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                      <div style={{ fontSize: 40 }}>🤖</div>
                      <div>
                        <div style={{ color: COLORS.electricBlue, fontWeight: 700, fontSize: 13, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>AI Smart Suggestion</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "'Exo 2', sans-serif" }}>Best time to play: Tomorrow 7 AM</div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>☀️ Clear skies · 32% less demand · ₹960 avg price</div>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab("discover")} style={{
                      background: `linear-gradient(135deg, ${COLORS.electricBlue}, ${COLORS.pitchGreen})`,
                      border: "none", borderRadius: 14, padding: "12px 28px",
                      color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
                      fontFamily: "'Exo 2', sans-serif",
                    }}>
                      Book for Tomorrow →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "discover" && <DiscoverSection onBook={handleBook} onMatch={handleJoin} />}
          {activeTab === "matches" && <MatchmakingSection onJoin={handleJoin} />}
          {activeTab === "loyalty" && <LoyaltySection />}
          {activeTab === "dashboard" && <DashboardSection />}
        </main>

        {/* BOTTOM TAB BAR (Mobile feel) */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
          ...glassStyle({ background: "rgba(5,10,20,0.92)" }),
          borderTop: "1px solid rgba(14,165,233,0.1)",
          display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 16px", borderRadius: 12,
              color: activeTab === tab.id ? COLORS.electricBlue : "rgba(255,255,255,0.35)",
              transition: "all 0.2s",
            }}>
              <Icon name={tab.icon} size={20} color={activeTab === tab.id ? COLORS.electricBlue : "rgba(255,255,255,0.35)"} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.electricBlue }} />
              )}
            </button>
          ))}
        </div>

        {/* BOOKING MODAL */}
        {bookingTurf && (
          <BookingModal turf={bookingTurf} onClose={handleBookingClose} onConfirm={() => { handleBookingClose(); showToast("Booking confirmed! Check your email for QR code. 🎉"); }} />
        )}

        {/* TOAST */}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        {/* Real-time indicator */}
        <div style={{
          position: "fixed", bottom: 76, right: 20, zIndex: 800,
          background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 50, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.pitchGreen, display: "block", animation: "pulse 1.5s infinite" }} />
          <span style={{ color: COLORS.pitchGreen, fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>LIVE</span>
        </div>
      </div>
    </>
  );
}
