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
      <rect x="1" y="1" width="62" height="62" rx="18" fill="#188D4A" />
      <path d="M1 19h18v44H1zM31 1h18v62H31z" fill="#28A95A" fillOpacity=".38" />
      <path d="M10 19h11l11 27 11-27h11L37 53H27L10 19Z" fill="#fff" />
      <path d="M29 9h12M32 13h10" stroke="#D8FFE8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="51" cy="10" r="5" fill="#D4FF4F" />
      <circle cx="51" cy="10" r="1.6" fill="#14683A" />
    </svg>
  );
}
