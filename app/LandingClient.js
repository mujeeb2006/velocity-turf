"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { COLORS as V, FONT_DISPLAY, FONT_BODY, FONT_DATA, buttonStyle } from "@/lib/design-tokens";
import StadiumScene from "@/components/StadiumScene";

function AnimatedCounter({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true);
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1400;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

const FEATURES = [
  {
    n: "01",
    title: "Real-time availability",
    body: "Slots update the moment someone else books — what you see on screen is what's actually open, not a stale calendar.",
  },
  {
    n: "02",
    title: "In, out, no calls",
    body: "Confirm a slot and your entry pass is a QR code, sent instantly. Show it at the gate — that's the whole check-in.",
  },
  {
    n: "03",
    title: "Short a player?",
    body: "Open matches list who's already in and at what level, so you can fill a game instead of cancelling it.",
  },
  {
    n: "04",
    title: "Play, earn, repeat",
    body: "Every booking adds to a running ledger. Climb the leaderboard against players in your city.",
  },
];

const STEPS = [
  { n: "1", title: "Find a turf", body: "Filter by sport, price, and what's actually free right now." },
  { n: "2", title: "Lock a slot", body: "Pick a time, pay, done. The slot is held the second you confirm." },
  { n: "3", title: "Show up and play", body: "Scan your QR at the gate. No paperwork, no front desk." },
];

function Icon({ name, size = 20, color = "currentColor" }) {
  const paths = {
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
      {paths[name]}
    </svg>
  );
}

export default function LandingClient() {
  return (
    <div style={{ background: V.pitch, color: V.chalk, fontFamily: FONT_BODY, minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a:focus-visible, button:focus-visible { outline: 2px solid ${V.flood}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="vt-landing-nav" style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,13,10,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${V.line}`,
        padding: "0 24px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="vt-landing-brand-mark" aria-hidden="true">⚡</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>
            <span style={{ color: V.chalk }}>VELOCITY</span> <span style={{ color: V.flood }}>TURF</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ ...buttonStyle("secondary", "sm"), textDecoration: "none", display: "inline-block" }}>Sign in</Link>
          <Link href="/signup" style={{ ...buttonStyle("primary", "sm"), textDecoration: "none", display: "inline-block" }}>Join to play</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="vt-landing-hero">
        <StadiumScene className="vt-landing-scene" />
        <div className="vt-landing-copy">
          <div className="vt-landing-kicker">YOUR CITY. YOUR PITCH. YOUR GAME.</div>
          <h1 className="vt-landing-title">MAKE ROOM<br />FOR <em>GAME NIGHT.</em></h1>
          <p className="vt-landing-description">
            Find a pitch that is actually available, bring your crew, and lock in a time. Your next game is closer than you think.
          </p>
          <div className="vt-landing-actions">
            <Link href="/signup" style={{ ...buttonStyle("primary", "lg"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              Create player account <Icon name="arrow" size={16} />
            </Link>
            <Link href="/login" style={{ ...buttonStyle("secondary", "lg"), textDecoration: "none", display: "inline-block" }}>
              Sign in
            </Link>
          </div>

          <div className="vt-landing-stats">
            {[
              { value: 240, label: "Turfs", suffix: "+" },
              { value: 18, label: "Cities", suffix: "" },
              { value: 52000, label: "Bookings", suffix: "+" },
              { value: 91000, label: "Players", suffix: "+" },
            ].map(s => (
              <div key={s.label}>
                <div className="vt-landing-stat-value">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </div>
                <div className="vt-landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — scoreboard rows, not a card grid */}
      <section style={{ padding: "40px 24px 100px", borderTop: `1px solid ${V.line}` }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {FEATURES.map((f, i) => (
            <div key={f.n} style={{
              display: "flex", gap: 28, alignItems: "baseline", padding: "36px 0",
              borderBottom: i < FEATURES.length - 1 ? `1px solid ${V.line}` : "none",
              flexDirection: i % 2 === 1 ? "row-reverse" : "row",
              textAlign: i % 2 === 1 ? "right" : "left",
            }}>
              <div style={{ fontFamily: FONT_DATA, fontSize: 48, color: "rgba(245,247,242,0.14)", fontWeight: 700, flexShrink: 0, width: 90 }}>
                {f.n}
              </div>
              <div>
                <h3 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400, margin: "0 0 8px", letterSpacing: 0.3 }}>{f.title}</h3>
                <p style={{ color: V.chalkDim, fontSize: 15.5, lineHeight: 1.6, margin: 0, maxWidth: 460, marginLeft: i % 2 === 1 ? "auto" : 0 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 400, textAlign: "center", margin: "0 0 56px" }}>
            Three steps. That's it.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {STEPS.map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 72, color: V.flood, lineHeight: 1, marginBottom: 12 }}>{s.n}</div>
                <h3 style={{ color: V.chalk, fontSize: 19, fontWeight: 700, margin: "0 0 8px", fontFamily: FONT_BODY }}>{s.title}</h3>
                <p style={{ color: V.chalkDim, fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYER BAND */}
      <section style={{ padding: "56px 24px", background: V.pitchCard, borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}` }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: V.floodDim, border: `1px solid ${V.flood}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span aria-hidden="true" style={{ color: V.flood, fontSize: 22 }}>⚡</span>
            </div>
            <div>
              <h3 style={{ color: V.chalk, fontSize: 20, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_BODY }}>Got a game in mind?</h3>
              <p style={{ color: V.chalkDim, fontSize: 14, margin: 0 }}>Get your people together and make the next match happen.</p>
            </div>
          </div>
          <Link href="/signup" style={{ ...buttonStyle("primary", "md"), textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}>
            Sign up to play
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 400, margin: "0 0 16px" }}>
          Ready to play?
        </h2>
        <p style={{ color: V.chalkDim, fontSize: 16, margin: "0 0 32px" }}>Your next game is one good plan away.</p>
        <Link href="/signup" style={{ ...buttonStyle("primary", "lg"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          Join Velocity Turf <Icon name="arrow" size={16} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "32px 24px", borderTop: `1px solid ${V.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="vt-landing-brand-mark" style={{ width: 22, height: 22, borderRadius: 5, fontSize: 12 }}>⚡</div>
          <span style={{ color: V.chalkFaint, fontSize: 12.5 }}>© {new Date().getFullYear()} Velocity Turf</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/login" style={{ color: V.chalkFaint, fontSize: 12.5, textDecoration: "none" }}>Log in</Link>
          <Link href="/signup" style={{ color: V.chalkFaint, fontSize: 12.5, textDecoration: "none" }}>Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
