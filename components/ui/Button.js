import { buttonStyle } from "@/lib/design-tokens";

export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  busy = false,
  style = {},
  className = "",
  type = "button",
  children,
  ...props
}) {
  const dynamicStyle = {
    ...buttonStyle(variant, size, disabled || busy),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy}
      style={dynamicStyle}
      className={`vt-btn ${className}`}
      {...props}
    >
      {busy ? (
        <>
          <span
            style={{
              width: 14,
              height: 14,
              border: "2px solid currentColor",
              borderRightColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <span>Processing…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}