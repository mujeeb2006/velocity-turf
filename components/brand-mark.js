export default function BrandMark({ size = 34, className, style }) {
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
      <path d="M1 18h18v44H1z" fill="#1EA660" opacity="0.22" />
      <path d="M42 1h21v62H42z" fill="#0F7F4B" opacity="0.18" />
      <path d="M13 15h7l11 35h-7l-11-35Z" fill="#fff" />
      <path d="M36 15h7L32 50h-7l11-35Z" fill="#fff" />
      <path d="M19 16h6l8 26h-6l-8-26Z" fill="#D7FBE7" opacity="0.7" />
      <path d="M15.5 11H39.5" stroke="#D9FBE9" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <circle cx="49" cy="10" r="5" fill="#D4FF4F" />
      <circle cx="49" cy="10" r="1.6" fill="#116B3B" />
    </svg>
  );
}
