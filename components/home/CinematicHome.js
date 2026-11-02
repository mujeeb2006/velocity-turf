"use client";

import { useState } from "react";
import Link from "next/link";
import { VIBRANT_PALETTE, FONT_DISPLAY, FONT_BODY, FONT_DATA } from "@/lib/design-tokens";
import { getTurfImages } from "@/lib/turf-images";
import BrandLockup from "@/components/brand-lockup";

const PARTNER_LOGOS = [
  { name: "FIFA QUALITY TURF", code: "FIFA PRO" },
  { name: "DECATHLON SPORTS", code: "DECATHLON" },
  { name: "NIKE ATHLETICS", code: "NIKE" },
  { name: "BENGALURU FC ACADEMY", code: "BFC" },
  { name: "PUMA SOCCER", code: "PUMA" },
  { name: "RED BULL ARENA", code: "RED BULL" },
];

const DEFAULT_FEATURED_TURFS = [
  {
    id: "turf-1",
    name: "Indiranagar Arena Pro Turf",
    city: "Bengaluru",
    location: "Indiranagar 100ft Road",
    sports: ["Football", "Cricket"],
    base_price: 1200,
    rating: 4.9,
    status: "live",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "turf-2",
    name: "Koramangala Kickoff Hub",
    city: "Bengaluru",
    location: "80ft Road, Koramangala",
    sports: ["Football"],
    base_price: 1400,
    rating: 4.8,
    status: "live",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "turf-3",
    name: "Whitefield Smash & Turf Club",
    city: "Bengaluru",
    location: "ITPL Main Road",
    sports: ["Badminton", "Tennis"],
    base_price: 900,
    rating: 4.9,
    status: "live",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "turf-4",
    name: "HSR Champions Cricket Pitch",
    city: "Bengaluru",
    location: "Sector 2, HSR Layout",
    sports: ["Cricket"],
    base_price: 1100,
    rating: 4.7,
    status: "live",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1000&q=85",
  },
];

const SAMPLE_MATCHES = [
  {
    id: "match-1",
    title: "Friday Night 5v5 Showdown",
    sport: "Football",
    venue: "Indiranagar Arena Pro Turf",
    time: "Today, 8:00 PM",
    playersNeeded: 3,
    totalPlayers: 10,
    price: 250,
    level: "Intermediate",
    color: "#18A8E0",
  },
  {
    id: "match-2",
    title: "Box Cricket League Match",
    sport: "Cricket",
    venue: "HSR Champions Cricket Pitch",
    time: "Tomorrow, 6:30 AM",
    playersNeeded: 2,
    totalPlayers: 12,
    price: 200,
    level: "Open for all",
    color: "#1769E8",
  },
  {
    id: "match-3",
    title: "Doubles Badminton Social",
    sport: "Badminton",
    venue: "Whitefield Smash & Turf Club",
    time: "Tomorrow, 7:00 PM",
    playersNeeded: 1,
    totalPlayers: 4,
    price: 180,
    level: "Intermediate",
    color: "#48D6E8",
  },
];

export default function CinematicHome({
  turfs = [],
  matches = [],
  tournaments = [],
  packages = [],
  isLoading = false,
  onBookTurf,
  onSelectSport,
  onExplore,
  onViewAllMatches,
  onViewTournaments,
  onViewPackages,
  onJoinMatch,
}) {
  const [hoveredTurfId, setHoveredTurfId] = useState(null);

  // Filter live turfs from database or use realistic defaults
  const liveTurfs = turfs && turfs.length > 0 ? turfs.filter((t) => t.status === "live") : [];
  const displayTurfs = liveTurfs.length > 0 ? liveTurfs.slice(0, 8) : DEFAULT_FEATURED_TURFS;

  // Real or fallback matches
  const displayMatches = matches && matches.length > 0 ? matches.slice(0, 3) : SAMPLE_MATCHES;

  return (
    <div
      style={{
        background: VIBRANT_PALETTE.white,
        color: VIBRANT_PALETTE.mainText,
        overflowX: "hidden",
        fontFamily: FONT_BODY,
      }}
    >
      {/* ──────────────────────────────────────────────────────────
          3. HERO SECTION (Sky-Blue to Electric-Blue Gradient + Turf Photo + Glow + Cards)
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "16px 20px 0",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            background: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
            color: "#FFFFFF",
            padding: "80px 24px 70px",
            boxShadow: "0 24px 60px rgba(23, 105, 232, 0.25)",
            textAlign: "center",
          }}
        >
          {/* Background photography overlay for sports depth */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle at 50% 30%, rgba(24, 168, 224, 0.72) 0%, rgba(23, 105, 232, 0.94) 85%), url('https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1800&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.38,
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />

          {/* Soft Cyan Glow and Floating Cloud-like Orbs */}
          <div
            className="vt-float-card-1"
            style={{
              position: "absolute",
              top: "-15%",
              left: "8%",
              width: "480px",
              height: "480px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(72, 214, 232, 0.45) 0%, rgba(72, 214, 232, 0) 70%)",
              filter: "blur(55px)",
              pointerEvents: "none",
            }}
          />
          <div
            className="vt-float-card-2"
            style={{
              position: "absolute",
              bottom: "-10%",
              right: "6%",
              width: "520px",
              height: "520px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(200, 245, 66, 0.32) 0%, rgba(24, 168, 224, 0) 70%)",
              filter: "blur(60px)",
              pointerEvents: "none",
            }}
          />

          {/* Centered Hero Typography & CTAs */}
          <div style={{ position: "relative", zIndex: 3, maxWidth: 900, margin: "0 auto" }}>
            {/* Small uppercase label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.22)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 26,
                color: "#FFFFFF",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#C8F542",
                  boxShadow: "0 0 10px #C8F542",
                }}
              />
              YOUR GAME. YOUR TURF. YOUR COMMUNITY.
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: "clamp(2.4rem, 5.5vw, 4.3rem)",
                fontWeight: 900,
                lineHeight: 1.12,
                margin: "0 0 20px",
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                textShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
              }}
            >
              Find Your Game.
              <br />
              <span style={{ color: "#C8F542", textShadow: "0 0 24px rgba(200, 245, 66, 0.5)" }}>
                Book Your Turf.
              </span>
              <br />
              Play Without Limits.
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                lineHeight: 1.6,
                color: "rgba(255, 255, 255, 0.94)",
                maxWidth: 680,
                margin: "0 auto 36px",
                fontWeight: 500,
              }}
            >
              Discover premium sports venues, connect with players, join matches and experience sports like never before.
            </p>

            {/* Dual CTA Buttons */}
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 50,
              }}
            >
              <button
                type="button"
                onClick={() => onExplore?.()}
                style={{
                  background: "#C8F542",
                  color: "#172B4D",
                  border: 0,
                  borderRadius: 14,
                  padding: "16px 34px",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 10px 28px rgba(200, 245, 66, 0.45)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  fontFamily: FONT_BODY,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 14px 34px rgba(200, 245, 66, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 10px 28px rgba(200, 245, 66, 0.45)";
                }}
              >
                <span>EXPLORE TURFS</span>
                <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
              </button>

              <button
                type="button"
                onClick={() => onViewAllMatches?.()}
                style={{
                  background: "#FFFFFF",
                  color: "#1769E8",
                  border: 0,
                  borderRadius: 14,
                  padding: "16px 32px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
                  transition: "transform 0.18s ease, background 0.18s ease",
                  fontFamily: FONT_BODY,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.background = "#EAF7FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "#FFFFFF";
                }}
              >
                <span>JOIN A MATCH</span>
              </button>
            </div>

            {/* Floating Colourful Information Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
                maxWidth: 1040,
                margin: "0 auto",
                textAlign: "left",
              }}
            >
              {/* Card 1: Venue Availability */}
              <div
                className="vt-float-card-1"
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(14px)",
                  borderRadius: 20,
                  padding: "20px 22px",
                  color: "#172B4D",
                  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#18A8E0", textTransform: "uppercase" }}>
                    LIVE AVAILABILITY
                  </span>
                  <span
                    style={{
                      background: "#E9F9ED",
                      color: "#10B981",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    ● 96% OPEN
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#172B4D", marginBottom: 4 }}>
                  Bengaluru Arenas
                </div>
                <p style={{ fontSize: 13, color: "#718096", margin: "0 0 14px", lineHeight: 1.4 }}>
                  18+ premium venues with live slot updates across Indiranagar, HSR & Koramangala.
                </p>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 32 }}>
                  {[40, 65, 80, 95, 70, 85, 100].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        background: i === 6 ? "#C8F542" : "#18A8E0",
                        height: `${h}%`,
                        borderRadius: 3,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Card 2: Centerpiece Captain Profile & Booking Pass */}
              <div
                className="vt-float-card-2"
                style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  padding: "20px 22px",
                  color: "#172B4D",
                  boxShadow: "0 22px 50px rgba(23, 105, 232, 0.22)",
                  border: "2px solid #C8F542",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 16,
                      boxShadow: "0 4px 12px rgba(23, 105, 232, 0.3)",
                    }}
                  >
                    AS
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#172B4D" }}>
                      Arjun Sharma
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#18A8E0" }}>
                      Verified Captain ★ 4.9
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#EAF7FF",
                      color: "#1769E8",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    CONFIRMED
                  </span>
                </div>
                <div
                  style={{
                    background: "#F4F7FA",
                    borderRadius: 12,
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "#718096", fontWeight: 700 }}>Next Game Pass</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#172B4D" }}>Indiranagar 5v5 Turf</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1769E8" }}>Today, 8 PM</div>
                </div>
              </div>

              {/* Card 3: Instant Booking & Atomic Slot Lock */}
              <div
                className="vt-float-card-3"
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(14px)",
                  borderRadius: 20,
                  padding: "20px 22px",
                  color: "#172B4D",
                  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#1769E8", textTransform: "uppercase" }}>
                    SPEED & RELIABILITY
                  </span>
                  <span
                    style={{
                      background: "#EAF7FF",
                      color: "#1769E8",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    ⚡ &lt; 15s LOCK
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#172B4D", marginBottom: 4 }}>
                  Zero Double-Bookings
                </div>
                <p style={{ fontSize: 13, color: "#718096", margin: "0 0 14px", lineHeight: 1.4 }}>
                  Atomic database slot reservation guarantees your game with instant digital QR entry.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#10B981" }}>✓ 100% Verified Slots</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#18A8E0" }}>• Free Cancellation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. COLOURFUL TRUSTED PARTNERS SECTION
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: VIBRANT_PALETTE.white,
          padding: "48px 24px",
          borderBottom: "1px solid #EAF7FF",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#718096",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            TRUSTED BY ATHLETIC CLUBS & VENUE OPERATORS
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 28,
            }}
          >
            {PARTNER_LOGOS.map((partner, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#718096",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.05em",
                  transition: "color 0.2s, transform 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1769E8";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#718096";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "#EAF7FF",
                    color: "#18A8E0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  ★
                </span>
                <span>{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. ABOUT VELOCITY TURF (Two-Column with Photo & Stats)
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: VIBRANT_PALETTE.lightBlue,
          padding: "88px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 48,
            alignItems: "center",
          }}
        >
          {/* Left Column: Story & Vision */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1px solid rgba(24, 168, 224, 0.25)",
                fontSize: 12,
                fontWeight: 800,
                color: "#1769E8",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#48D6E8" }} />
              ABOUT VELOCITY TURF
            </div>
            <h2
              style={{
                fontSize: "clamp(2rem, 3.8vw, 2.9rem)",
                fontWeight: 900,
                color: "#172B4D",
                lineHeight: 1.18,
                margin: "0 0 20px",
                letterSpacing: "-0.02em",
              }}
            >
              More Than Just A Place To Play.
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.65,
                color: "#718096",
                marginBottom: 20,
              }}
            >
              Velocity Turf is Bengaluru&apos;s premier sports-tech infrastructure network. We bridge passionate athletes, elite sports venues, and community leagues into a seamless, real-time ecosystem.
            </p>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "#718096",
                marginBottom: 32,
              }}
            >
              Whether you need a late-night floodlit football arena, a competitive cricket pitch, or players to complete your weekend squad, our platform makes every match effortless to book and unforgettable to play.
            </p>

            <button
              type="button"
              onClick={() => onExplore?.()}
              style={{
                background: "#C8F542",
                color: "#172B4D",
                border: 0,
                borderRadius: 12,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 8px 22px rgba(200, 245, 66, 0.4)",
                transition: "transform 0.15s ease",
                fontFamily: FONT_BODY,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <span>Explore Curated Venues</span>
              <span>→</span>
            </button>
          </div>

          {/* Right Column: Photography + Floating Stat Badges */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 20px 48px rgba(23, 105, 232, 0.16)",
                border: "4px solid #FFFFFF",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85"
                alt="Athletes playing football on turf"
                style={{
                  width: "100%",
                  height: "420px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(23, 105, 232, 0.4) 0%, transparent 60%)",
                }}
              />
            </div>

            {/* Floating Stat Card A (Top Left) */}
            <div
              className="vt-float-card-1"
              style={{
                position: "absolute",
                top: 20,
                left: -20,
                background: "#FFFFFF",
                borderRadius: 16,
                padding: "14px 18px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
                border: "1px solid #EAF7FF",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#EAF7FF",
                  color: "#1769E8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                🏟️
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#172B4D", lineHeight: 1 }}>18+</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#718096" }}>Premier Venues</div>
              </div>
            </div>

            {/* Floating Stat Card B (Bottom Right) */}
            <div
              className="vt-float-card-2"
              style={{
                position: "absolute",
                bottom: 24,
                right: -16,
                background: "#FFFFFF",
                borderRadius: 16,
                padding: "14px 20px",
                boxShadow: "0 14px 34px rgba(23, 105, 232, 0.2)",
                border: "2px solid #C8F542",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "#E9F9ED",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#172B4D", lineHeight: 1 }}>50,000+</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#718096" }}>Athletic Hours Played</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          6. DISCOVER TOP TURFS (Colourful Venue Cards with Real Data)
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: VIBRANT_PALETTE.white,
          padding: "90px 24px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 44,
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                color: "#18A8E0",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              PREMIUM VENUE DISCOVERY
            </div>
            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
                fontWeight: 900,
                color: "#172B4D",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Find Your Perfect Playing Ground.
            </h2>
            <p style={{ color: "#718096", fontSize: 15, margin: "8px 0 0" }}>
              Explore certified artificial grass football pitches, box cricket arenas, and indoor badminton courts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onExplore?.()}
            style={{
              background: "#EAF7FF",
              color: "#1769E8",
              border: "1px solid rgba(24, 168, 224, 0.25)",
              borderRadius: 12,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              transition: "background 0.2s, transform 0.15s",
              fontFamily: FONT_BODY,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1769E8";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#EAF7FF";
              e.currentTarget.style.color = "#1769E8";
            }}
          >
            View All Venues →
          </button>
        </div>

        {/* 3-4 Cards Per Row Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 26,
          }}
        >
          {displayTurfs.map((turf) => {
            const { cover } = getTurfImages(turf);
            const isHovered = hoveredTurfId === turf.id;
            const price = turf.price_per_hour || turf.base_price || 1200;
            const turfName = (turf.name || "Premier Arena").replace(/\[DEMO\]/g, "").trim();

            return (
              <div
                key={turf.id}
                onMouseEnter={() => setHoveredTurfId(turf.id)}
                onMouseLeave={() => setHoveredTurfId(null)}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 22,
                  overflow: "hidden",
                  border: isHovered ? "1px solid #18A8E0" : "1px solid #EAF7FF",
                  boxShadow: isHovered
                    ? "0 18px 40px rgba(23, 105, 232, 0.14)"
                    : "0 10px 26px rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                }}
              >
                {/* Image Section */}
                <div style={{ height: 190, position: "relative", overflow: "hidden", background: "#F4F7FA" }}>
                  <img
                    src={cover}
                    alt={turfName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      transition: "transform 0.35s ease",
                    }}
                  />
                  {/* Rating Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: "rgba(23, 43, 77, 0.85)",
                      backdropFilter: "blur(6px)",
                      color: "#C8F542",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    ★ {turf.rating || "4.8"}
                  </span>
                  {/* Lime-Green Availability Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "#C8F542",
                      color: "#172B4D",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 900,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    }}
                  >
                    ● Open Today
                  </span>
                </div>

                {/* Card Content */}
                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                        margin: 0,
                        color: "#172B4D",
                        lineHeight: 1.3,
                      }}
                    >
                      {turfName}
                    </h3>
                  </div>

                  <p style={{ fontSize: 13, color: "#718096", margin: "0 0 12px" }}>
                    📍 {turf.location || turf.city || "Bengaluru"}
                  </p>

                  {/* Sports tags */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                    {(turf.sports || ["Football"]).map((sport, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#EAF7FF",
                          color: "#1769E8",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {sport}
                      </span>
                    ))}
                  </div>

                  {/* Footer with Price and Book Now CTA */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 14,
                      borderTop: "1px solid #F4F7FA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "#718096", display: "block", fontWeight: 600 }}>Starting from</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#1769E8" }}>
                        ₹{price}
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#718096" }}>/hr</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBookTurf?.(turf)}
                      style={{
                        background: "#1769E8",
                        color: "#FFFFFF",
                        border: 0,
                        borderRadius: 10,
                        padding: "10px 18px",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(23, 105, 232, 0.25)",
                        transition: "background 0.2s, transform 0.15s",
                        fontFamily: FONT_BODY,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#18A8E0";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#1769E8";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      Book Now →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          7. MATCHES AND COMMUNITY (Soft Mint Background + Match Cards)
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: VIBRANT_PALETTE.softMint,
          padding: "88px 24px",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 40,
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  color: "#10B981",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                COMMUNITY & OPEN GAMES
              </div>
              <h2
                style={{
                  fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
                  fontWeight: 900,
                  color: "#172B4D",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Your Next Match Starts Here.
              </h2>
              <p style={{ color: "#718096", fontSize: 15, margin: "8px 0 0" }}>
                Looking for players? Join open community matches or host your own game with zero hassle.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onViewAllMatches?.()}
              style={{
                background: "#FFFFFF",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 12,
                padding: "12px 22px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.12)",
                fontFamily: FONT_BODY,
              }}
            >
              Browse All Matches →
            </button>
          </div>

          {/* Match Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
              gap: 24,
            }}
          >
            {displayMatches.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 20,
                  padding: "24px",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 18px 36px rgba(16, 185, 129, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.06)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span
                    style={{
                      background: m.sport === "Football" ? "#EAF7FF" : m.sport === "Cricket" ? "#E9F9ED" : "#FFF7ED",
                      color: m.sport === "Football" ? "#1769E8" : m.sport === "Cricket" ? "#10B981" : "#EA580C",
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 6,
                    }}
                  >
                    ⚽ {m.sport || "Football"}
                  </span>
                  <span
                    style={{
                      background: "#FEE2E2",
                      color: "#DC2626",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {m.playersNeeded ? `${m.playersNeeded} spots left` : "Filling Fast"}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#172B4D", margin: "0 0 8px" }}>
                  {m.title || "Community 5v5 Friendly"}
                </h3>

                <p style={{ fontSize: 13, color: "#718096", margin: "0 0 4px" }}>
                  🏟️ {m.venue || m.turf_name || "Indiranagar Arena"}
                </p>
                <p style={{ fontSize: 13, color: "#718096", margin: "0 0 18px" }}>
                  🕒 {m.time || m.scheduled_time || "Tonight, 8:00 PM"}
                </p>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 16,
                    borderTop: "1px solid #F4F7FA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: "#718096", display: "block" }}>Entry fee</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#172B4D" }}>
                      ₹{m.price || 250} <span style={{ fontSize: 11, color: "#718096" }}>/ player</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onJoinMatch) onJoinMatch(m);
                      else onViewAllMatches?.();
                    }}
                    style={{
                      background: "#C8F542",
                      color: "#172B4D",
                      border: 0,
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(200, 245, 66, 0.4)",
                      fontFamily: FONT_BODY,
                    }}
                  >
                    Join Match →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          8. WHY CHOOSE VELOCITY TURF (4 Colourful Feature Cards)
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: VIBRANT_PALETTE.white,
          padding: "90px 24px",
          maxWidth: 1240,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 50px" }}>
          <div
            style={{
              color: "#1769E8",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            THE VELOCITY ADVANTAGE
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
              fontWeight: 900,
              color: "#172B4D",
              margin: "0 0 14px",
              letterSpacing: "-0.02em",
            }}
          >
            Why Sports Enthusiasts Choose Us
          </h2>
          <p style={{ color: "#718096", fontSize: 15 }}>
            Built specifically for players and venue owners with speed, reliability, and community at the core.
          </p>
        </div>

        {/* 4 Alternating Colourful Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {/* Card 1: Light Blue */}
          <div
            style={{
              background: "#EAF7FF",
              borderRadius: 22,
              padding: "30px 26px",
              border: "1px solid rgba(24, 168, 224, 0.2)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(24, 168, 224, 0.08)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#18A8E0",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
                boxShadow: "0 6px 16px rgba(24, 168, 224, 0.3)",
              }}
            >
              🏟️
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#172B4D", margin: "0 0 10px" }}>
              1. Discover Premium Venues
            </h3>
            <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.6, margin: 0 }}>
              FIFA-grade artificial grass, international standard LED floodlights, locker rooms, and verified venue amenities.
            </p>
          </div>

          {/* Card 2: Soft Mint */}
          <div
            style={{
              background: "#E9F9ED",
              borderRadius: 22,
              padding: "30px 26px",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.08)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#10B981",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
                boxShadow: "0 6px 16px rgba(16, 185, 129, 0.3)",
              }}
            >
              ⚡
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#172B4D", margin: "0 0 10px" }}>
              2. Easy Online Booking
            </h3>
            <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.6, margin: 0 }}>
              Reserve your slot in under 15 seconds. Instant digital QR check-in passes, flexible payment, and zero wait time.
            </p>
          </div>

          {/* Card 3: Light Cyan */}
          <div
            style={{
              background: "#E0F9FD",
              borderRadius: 22,
              padding: "30px 26px",
              border: "1px solid rgba(72, 214, 232, 0.3)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(72, 214, 232, 0.08)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#1769E8",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
                boxShadow: "0 6px 16px rgba(23, 105, 232, 0.3)",
              }}
            >
              👥
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#172B4D", margin: "0 0 10px" }}>
              3. Find Players and Teams
            </h3>
            <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.6, margin: 0 }}>
              Never cancel due to missing players. Join local community matches, form squads, and level up your game with nearby athletes.
            </p>
          </div>

          {/* Card 4: White with Soft Shadow */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 22,
              padding: "30px 26px",
              border: "1px solid #EAF7FF",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 14px 34px rgba(23, 105, 232, 0.08)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#C8F542",
                color: "#172B4D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
                boxShadow: "0 6px 16px rgba(200, 245, 66, 0.4)",
              }}
            >
              🏆
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#172B4D", margin: "0 0 10px" }}>
              4. Compete in Tournaments
            </h3>
            <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.6, margin: 0 }}>
              Official weekend cups, corporate tournaments, real cash prize pools, verified referees, and live standings.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          9. CALL TO ACTION (Vibrant Blue-to-Cyan Gradient)
      ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 20px 80px", maxWidth: 1440, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background: "linear-gradient(135deg, #1769E8 0%, #48D6E8 100%)",
            color: "#FFFFFF",
            padding: "70px 24px",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(23, 105, 232, 0.25)",
            position: "relative",
          }}
        >
          {/* Subtle floating light effect */}
          <div
            style={{
              position: "absolute",
              top: "-30%",
              right: "10%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(200, 245, 66, 0.35) 0%, rgba(200, 245, 66, 0) 70%)",
              filter: "blur(50px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 2, maxWidth: 650, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)",
                fontWeight: 900,
                margin: "0 0 16px",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
              }}
            >
              Ready To Get In The Game?
            </h2>
            <p
              style={{
                fontSize: 17,
                color: "rgba(255, 255, 255, 0.95)",
                lineHeight: 1.6,
                margin: "0 auto 36px",
              }}
            >
              Find your turf, gather your team and make every match count.
            </p>

            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onExplore?.()}
                style={{
                  background: "#C8F542",
                  color: "#172B4D",
                  border: 0,
                  borderRadius: 14,
                  padding: "16px 36px",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(200, 245, 66, 0.45)",
                  fontFamily: FONT_BODY,
                }}
              >
                EXPLORE TURFS
              </button>
              <button
                type="button"
                onClick={() => onViewAllMatches?.()}
                style={{
                  background: "#FFFFFF",
                  color: "#1769E8",
                  border: 0,
                  borderRadius: 14,
                  padding: "16px 34px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 8px 22px rgba(0, 0, 0, 0.12)",
                  fontFamily: FONT_BODY,
                }}
              >
                GET STARTED
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          10. FOOTER (Clean Colourful Deep Blue Gradient — No Black Backgrounds)
      ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "linear-gradient(135deg, #0A3C78 0%, #1769E8 65%, #18A8E0 100%)",
          color: "#FFFFFF",
          padding: "70px 24px 36px",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 40,
            marginBottom: 50,
          }}
        >
          {/* Col 1: Brand & Bio */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.05em", color: "#FFFFFF" }}>
                VELOCITY TURF
              </span>
            </div>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 16px" }}>
              Bengaluru&apos;s leading sports-tech platform for real-time turf reservations, community matchmaking, and league tournaments.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C8F542", fontSize: 12, fontWeight: 800 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8F542" }} />
              ALL SYSTEMS ONLINE
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: "#C8F542", textTransform: "uppercase" }}>
              Quick Links
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, fontSize: 13.5 }}>
              <li>
                <button
                  type="button"
                  onClick={() => onExplore?.()}
                  style={{ background: "none", border: 0, padding: 0, color: "rgba(255, 255, 255, 0.85)", cursor: "pointer", fontWeight: 600 }}
                >
                  Discover Venues
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onViewAllMatches?.()}
                  style={{ background: "none", border: 0, padding: 0, color: "rgba(255, 255, 255, 0.85)", cursor: "pointer", fontWeight: 600 }}
                >
                  Join Matches
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onViewTournaments?.()}
                  style={{ background: "none", border: 0, padding: 0, color: "rgba(255, 255, 255, 0.85)", cursor: "pointer", fontWeight: 600 }}
                >
                  Tournaments & Leagues
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onViewPackages?.()}
                  style={{ background: "none", border: 0, padding: 0, color: "rgba(255, 255, 255, 0.85)", cursor: "pointer", fontWeight: 600 }}
                >
                  Sports Packages
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Popular Hubs */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: "#C8F542", textTransform: "uppercase" }}>
              Bengaluru Arenas
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, fontSize: 13.5, color: "rgba(255, 255, 255, 0.85)" }}>
              <li>Indiranagar 100ft Turf</li>
              <li>Koramangala Sports Hub</li>
              <li>HSR Layout Sector 2</li>
              <li>Whitefield Smash Club</li>
              <li>Bellandur Arena</li>
            </ul>
          </div>

          {/* Col 4: Contact & Support */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: "#C8F542", textTransform: "uppercase" }}>
              Contact & Support
            </div>
            <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 13.5, margin: "0 0 8px" }}>
              📧 support@velocityturf.in
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 13.5, margin: "0 0 8px" }}>
              📞 +91 98765 43210
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: 12.5, margin: 0 }}>
              📍 Indiranagar, Bengaluru, Karnataka 560038
            </p>
          </div>
        </div>

        {/* Bottom Copyright bar */}
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            paddingTop: 24,
            borderTop: "1px solid rgba(255, 255, 255, 0.18)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            fontSize: 12.5,
            color: "rgba(255, 255, 255, 0.75)",
          }}
        >
          <div>© {new Date().getFullYear()} Velocity Turf. All rights reserved.</div>
          <div style={{ display: "flex", gap: 20 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Venue Operator Agreement</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
