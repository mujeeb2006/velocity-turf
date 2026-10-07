"use client";

import Link from "next/link";
import { FONT_BODY, FONT_DISPLAY } from "@/lib/design-tokens";
import BrandMark from "@/components/brand-mark";

const tabs = ["Venues (481)", "Coaching (8)", "Events (1)", "Memberships (0)"];

const venues = [
  {
    name: "Depot18 - Sports",
    distance: "Jayamahal Palace Road (~2.8 km)",
    rating: 4.33,
    reviews: 21,
    tags: ["Football", "Cricket"],
    featured: true,
    bookable: true,
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
    details: "1 more",
  },
  {
    name: "Terra Arena",
    distance: "Railway Colony (~3.2 km)",
    rating: 4.14,
    reviews: 22,
    tags: ["Football"],
    featured: true,
    bookable: true,
    image:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80",
    details: "3 more",
  },
  {
    name: "WINGS Sports Centre",
    distance: "Maria Nketiah School (~4.9 km)",
    rating: 4.69,
    reviews: 65,
    tags: ["Football", "Cricket"],
    featured: true,
    bookable: true,
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    details: "2 more",
    promo: true,
  },
  {
    name: "Rush Arena",
    distance: "1.9 km • Bengaluru",
    rating: 4.81,
    reviews: 52,
    tags: ["Turf Football", "Box Cricket", "Pickleball"],
    featured: false,
    image:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80",
    details: "1 more",
  },
  {
    name: "Oxygen Powerplay Arena",
    distance: "3.1 km • Bengaluru",
    rating: 4.72,
    reviews: 41,
    tags: ["Box Cricket", "Turf Football"],
    featured: false,
    image:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80",
    details: "3 more",
  },
  {
    name: "RV Cricket Kingdom",
    distance: "3.7 km • Bengaluru",
    rating: 4.84,
    reviews: 74,
    tags: ["Box Cricket"],
    featured: false,
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    details: "1 more",
  },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="currentColor">
      <path d="M12 2.5l2.7 5.46 6.02.88-4.36 4.24 1.03 6-5.39-2.82-5.39 2.82 1.03-6L3.28 8.84l6.02-.88L12 2.5Z" />
    </svg>
  );
}

export default function LandingClient() {
  return (
    <div className="vt-professional-page">
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #f1f1ee; }
        a { color: inherit; }
        button, input, select { font: inherit; }
        .vt-professional-page {
          min-height: 100vh;
          background: #f3f4f1;
          color: #111827;
          font-family: ${FONT_BODY};
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 24px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(17,24,39,0.08);
        }
        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #1f7d62, #5ccf9a);
          color: white;
          font-weight: 800;
          font-size: 18px;
          box-shadow: 0 10px 20px rgba(19,120,88,0.18);
        }
        .brand-text {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          color: #08130f;
          letter-spacing: 0.02em;
        }
        .brand-text strong {
          font-size: 30px;
          font-family: ${FONT_DISPLAY};
          letter-spacing: -0.06em;
          line-height: 1;
          margin-top: 1px;
        }
        .brand-location {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 999px;
          background: #f6f7f4;
          color: #3a4a45;
          font-size: 14px;
          font-weight: 600;
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2fb77f, #7ce7b2);
          box-shadow: 0 0 0 3px rgba(47,183,127,0.12);
        }
        .main-nav {
          display: flex;
          align-items: center;
          gap: 24px;
          color: #1a2d29;
          font-size: 15px;
          font-weight: 600;
        }
        .main-nav a {
          text-decoration: none;
          color: #1e2d2b;
          opacity: 0.76;
        }
        .main-nav a.active {
          position: relative;
          opacity: 1;
          color: #0f2e2a;
        }
        .main-nav a.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -17px;
          height: 3px;
          border-radius: 999px;
          background: #24b36a;
        }
        .nav-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 24px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #1f9b6c, #2ac180);
          color: #fff;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-decoration: none;
          box-shadow: 0 12px 20px rgba(28,160,107,0.2);
        }
        .content-shell {
          max-width: 1240px;
          margin: 0 auto;
          padding: 30px 20px 48px;
        }
        .page-header {
          padding-top: 10px;
        }
        .page-header h1 {
          margin: 0 0 20px;
          font-size: clamp(2.2rem, 3vw, 3.1rem);
          line-height: 1.14;
          letter-spacing: -0.06em;
          font-family: ${FONT_DISPLAY};
          color: #1a1d20;
        }
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 18px;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(17,24,39,0.12);
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          width: min(100%, 560px);
          min-height: 54px;
          padding: 0 18px;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 16px;
          color: #55615d;
          box-shadow: 0 6px 20px rgba(15,23,42,0.02);
        }
        .search-box input {
          width: 100%;
          border: 0;
          background: transparent;
          color: #17242a;
          font-size: 15px;
          outline: none;
        }
        .search-box input::placeholder { color: #73807a; }
        .select-box {
          min-width: 230px;
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 18px;
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 16px;
          background: rgba(255,255,255,0.75);
          color: #223230;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(15,23,42,0.02);
        }
        .select-box .caret {
          width: 10px;
          height: 10px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg) translateY(-1px);
          opacity: 0.8;
        }
        .tabs {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 6px 0 0;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }
        .tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0;
          color: #2f3b3a;
          font-size: 15px;
          font-weight: 600;
          opacity: 0.8;
        }
        .tab.active {
          opacity: 1;
          color: #0f5341;
        }
        .tab.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -14px;
          height: 3px;
          border-radius: 999px;
          background: #24b36a;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }
        .venue-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 20px;
          background: rgba(255,255,255,0.42);
          box-shadow: 0 10px 30px rgba(15,23,42,0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .venue-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 32px rgba(15,23,42,0.06);
        }
        .venue-image {
          position: relative;
          height: 240px;
        }
        .venue-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .image-badges {
          position: absolute;
          inset: 14px 14px auto 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          pointer-events: none;
        }
        .featured-pill, .bookable-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.01em;
          border: 1px solid rgba(17,24,39,0.06);
        }
        .featured-pill {
          background: #f7c86d;
          color: #2f2300;
        }
        .bookable-pill {
          background: linear-gradient(135deg, #1ca76a, #2cc67d);
          color: white;
          box-shadow: 0 10px 18px rgba(28,167,106,0.18);
        }
        .card-body {
          padding: 18px 18px 16px;
        }
        .meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .venue-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #181e1c;
        }
        .rating {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(250,204,57,0.12);
          color: #8b6500;
          font-weight: 800;
          font-size: 12px;
        }
        .venue-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #53615f;
          font-size: 14px;
          margin-bottom: 14px;
        }
        .meta-settings {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .meta-left {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #384846;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }
        .meta-left .facility {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(17,24,39,0.04);
          color: #2e3d39;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 10px;
          background: rgba(17,24,39,0.04);
          border: 1px solid rgba(17,24,39,0.08);
          border-radius: 999px;
          color: #465a57;
          font-size: 11px;
          font-weight: 700;
        }
        .promo-card {
          position: absolute;
          right: 10px;
          bottom: 10px;
          width: 188px;
          padding: 16px 14px 12px;
          border-radius: 18px;
          background: linear-gradient(180deg, #128a5e, #0a6d4f);
          color: #fff;
          box-shadow: 0 20px 30px rgba(9,92,69,0.3);
        }
        .promo-card strong {
          display: block;
          font-size: 13px;
          line-height: 1.45;
          margin-bottom: 12px;
        }
        .promo-app {
          border-radius: 14px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          padding: 14px 12px 10px;
          text-align: center;
        }
        .promo-app .mini-phone {
          width: 80px;
          height: 110px;
          margin: 0 auto 10px;
          border-radius: 14px;
          background: linear-gradient(180deg, #12b76a, #0a7d52);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,0.22);
          position: relative;
        }
        .promo-app .mini-phone::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 12px;
          width: 28px;
          height: 28px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
        .promo-app .mini-phone::after {
          content: "VELOCITY";
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        @media (max-width: 1024px) {
          .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .main-nav { display: none; }
        }
        @media (max-width: 640px) {
          .topbar { padding: 0 14px; }
          .brand-text strong { font-size: 25px; }
          .brand-location { display: none; }
          .toolbar { flex-direction: column; align-items: stretch; }
          .search-box, .select-box { width: 100%; }
          .cards-grid { grid-template-columns: 1fr; }
          .content-shell { padding-left: 14px; padding-right: 14px; }
        }
      `}</style>

      <header className="topbar">
        <div className="brand-wrap">
          <BrandMark size={38} />
          <div className="brand-text">
            <strong>VELOCITY <span style={{ color: "#169B58" }}>TURF</span></strong>
            <span className="brand-location"><span className="brand-dot" /> Bengaluru</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <Link href="#">Games</Link>
          <Link href="#">Venues</Link>
          <Link href="#">Trainers</Link>
          <Link href="#">Partner with us</Link>
        </nav>

        <Link href="/login" className="nav-button">LOGIN</Link>
      </header>

      <main className="content-shell">
        <header className="page-header">
          <h1>Football Grounds in Bangalore: Book nearby Football Grounds</h1>

          <div className="toolbar">
            <label className="search-box" aria-label="Search by venue name">
              <SearchIcon />
              <input type="text" placeholder="Search by venue name" />
            </label>

            <div className="select-box" aria-label="Sport filter">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚽</span>
                <span>Football</span>
              </span>
              <span className="caret" />
            </div>
          </div>
        </header>

        <nav className="tabs" aria-label="Category tabs">
          {tabs.map((tab, index) => (
            <div key={tab} className={`tab ${index === 0 ? "active" : ""}`}>
              {tab}
            </div>
          ))}
        </nav>

        <section className="cards-grid" aria-label="Turf listing grid">
          {venues.map((venue) => (
            <article key={venue.name} className="venue-card">
              <div className="venue-image">
                <img src={venue.image} alt={venue.name} />
                <div className="image-badges">
                  {venue.featured ? <span className="featured-pill">Featured</span> : null}
                  {venue.bookable ? <span className="bookable-pill">Bookable</span> : null}
                </div>
                {venue.promo ? (
                  <div className="promo-card" aria-label="Promo card">
                    <strong>Get Karma Discounts by booking on the App</strong>
                    <div className="promo-app">
                      <div className="mini-phone" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="card-body">
                <div className="meta-row">
                  <h2 className="venue-name">{venue.name}</h2>
                  <span className="rating">
                    <StarIcon />
                    {venue.rating.toFixed(2)}
                  </span>
                </div>

                <div className="venue-info">
                  <PinIcon />
                  <span>{venue.distance}</span>
                </div>

                <div className="meta-settings">
                  <div className="meta-left">
                    <span className="facility">◉</span>
                    <span>{venue.details}</span>
                  </div>

                  <div className="tags">
                    {venue.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
