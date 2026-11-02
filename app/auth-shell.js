import BrandLockup from "@/components/brand-lockup";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "linear-gradient(135deg, #EAF7FF 0%, #E9F9ED 50%, #F1EEFF 100%)",
        position: "relative",
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "#FFFFFF",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(23, 105, 232, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)",
          border: "1px solid #E5EDF5",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          minHeight: 560,
        }}
      >
        {/* Left Side: Sports Photography & Brand Atmosphere */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #18A8E0 0%, #1769E8 100%)",
            color: "#FFFFFF",
            padding: "48px 36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          {/* Sports Photography Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle at 50% 30%, rgba(24, 168, 224, 0.72) 0%, rgba(23, 105, 232, 0.92) 85%), url('https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.35,
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />

          {/* Top badge */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#FFFFFF",
                marginBottom: 24,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8F542", boxShadow: "0 0 8px #C8F542" }} />
              BENGALURU SPORTS TECH
            </div>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.3rem)",
                fontWeight: 900,
                lineHeight: 1.18,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                margin: "0 0 14px",
              }}
            >
              Play Without Limits.
              <br />
              <span style={{ color: "#C8F542" }}>Every Single Game.</span>
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6, margin: 0 }}>
              Join Bengaluru&apos;s most active sports network with instant turf slot booking and community games.
            </p>
          </div>

          {/* Bottom stats / features */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF" }}>18+</div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.8)", fontWeight: 700 }}>Premier Venues</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#C8F542" }}>&lt; 15s</div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.8)", fontWeight: 700 }}>Instant Slot Lock</div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div
          style={{
            padding: "44px 38px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <BrandLockup markSize={40} compact />
          </div>

          <h1 style={{ color: "#172B4D", fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
            {title}
          </h1>
          <p style={{ color: "#718096", fontSize: 13.5, textAlign: "center", margin: "0 0 24px" }}>
            {subtitle}
          </p>

          {children}
        </div>
      </div>
    </div>
  );
}
