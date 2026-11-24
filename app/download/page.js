import Link from "next/link";
import BrandLockup from "@/components/brand-lockup";

export const metadata = {
  title: "Download Velocity Turf Apps - Player, Owner & Admin PWAs",
  description: "Install dedicated Velocity Turf apps for Player, Turf Owner, and Administrator with home-screen instant launch and offline access.",
};

const APPS = [
  {
    role: "player",
    id: "player",
    title: "Velocity Turf Player",
    shortName: "VT Player",
    tagline: "For Players & Sports Lovers",
    badge: "PLAYER",
    description: "Instant slot booking, live availability across 18+ premier arenas, community pickup games, and digital QR check-in passes.",
    themeColor: "#1769E8",
    badgeBg: "#EAF2FD",
    badgeColor: "#1769E8",
    icon: "/icons/player/icon.svg",
    installUrl: "/install/player",
    dashboardUrl: "/player",
    features: [
      "Real-time turf slot booking with <15s lock",
      "Join open community pickup matches",
      "Digital QR ticket wallet & instant check-in",
      "Earn points & unlock loyalty reward slots",
    ],
    buttonText: "Download Player App",
    buttonBg: "#C8F542",
    buttonColor: "#111C2E",
  },
  {
    role: "owner",
    id: "owner",
    title: "Velocity Turf Owner",
    shortName: "VT Owner",
    tagline: "For Turf Owners & Managers",
    badge: "OWNER",
    description: "Complete venue portal: QR camera attendance scanner, walk-in bookings, dynamic pricing, schedule calendars, and daily revenue payouts.",
    themeColor: "#0E7050",
    badgeBg: "#E8F8F0",
    badgeColor: "#0E7050",
    icon: "/icons/owner/icon.svg",
    installUrl: "/install/owner",
    dashboardUrl: "/owner",
    features: [
      "Live QR camera scanner for arrivals",
      "Add instant walk-in cash/UPI bookings",
      "Custom peak/off-peak pricing bands",
      "Daily revenue breakdown & bank settlements",
    ],
    buttonText: "Download Owner App",
    buttonBg: "#0E7050",
    buttonColor: "#FFFFFF",
  },
  {
    role: "admin",
    id: "admin",
    title: "Velocity Turf Admin",
    shortName: "VT Admin",
    tagline: "For Platform Administrators",
    badge: "ADMIN",
    description: "Centralized governance: review & approve new turf submissions, manage users & roles, oversee disputes, and process owner payout batches.",
    themeColor: "#172B4D",
    badgeBg: "#F0F4F9",
    badgeColor: "#172B4D",
    icon: "/icons/admin/icon.svg",
    installUrl: "/install/admin",
    dashboardUrl: "/admin",
    features: [
      "Review & approve new turf listings",
      "User role administration & permissions",
      "Dispute resolution & cancellation refunds",
      "Automated batch payouts & audit logs",
    ],
    buttonText: "Download Admin App",
    buttonBg: "#172B4D",
    buttonColor: "#FFFFFF",
  },
];

export default function DownloadPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F4F7FC 0%, #FFFFFF 100%)",
        color: "#172B4D",
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "40px 16px 80px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Navigation header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <BrandLockup markSize={36} />
          </Link>
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/login"
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#172B4D",
                padding: "8px 16px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1px solid #E5EDF5",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Hero title */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 44px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "#EAF2FD",
              border: "1px solid #D1E3FB",
              fontSize: 12,
              fontWeight: 800,
              color: "#1769E8",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1769E8" }} />
            INSTALLABLE PROGRESSIVE WEB APPS
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 900,
              color: "#172B4D",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            Three Dedicated Apps.
            <br />
            <span style={{ color: "#1769E8" }}>Built for Every Role.</span>
          </h1>
          <p style={{ fontSize: 16, color: "#718096", lineHeight: 1.6, margin: 0 }}>
            Install Velocity Turf directly to your home screen or desktop. Each app runs in its own isolated window, opens directly to your dashboard, and works reliably offline.
          </p>
        </div>

        {/* 3 App Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 24,
            marginBottom: 48,
          }}
        >
          {APPS.map((app) => (
            <div
              key={app.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5EDF5",
                borderRadius: 24,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* App icon + header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <img
                  src={app.icon}
                  alt={app.title}
                  width={56}
                  height={56}
                  style={{ borderRadius: 14, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: app.badgeBg,
                      color: app.badgeColor,
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    {app.badge}
                  </span>
                  <h2 style={{ fontSize: 19, fontWeight: 800, color: "#172B4D", margin: 0 }}>
                    {app.title}
                  </h2>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: app.themeColor, marginBottom: 8 }}>
                {app.tagline}
              </div>

              <p style={{ fontSize: 13.5, color: "#718096", lineHeight: 1.5, margin: "0 0 20px", flex: "0 0 auto" }}>
                {app.description}
              </p>

              {/* Feature checkmarks */}
              <div style={{ display: "grid", gap: 9, marginBottom: 26, flex: 1 }}>
                {app.features.map((feat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#2D3748" }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "grid", gap: 10 }}>
                <Link
                  href={app.installUrl}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 20px",
                    borderRadius: 14,
                    background: app.buttonBg,
                    color: app.buttonColor,
                    fontSize: 14.5,
                    fontWeight: 800,
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    textAlign: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>{app.buttonText}</span>
                </Link>
                <Link
                  href={app.dashboardUrl}
                  style={{
                    display: "block",
                    padding: "10px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#1769E8",
                    textDecoration: "none",
                  }}
                >
                  Open in browser →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Installation Guide */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EDF5",
            borderRadius: 24,
            padding: "32px 28px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#172B4D", margin: "0 0 16px" }}>
            How Progressive Web App Installation Works
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1769E8", marginBottom: 4 }}>
                📱 Android (Chrome & Edge)
              </div>
              <p style={{ fontSize: 13, color: "#718096", margin: 0, lineHeight: 1.5 }}>
                Tap the Download button above, then tap <strong>Install</strong> when prompted. The app adds an icon to your home screen and app drawer.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1769E8", marginBottom: 4 }}>
                🍏 iPhone & iPad (Safari)
              </div>
              <p style={{ fontSize: 13, color: "#718096", margin: 0, lineHeight: 1.5 }}>
                Open the app in Safari, tap the <strong>Share</strong> button (box with arrow up), then choose <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1769E8", marginBottom: 4 }}>
                💻 Desktop (Chrome, Edge & Brave)
              </div>
              <p style={{ fontSize: 13, color: "#718096", margin: 0, lineHeight: 1.5 }}>
                Click the <strong>Install</strong> icon in your browser address bar to launch Velocity Turf as a standalone desktop window.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
