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
        <path d="M10 26h38v36H10zM48 26h114v36H48z" fill="#0F7F4B" opacity="0.2" />
        <path d="M38 80h42l30 82 30-82h42l-52 126H90L38 80Z" fill="#fff" />
        <path d="M68 60h56M81 75h39" stroke="#D9FBE9" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
        <circle cx="168" cy="58" r="17" fill="#D4FF4F" />
        <circle cx="168" cy="58" r="5.5" fill="#116B3B" />
      </g>

      <text x="270" y="112" fill={textColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="700" letterSpacing="1.2">VELOCITY</text>
      <text x="270" y="194" fill="#169C5A" fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="700" letterSpacing="1.2">TURF</text>
      <text x="274" y="236" fill={taglineColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="700" letterSpacing="5.1">ONLINE TURF BOOKING</text>
    </svg>
  );
}
