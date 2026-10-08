import { useId } from "react";

export default function BrandMark({ size = 34, className, style }) {
  const id = useId();

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <rect x="1" y="1" width="62" height="62" rx="18" fill="#159B57" />
      <defs>
        <clipPath id={`${id}-rounded-mark`}>
          <rect x="1" y="1" width="62" height="62" rx="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-rounded-mark)`}>
        <path d="M1 18h18v44H1z" fill="#1EA660" opacity="0.2" />
        <path d="M43 1h20v62H43z" fill="#0F7F4B" opacity="0.2" />
        <path d="M1 1h18v17H1zM19 1h24v17H19z" fill="#0F7F4B" opacity="0.26" />
        <path d="M10 17h12l10 27 10-27h12L37 52H27L10 17Z" fill="#fff" />
        <path d="M20 10h17M24 15h11" stroke="#D9FBE9" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        <circle cx="48" cy="11" r="6" fill="#D4FF4F" />
        <circle cx="48" cy="11" r="2" fill="#116B3B" />
      </g>
      <rect x="1.5" y="1.5" width="61" height="61" rx="17.5" stroke="#0D7042" strokeOpacity="0.16" />
    </svg>
  );
}
