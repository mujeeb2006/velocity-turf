import Link from "next/link";
import { PwaInstallButton } from "@/components/PwaInstallButton";

export default function InstallPlayerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A192F 0%, #1769E8 100%)",
        color: "#FFFFFF",
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "48px 16px 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#FFFFFF",
          borderRadius: 28,
          padding: "36px 28px",
          color: "#172B4D",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-block", position: "relative", marginBottom: 16 }}>
          <img
            src="/icons/player/icon.svg"
            alt="Velocity Turf Player"
            width={84}
            height={84}
            style={{ borderRadius: 22, boxShadow: "0 8px 24px rgba(23, 105, 232, 0.25)" }}
          />
        </div>

        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 6,
            background: "#1769E8",
            color: "#C8F542",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          PLAYER APP PWA
        </span>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#172B4D", margin: "0 0 8px" }}>
          Velocity Turf Player
        </h1>
        <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.5, margin: "0 0 24px" }}>
          Instant turf slot booking, community pickup games, player QR ticket wallet, and match discovery.
        </p>

        <div style={{ marginBottom: 24 }}>
          <PwaInstallButton role="player" variant="button" style={{ width: "100%" }} />
        </div>

        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            padding: "14px",
            fontSize: 12.5,
            color: "#64748B",
            textAlign: "left",
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          ⚡ <strong>Instant Access:</strong> Browse turfs as a guest or sign in to book slots and manage tickets.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderTop: "1px solid #E5EDF5", paddingTop: 16 }}>
          <Link href="/player" style={{ color: "#1769E8", fontWeight: 700, textDecoration: "none" }}>
            Open Player Portal →
          </Link>
          <Link href="/download" style={{ color: "#718096", textDecoration: "none" }}>
            All Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
