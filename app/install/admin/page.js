import Link from "next/link";
import { PwaInstallButton } from "@/components/PwaInstallButton";

export default function InstallAdminPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0F172A 0%, #172B4D 100%)",
        color: "#FFFFFF",
        fontFamily: "var(--font-body)",
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
            src="/icons/admin/icon.svg"
            alt="Velocity Turf Admin"
            width={84}
            height={84}
            style={{ borderRadius: 22, boxShadow: "0 8px 24px rgba(23, 43, 77, 0.25)" }}
          />
        </div>

        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 6,
            background: "#172B4D",
            color: "#F59E0B",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          ADMINISTRATOR PWA
        </span>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#172B4D", margin: "0 0 8px" }}>
          Velocity Turf Admin
        </h1>
        <p style={{ fontSize: 14, color: "#718096", lineHeight: 1.5, margin: "0 0 24px" }}>
          Platform governance, venue approvals, user role administration, financial settlement, and audit logs.
        </p>

        <div style={{ marginBottom: 24 }}>
          <PwaInstallButton role="admin" variant="button" style={{ width: "100%" }} />
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
          🔒 <strong>Role Guard:</strong> Only authenticated users with the <strong>Admin</strong> role can sign in and access this portal.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderTop: "1px solid #E5EDF5", paddingTop: 16 }}>
          <Link href="/admin" style={{ color: "#1769E8", fontWeight: 700, textDecoration: "none" }}>
            Open Admin Web Portal →
          </Link>
          <Link href="/download" style={{ color: "#718096", textDecoration: "none" }}>
            All Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
