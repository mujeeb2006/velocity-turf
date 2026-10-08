import { useId } from "react";

export default function BrandLogo({
  width = 300,
  className,
  style,
  textColor = "#F4F4F2",
  taglineColor = "#C7C7C0",
}) {
  const id = useId();

  return (
    <svg
      className={className}
      width={width}
      height={Math.round(width * 280 / 820)}
      viewBox="0 0 820 280"
      role="img"
      aria-label="Velocity Turf — Online Turf Booking"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", height: "auto", maxWidth: "100%", ...style }}
    >
      <defs>
        <clipPath id={`${id}-mark`}>
          <rect x="10" y="26" width="220" height="220" rx="52" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-mark)`}>
        <rect x="10" y="26" width="220" height="220" rx="52" fill="#159B57" />
        <path d="M10 62h38v184H10z" fill="#1EA660" opacity="0.22" />
        <path d="M162 26h68v220h-68z" fill="#0F7F4B" opacity="0.18" />
        <path d="M46 52h18l55 130h-18L46 52Z" fill="#fff" />
        <path d="M108 52h18L69 182h-18l57-130Z" fill="#fff" />
        <path d="M64 60H77L96 120H83L64 60Z" fill="#D7FBE7" opacity="0.7" />
        <path d="M50 44H135" stroke="#D9FBE9" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <circle cx="170" cy="56" r="16" fill="#D4FF4F" />
        <circle cx="170" cy="56" r="5" fill="#116B3B" />
      </g>

      <text x="270" y="112" fill={textColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="800" letterSpacing="0.8">VELOCITY</text>
      <text x="270" y="194" fill="#169C5A" fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="800" letterSpacing="0.8">TURF</text>
      <text x="272" y="236" fill={taglineColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="700" letterSpacing="5.6">ONLINE TURF BOOKING</text>
    </svg>
  );
}
