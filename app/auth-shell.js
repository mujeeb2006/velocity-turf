export default function AuthShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#050A14",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "#0EA5E9",
          filter: "blur(120px)",
          opacity: 0.08,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "#22C55E",
          filter: "blur(120px)",
          opacity: 0.07,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: "rgba(13,21,38,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(14,165,233,0.15)",
          borderRadius: 24,
          padding: "36px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0EA5E9, #22C55E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ⚡
          </div>
          <span style={{ fontWeight: 900, fontSize: 19, fontFamily: "'Exo 2', sans-serif" }}>
            <span style={{ color: "#fff" }}>VELOCITY</span> <span style={{ color: "#0EA5E9" }}>TURF</span>
          </span>
        </div>

        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>
          {title}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13.5, textAlign: "center", marginBottom: 26 }}>
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}
