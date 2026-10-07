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
      height={Math.round(width * 280 / 797)}
      viewBox="0 0 797 280"
      role="img"
      aria-label="Velocity Turf — Online Turf Booking"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", height: "auto", maxWidth: "100%", ...style }}
    >
      <defs>
        <clipPath id={`${id}-mark`}>
          <rect x="64" y="19" width="225" height="226" rx="46" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-mark)`}>
        <rect x="64" y="19" width="225" height="226" fill="#168F4D" />
        <path d="M64 19h56v226H64z" fill="#11783F" />
        <path d="M120 19h56v226h-56z" fill="#20A052" />
        <path d="M176 19h56v226h-56z" fill="#168543" />
        <path d="M97 84h42l37 102 37-102h43l-62 138h-35L97 84Z" fill="#fff" />
        <path d="M161 44h46M177 59h35" stroke="#D9F3DF" strokeWidth="5" strokeLinecap="round" />
        <circle cx="239" cy="51" r="18" fill="#D4FF4F" />
        <circle cx="239" cy="51" r="6" fill="#168543" />
      </g>
      <text x="330" y="121" fill={textColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="68" fontWeight="400" letterSpacing="1">VELOCITY</text>
      <text x="330" y="197" fill="#159E50" fontFamily="Arial, Helvetica, sans-serif" fontSize="68" fontWeight="400" letterSpacing="10">TURF</text>
      <text x="332" y="237" fill={taglineColor} fontFamily="Arial, Helvetica, sans-serif" fontSize="17" fontWeight="700" letterSpacing="5.2">ONLINE TURF BOOKING</text>
    </svg>
  );
}
