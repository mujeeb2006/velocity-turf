import BrandMark from "@/components/brand-mark";

export default function BrandLockup({ markSize = 46, compact = false, dark = false }) {
  const fontSize = compact ? 12 : 15;
  const taglineSize = compact ? 6.5 : 8;
  const textColor = dark ? "#F4F4F2" : "#172126";
  const taglineColor = dark ? "#B8C5BF" : "#58645F";

  return (
    <div
      role="img"
      aria-label="Velocity Turf — Online Turf Booking"
      style={{ display: "flex", alignItems: "center", gap: compact ? 7 : 10, flexShrink: 0 }}
    >
      <BrandMark size={markSize} />
      <span style={{ display: "grid", gap: compact ? 1 : 2, lineHeight: 0.92 }}>
        <span style={{
          color: textColor,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize,
          fontWeight: 800,
          letterSpacing: compact ? 0.35 : 0.65,
        }}>VELOCITY</span>
        <span style={{
          color: "#20B16C",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize,
          fontWeight: 800,
          letterSpacing: compact ? 0.35 : 0.65,
        }}>TURF</span>
        <span style={{
          color: taglineColor,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: taglineSize,
          fontWeight: 700,
          letterSpacing: compact ? 0.75 : 1.6,
          lineHeight: 1,
          whiteSpace: "nowrap",
          marginTop: compact ? 1 : 2,
        }}>ONLINE TURF BOOKING</span>
      </span>
    </div>
  );
}
