"use client";

// Shared building blocks for the Owner and Admin dashboards. Hover/focus
// styling lives in globals.css (.vt-*) so components stay free of mouse
// handlers, and every control is keyboard reachable.

import { useEffect, useRef, useState } from "react";
import { COLORS as V, FONT_BODY, FONT_DATA, FONT_DISPLAY, panel } from "@/lib/design-tokens";
import { formatDelta, toCSV } from "@/lib/dashboard/format";
import BrandMark from "@/components/brand-mark";

export const font = FONT_BODY;
export const mono = FONT_DATA;
export const display = FONT_DISPLAY;

// ---------------------------------------------------------------- icons
const ICONS = {
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  building: <path d="M3 21h18M6 21V7a1 1 0 011-1h10a1 1 0 011 1v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />,
  users: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  rupee: <path d="M7 4h10M7 8h10M7 4s1 5-3 5m3 4l7 7M7 12h6a3 3 0 000-6" />,
  alert: <><path d="M12 9v4m0 4h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></>,
  check: <path d="M5 13l4 4L19 7" />,
  x: <path d="M6 18L18 6M6 6l12 12" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  star: <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
  map: <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
  logout: <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
  shield: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
  notification: <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  wallet: <path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a1 1 0 100 2 1 1 0 000-2z" />,
  plus: <path d="M12 4v16m-8-8h16" />,
  trending: <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  download: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  refresh: <><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
  arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
};

export function Icon({ name, size = 18, color = "currentColor", filled = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {ICONS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------- basics
export function Pill({ children, color = V.chalkDim }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {children}
    </span>
  );
}

export const STATUS_COLORS = {
  live: V.confirmed,
  confirmed: V.confirmed,
  completed: V.info,
  resolved: V.confirmed,
  paid: V.confirmed,
  pending: V.pending,
  open: V.pending,
  rejected: V.danger,
  declined: V.danger,
  cancelled: V.chalkFaint,
};

export function StatusPill({ status }) {
  return <Pill color={STATUS_COLORS[status] || V.chalkDim}>{status || "—"}</Pill>;
}

// variants: primary | secondary | danger | ghost    sizes: sm | md
export function Btn({ children, variant = "secondary", size = "md", busy = false, disabled = false, icon, style, ...rest }) {
  const sizes = { sm: { padding: "7px 12px", fontSize: 12.5 }, md: { padding: "10px 16px", fontSize: 13 } };
  const variants = {
    primary: { background: V.flood, color: "#fff", border: "1px solid transparent" },
    secondary: { background: V.pitchCard, color: V.chalk, border: `1px solid ${V.lineStrong}` },
    danger: { background: "rgba(228,93,93,0.08)", color: V.danger, border: "1px solid rgba(228,93,93,0.35)" },
    ghost: { background: "transparent", color: V.chalkDim, border: "1px solid transparent" },
  };
  const inactive = disabled || busy;
  return (
    <button
      type="button"
      className="vt-btn"
      disabled={inactive}
      aria-busy={busy || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        fontWeight: 700,
        fontFamily: font,
        cursor: inactive ? (busy ? "wait" : "not-allowed") : "pointer",
        opacity: disabled ? 0.5 : busy ? 0.75 : 1,
        whiteSpace: "nowrap",
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 13 : 14} /> : null}
      {children}
    </button>
  );
}

export function StatCard({ label, value, icon, color, sub, delta }) {
  const text = formatDelta(delta);
  const up = delta > 0;
  return (
    <div className="vt-stat" style={{ ...panel(), borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ background: color + "18", borderRadius: 10, padding: 8, display: "inline-flex" }}>
          <Icon name={icon} size={17} color={color} />
        </div>
        {text && (
          <span
            title="Compared with the same days last month"
            style={{
              display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 800, fontFamily: font,
              color: delta === 0 ? V.chalkFaint : up ? V.confirmed : V.danger,
            }}
          >
            {delta !== 0 && <Icon name={up ? "arrowUp" : "arrowDown"} size={11} />}
            {text}
          </span>
        )}
      </div>
      <div style={{ color: V.chalk, fontWeight: 800, fontSize: 24, fontFamily: mono, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ color: V.chalkDim, fontSize: 12.5, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export function StatGrid({ children, min = 190 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14, marginBottom: 28 }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "0 0 12px", flexWrap: "wrap" }}>
      <h3 style={{ color: V.chalkDim, fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, margin: 0, fontFamily: font }}>
        {children}
      </h3>
      {action}
    </div>
  );
}

export function Card({ children, style, pad = 20, className }) {
  return <div className={className} style={{ ...panel(), borderRadius: 16, padding: pad, ...style }}>{children}</div>;
}

export function EmptyBlock({ icon = "inbox", emoji, title, subtitle, action }) {
  return (
    <div style={{ ...panel(), borderRadius: 16, padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: V.floodDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 8 }}>
        {emoji || <Icon name={icon === "inbox" ? "list" : icon} size={22} color={V.flood} />}
      </div>
      <div style={{ color: V.chalk, fontWeight: 800, fontSize: 15.5, fontFamily: font }}>{title}</div>
      {subtitle && <div style={{ color: V.chalkDim, fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "rgba(228,93,93,0.08)", border: "1px solid rgba(228,93,93,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: V.danger, fontSize: 13, fontWeight: 600 }}>
      <span>{message}</span>
      {onRetry && <Btn size="sm" variant="danger" onClick={onRetry}>Retry</Btn>}
    </div>
  );
}

export function AttentionItem({ tone = V.pending, icon, title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: tone + "10", border: `1px solid ${tone}40`, borderRadius: 14, padding: "12px 16px" }}>
      <div style={{ background: tone + "20", borderRadius: 10, padding: 8, display: "inline-flex" }}>
        <Icon name={icon} size={16} color={tone} />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13.5 }}>{title}</div>
        {subtitle && <div style={{ color: V.chalkDim, fontSize: 12.5, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- inputs
export function SearchInput({ value, onChange, placeholder = "Search…", label = "Search" }) {
  return (
    <label className="vt-input-wrap" style={{ display: "flex", alignItems: "center", gap: 8, background: V.pitchCard, border: `1px solid ${V.lineStrong}`, borderRadius: 10, padding: "8px 12px", minWidth: 200 }}>
      <Icon name="search" size={14} color={V.chalkFaint} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={{ background: "none", border: "none", outline: "none", color: V.chalk, fontSize: 13, fontFamily: font, width: "100%" }}
      />
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} style={{ display: "inline-flex", gap: 4, background: V.pitchCardRaised, border: `1px solid ${V.line}`, borderRadius: 12, padding: 3, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            className="vt-seg"
            onClick={() => onChange(o.id)}
            style={{
              border: "1px solid " + (active ? V.lineStrong : "transparent"),
              background: active ? V.pitchCard : "transparent",
              color: active ? V.chalk : V.chalkDim,
              boxShadow: active ? "0 1px 2px rgba(17,24,39,0.06)" : "none",
              borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, fontFamily: font, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {o.label}
            {o.count !== undefined && (
              <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, color: active ? V.flood : V.chalkFaint }}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>{children}</div>;
}

export const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10, background: V.pitchCardRaised,
  border: `1px solid ${V.line}`, color: V.chalk, fontSize: 13.5, fontFamily: font, outline: "none",
};
export const labelStyle = { color: V.chalkDim, fontSize: 12.5, fontWeight: 700, marginBottom: 6, display: "block", fontFamily: font };

// ---------------------------------------------------------------- table
// columns: [{ key, label, width ("1fr"), align, sortable, render(row) }]
export function DataTable({ columns, rows, rowKey = "id", sort, onSort, onRowClick, minWidth = 640, empty }) {
  const template = columns.map((c) => c.width || "1fr").join(" ");
  const cell = (c) => ({ textAlign: c.align || "left", justifyContent: c.align === "right" ? "flex-end" : "flex-start", minWidth: 0 });
  return (
    <div style={{ ...panel(), borderRadius: 16, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth }} role="table">
          <div role="row" style={{ display: "grid", gridTemplateColumns: template, gap: 12, padding: "12px 20px", borderBottom: `1px solid ${V.line}`, background: V.pitchCardRaised }}>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const base = { color: active ? V.chalk : V.chalkFaint, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: font };
              return c.sortable ? (
                <button key={c.key} type="button" role="columnheader" className="vt-th" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} onClick={() => onSort?.(c.key)} style={{ ...base, ...cell(c), display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                  {c.label}
                  {active && <Icon name={sort.dir === "asc" ? "arrowUp" : "arrowDown"} size={11} />}
                </button>
              ) : (
                <span key={c.key} role="columnheader" style={{ ...base, ...cell(c), display: "flex" }}>{c.label}</span>
              );
            })}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: V.chalkFaint, fontSize: 13 }}>{empty || "Nothing to show."}</div>
          ) : (
            rows.map((row, i) => (
              <div
                key={row[rowKey] ?? i}
                role="row"
                className={onRowClick ? "vt-row vt-row-click" : "vt-row"}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); } } : undefined}
                style={{ display: "grid", gridTemplateColumns: template, gap: 12, alignItems: "center", padding: "14px 20px", borderBottom: i < rows.length - 1 ? `1px solid ${V.line}` : "none" }}
              >
                {columns.map((c) => (
                  <div key={c.key} role="cell" style={{ ...cell(c), display: "flex", alignItems: "center", fontSize: 13, color: V.chalkDim, overflow: "hidden" }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- charts
// Bar chart built from divs: scales with its container, no chart library.
export function BarChart({ data, height = 170, color = V.flood, formatValue = (v) => v, ariaLabel, labelEvery }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const every = labelEvery || Math.max(1, Math.ceil(data.length / 8));
  const shown = active !== null ? data[active] : null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div role="img" aria-label={ariaLabel}>
      <div style={{ minHeight: 40, marginBottom: 10 }}>
        {shown ? (
          <>
            <div style={{ color: V.chalk, fontFamily: mono, fontWeight: 800, fontSize: 20 }}>{formatValue(shown.value)}</div>
            <div style={{ color: V.chalkDim, fontSize: 12 }}>{shown.tooltip || shown.label}</div>
          </>
        ) : (
          <>
            <div style={{ color: V.chalk, fontFamily: mono, fontWeight: 800, fontSize: 20 }}>{formatValue(total)}</div>
            <div style={{ color: V.chalkDim, fontSize: 12 }}>Total for the period · hover a bar for details</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: data.length > 40 ? 1 : 3, height, borderBottom: `1px solid ${V.line}` }} onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => (
          <div
            key={d.key ?? i}
            tabIndex={0}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${d.tooltip || d.label}: ${formatValue(d.value)}`}
            style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", minWidth: 0, outline: "none" }}
          >
            <div
              className="vt-bar"
              style={{
                width: "100%",
                height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : 2,
                background: d.value ? (active === i ? V.chalk : color) : V.line,
                opacity: active === null || active === i ? 1 : 0.55,
                borderRadius: "3px 3px 0 0",
                transition: "opacity 120ms, background 120ms",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: data.length > 40 ? 1 : 3, marginTop: 6 }} aria-hidden="true">
        {data.map((d, i) => (
          <div key={d.key ?? i} style={{ flex: 1, minWidth: 0, fontSize: 10, color: V.chalkFaint, textAlign: "center", whiteSpace: "nowrap", overflow: "visible", height: 14 }}>
            {i % every === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// Ranked horizontal bars: [{ key, label, value, sub }]
export function BarList({ items, color = V.flood, formatValue = (v) => v, empty = "No data yet." }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div style={{ color: V.chalkFaint, fontSize: 13, padding: "8px 0" }}>{empty}</div>;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => (
        <div key={item.key}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: V.chalk, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label}
              {item.sub && <span style={{ color: V.chalkFaint, fontWeight: 500 }}> · {item.sub}</span>}
            </span>
            <span style={{ color: V.chalk, fontFamily: mono, fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{formatValue(item.value)}</span>
          </div>
          <div style={{ height: 6, background: V.line, borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${Math.round((item.value / max) * 100)}%`, background: color, borderRadius: 3, minWidth: item.value ? 4 : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, size = 13 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} role="img" aria-label={`${value} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <Icon key={i} name="star" size={size} filled={i < value} color={i < value ? V.pending : V.lineStrong} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- modal
export function Modal({ title, subtitle, onClose, children, footer, maxWidth = 520 }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="vt-modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(16,24,20,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ...panel(), borderRadius: 18, width: "100%", maxWidth, maxHeight: "88vh", display: "flex", flexDirection: "column", outline: "none", boxShadow: "0 24px 70px rgba(16,24,20,0.25)" }}
      >
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${V.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2 style={{ color: V.chalk, margin: 0, fontSize: 19, fontFamily: font, fontWeight: 800 }}>{title}</h2>
            {subtitle && <p style={{ color: V.chalkDim, margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>}
          </div>
          <button type="button" className="vt-btn" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="x" size={15} />
          </button>
        </div>
        <div style={{ padding: 22, overflowY: "auto" }}>{children}</div>
        {footer && <div style={{ padding: "14px 22px", borderTop: `1px solid ${V.line}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", tone = "danger", busy, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      maxWidth={440}
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant={tone === "danger" ? "danger" : "primary"} busy={busy} onClick={onConfirm}>{confirmLabel}</Btn>
        </>
      }
    >
      <p style={{ color: V.chalkDim, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{message}</p>
    </Modal>
  );
}

export function DetailRows({ rows }) {
  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 18px", fontSize: 13.5 }}>
      {rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== "").map((r) => (
        <div key={r.label} style={{ display: "contents" }}>
          <dt style={{ color: V.chalkFaint, fontWeight: 600 }}>{r.label}</dt>
          <dd style={{ margin: 0, color: V.chalk, fontWeight: 600, wordBreak: "break-word" }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- layout
export function TopBar({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ color: V.chalk, fontFamily: font, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>{title}</h1>
        {sub && <p style={{ color: V.chalkDim, margin: "4px 0 0", fontSize: 13.5 }}>{sub}</p>}
      </div>
      {action && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

export function SideNav({ items, active, onSelect, roleLabel, roleIcon = "shield", roleColor, name, email, onSignOut, onSettings, unreadCount, onBell, bellRef }) {
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  return (
    <nav aria-label="Dashboard" className="vt-dashboard-sidebar" style={{ width: 240, flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0, alignSelf: "flex-start", background: V.pitchCard, borderRight: `1px solid ${V.line}`, padding: "22px 14px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={38} />
          <span style={{ fontWeight: 900, fontSize: 15, fontFamily: font, letterSpacing: -0.2, whiteSpace: "nowrap" }}>
            <span style={{ color: V.chalk }}>VELOCITY</span> <span style={{ color: V.flood }}>TURF</span>
          </span>
        </div>
        <button ref={bellRef} type="button" className="vt-btn" onClick={onBell} aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <Icon name="notification" size={15} />
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: V.flood, color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="vt-dashboard-identity" style={{ display: "flex", alignItems: "center", gap: 10, background: roleColor + "10", border: `1px solid ${roleColor}30`, borderRadius: 12, padding: "10px 12px", marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: roleColor + "22", color: roleColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: roleColor, fontSize: 10.5, fontWeight: 800, fontFamily: mono, letterSpacing: 0.4 }}>
            <Icon name={roleIcon} size={11} color={roleColor} />
            {roleLabel}
          </div>
          <div style={{ color: V.chalk, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || email}</div>
          {name && email && <div style={{ color: V.chalkFaint, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>}
        </div>
      </div>

      <div className="vt-dashboard-links" role="tablist" aria-orientation="vertical" style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {items.map((it) => {
          const on = active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={on}
              className="vt-nav-item"
              onClick={() => onSelect(it.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11,
                background: on ? V.floodDim : "transparent",
                border: `1px solid ${on ? V.flood + "55" : "transparent"}`,
                color: on ? V.chalk : V.chalkDim, cursor: "pointer", fontSize: 13.5, fontWeight: on ? 800 : 600, fontFamily: font, textAlign: "left",
              }}
            >
              <Icon name={it.icon} size={16} color={on ? V.flood : V.chalkFaint} />
              {it.label}
              {it.badge ? <span style={{ marginLeft: "auto", background: V.pending, color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 10 }}>{it.badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="vt-dashboard-footer" style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <Btn onClick={onSettings} style={{ justifyContent: "flex-start", fontWeight: 600, color: V.chalkDim }}>Account settings</Btn>
        <Btn onClick={onSignOut} icon="logout" style={{ justifyContent: "flex-start", fontWeight: 600, color: V.chalkDim }}>Sign out</Btn>
      </div>
    </nav>
  );
}

export function NotificationsPanel({ open, onClose, notifications, unreadCount, lastSyncedAt, onMarkAll, onMarkOne, emptyText }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 899 }} />
      <div className="vt-notif-panel" role="dialog" aria-label="Notifications" style={{ position: "fixed", zIndex: 1000, width: "min(340px, calc(100vw - 32px))", maxHeight: 440, overflowY: "auto", background: V.pitchCard, border: `1px solid ${V.line}`, borderRadius: 14, boxShadow: "0 20px 50px rgba(16,24,20,0.18)" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, position: "sticky", top: 0, background: V.pitchCard }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: V.chalk }}>Notifications</div>
            <div style={{ color: V.chalkFaint, fontSize: 11, marginTop: 2 }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              {lastSyncedAt ? ` · Live ${lastSyncedAt}` : " · Syncing…"}
            </div>
          </div>
          {unreadCount > 0 && <Btn size="sm" onClick={onMarkAll}>Mark all read</Btn>}
        </div>
        {notifications.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: V.chalkFaint, fontSize: 13 }}>{emptyText}</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className="vt-row vt-row-click"
              onClick={() => !n.read && onMarkOne(n.id)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: 0, borderBottom: `1px solid ${V.line}`, background: n.read ? "transparent" : V.floodDim, cursor: n.read ? "default" : "pointer", fontFamily: font }}
            >
              <div style={{ color: V.chalk, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{n.title}</div>
              {n.body && <div style={{ color: V.chalkDim, fontSize: 12.5, lineHeight: 1.45 }}>{n.body}</div>}
              <div style={{ color: V.chalkFaint, fontSize: 10.5, marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- hooks
// Notifications for the signed-in user, with live updates. The open flag is
// kept in a ref so the realtime handler never reads stale state.
export function useNotifications(supabase, userId, showToast) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpenState] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const openRef = useRef(false);

  const setOpen = (value) => {
    const next = typeof value === "function" ? value(openRef.current) : value;
    openRef.current = next;
    setOpenState(next);
  };

  const stamp = () => setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));

  async function refresh() {
    if (!userId) return;
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (!error) {
      setNotifications(data || []);
      stamp();
    }
  }

  async function markRead(ids) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
    if (error) {
      showToast("Couldn't mark notifications as read.", { type: "error" });
      return;
    }
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    stamp();
  }

  useEffect(() => {
    if (!userId) return undefined;
    refresh();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        refresh();
        if (payload?.new?.title && !openRef.current) showToast(payload.new.title, { type: "info" });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  return {
    notifications, unreadCount, lastSyncedAt, open, setOpen,
    markAllRead: () => markRead(notifications.filter((n) => !n.read).map((n) => n.id)),
    markOne: (id) => markRead([id]),
  };
}

// Calls `fn` at most once per `wait` ms burst; used so a flurry of realtime
// events triggers a single refetch.
export function useDebounced(fn, wait = 400) {
  const fnRef = useRef(fn);
  const timer = useRef(null);
  fnRef.current = fn;
  useEffect(() => () => clearTimeout(timer.current), []);
  return () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(), wait);
  };
}

export function downloadCSV(filename, rows, columns) {
  const blob = new Blob(["\uFEFF" + toCSV(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
