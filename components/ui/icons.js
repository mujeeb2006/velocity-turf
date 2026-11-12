"use client";

import React from "react";

// Standard base SVG wrapper for 24x24 outline icons
function Svg({
  size = 18,
  color = "currentColor",
  strokeWidth = 2,
  fill = "none",
  className,
  style,
  children,
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", ...style }}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------- Navigation & Interface
export function Home(props) {
  return (
    <Svg {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

export function Search(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

export function Calendar(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

export function Clock(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function MapPin(props) {
  return (
    <Svg {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function Users(props) {
  return (
    <Svg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function User(props) {
  return (
    <Svg {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function Trophy(props) {
  return (
    <Svg {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </Svg>
  );
}

export function Shield(props) {
  return (
    <Svg {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

export function ShieldCheck(props) {
  return (
    <Svg {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </Svg>
  );
}

export function Bell(props) {
  return (
    <Svg {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function Wallet(props) {
  return (
    <Svg {...props}>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </Svg>
  );
}

export function CreditCard(props) {
  return (
    <Svg {...props}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </Svg>
  );
}

export function IndianRupee(props) {
  return (
    <Svg {...props}>
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="M6 13l8.5 8" />
      <path d="M6 13h3a4 4 0 0 0 0-8" />
    </Svg>
  );
}

export function Check(props) {
  return (
    <Svg {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function CheckCircle(props) {
  return (
    <Svg {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

export function X(props) {
  return (
    <Svg {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

export function XCircle(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </Svg>
  );
}

export function AlertCircle(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
  );
}

export function AlertTriangle(props) {
  return (
    <Svg {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  );
}

export function Info(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
  );
}

export function HelpCircle(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  );
}

export function ChevronRight(props) {
  return (
    <Svg {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export function ChevronLeft(props) {
  return (
    <Svg {...props}>
      <polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function ChevronDown(props) {
  return (
    <Svg {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

export function ChevronUp(props) {
  return (
    <Svg {...props}>
      <polyline points="18 15 12 9 6 15" />
    </Svg>
  );
}

export function ArrowRight(props) {
  return (
    <Svg {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </Svg>
  );
}

export function ArrowLeft(props) {
  return (
    <Svg {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </Svg>
  );
}

export function ArrowUp(props) {
  return (
    <Svg {...props}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </Svg>
  );
}

export function ArrowDown(props) {
  return (
    <Svg {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </Svg>
  );
}

export function RefreshCw(props) {
  return (
    <Svg {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  );
}

export function Download(props) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  );
}

export function Upload(props) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
  );
}

export function Camera(props) {
  return (
    <Svg {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function Image(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </Svg>
  );
}

export function Lock(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function Unlock(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </Svg>
  );
}

export function Key(props) {
  return (
    <Svg {...props}>
      <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5L13 7l-1 1" />
      <path d="M15.5 10.5l-8.2 8.2a4.95 4.95 0 1 1-7-7l8.2-8.2" />
      <circle cx="7.5" cy="16.5" r="1.5" />
    </Svg>
  );
}

export function Mail(props) {
  return (
    <Svg {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </Svg>
  );
}

export function Phone(props) {
  return (
    <Svg {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

export function Star({ filled = false, color = "currentColor", ...props }) {
  return (
    <Svg color={color} fill={filled ? color : "none"} {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Svg>
  );
}

export function Plus(props) {
  return (
    <Svg {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function Minus(props) {
  return (
    <Svg {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function Filter(props) {
  return (
    <Svg {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </Svg>
  );
}

export function LogOut(props) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

export function Grid(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </Svg>
  );
}

export function List(props) {
  return (
    <Svg {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </Svg>
  );
}

export function Building(props) {
  return (
    <Svg {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <rect x="2" y="20" width="20" height="2" />
      <rect x="4" y="2" width="16" height="18" rx="1" />
    </Svg>
  );
}

export function TrendingUp(props) {
  return (
    <Svg {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </Svg>
  );
}

export function BarChart3(props) {
  return (
    <Svg {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  );
}

export function Activity(props) {
  return (
    <Svg {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  );
}

export function Ticket(props) {
  return (
    <Svg {...props}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2" />
    </Svg>
  );
}

export function Gift(props) {
  return (
    <Svg {...props}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Svg>
  );
}

export function Flame(props) {
  return (
    <Svg {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-1.63-1.07-2.73-2.06-3.76-.82-.85-1.44-1.76-1.44-2.74 0-1.8 1.4-3.5 3.5-4 0 2 1.5 3 2.5 4.5 1 1.5 1 3 1 4.5a6 6 0 1 1-12 0c0-3.3 2.7-6 5.5-8.5.5 1.5 1 3 1 4.5z" />
    </Svg>
  );
}

export function Zap(props) {
  return (
    <Svg {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  );
}

export function Sun(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Svg>
  );
}

export function CloudRain(props) {
  return (
    <Svg {...props}>
      <line x1="16" y1="13" x2="16" y2="21" />
      <line x1="8" y1="13" x2="8" y2="21" />
      <line x1="12" y1="15" x2="12" y2="23" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    </Svg>
  );
}

export function Copy(props) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

export function FileText(props) {
  return (
    <Svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Svg>
  );
}

export function MessageSquare(props) {
  return (
    <Svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function Settings(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function Wrench(props) {
  return (
    <Svg {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Svg>
  );
}

export function QrCode(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v3h-3" />
      <path d="M14 20h6" />
    </Svg>
  );
}

export function ExternalLink(props) {
  return (
    <Svg {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </Svg>
  );
}

export function Inbox(props) {
  return (
    <Svg {...props}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Sports Outline Icons
// Clean, professional sports geometry engineered for multi-sport booking

export function FootballIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 8 15 10.5 14 14 10 14 9 10.5" fill="currentColor" fillOpacity={0.15} />
      <line x1="12" y1="8" x2="12" y2="2" />
      <line x1="15" y1="10.5" x2="21" y2="8" />
      <line x1="14" y1="14" x2="18" y2="20" />
      <line x1="10" y1="14" x2="6" y2="20" />
      <line x1="9" y1="10.5" x2="3" y2="8" />
    </Svg>
  );
}

export function CricketIcon(props) {
  return (
    <Svg {...props}>
      {/* Cricket bat & ball */}
      <path d="M5 20l4-4 2 2-4 4a1.5 1.5 0 0 1-2.12-2.12z" />
      <path d="M9 16l8.5-8.5a2 2 0 0 1 2.83 0l.34.34a2 2 0 0 1 0 2.83L12 19" />
      <line x1="19" y1="5" x2="21" y2="3" />
      <circle cx="6" cy="7" r="3" />
      <path d="M4 6.5c1 0 3 1 3 2" />
    </Svg>
  );
}

export function BasketballIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
      <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
    </Svg>
  );
}

export function BadmintonIcon(props) {
  return (
    <Svg {...props}>
      {/* Shuttlecock cork base and feathered cone */}
      <path d="M8 15c0 2.21 1.79 4 4 4s4-1.79 4-4c0-.5-.1-1-.28-1.46L19 4H5l3.28 9.54c-.18.46-.28.96-.28 1.46z" />
      <line x1="12" y1="4" x2="12" y2="15" />
      <line x1="8.5" y1="4" x2="10" y2="15" />
      <line x1="15.5" y1="4" x2="14" y2="15" />
      <line x1="6.8" y1="9" x2="17.2" y2="9" />
    </Svg>
  );
}

export function TennisIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0 0 20" />
      <path d="M2 12a10 10 0 0 1 20 0" />
    </Svg>
  );
}

export function SwimmingIcon(props) {
  return (
    <Svg {...props}>
      <path d="M2 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
      <path d="M2 21c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
      <circle cx="17" cy="6" r="2" />
      <path d="M7 13l3.5-3.5L14 11l4-3" />
      <path d="M10.5 9.5L8 7" />
    </Svg>
  );
}

export function VolleyballIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 8.66 15" />
      <path d="M3.34 7A10 10 0 0 1 12 22" />
      <path d="M20.66 7A10 10 0 0 1 3.34 17" />
    </Svg>
  );
}

export function TableTennisIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="10" r="7" />
      <path d="M12 17v5" strokeWidth={2.5} />
      <circle cx="19" cy="6" r="2.5" />
    </Svg>
  );
}

export function StadiumIcon(props) {
  return (
    <Svg {...props}>
      {/* Architectural sports arena / turf pitch geometry */}
      <rect x="2" y="4" width="20" height="16" rx="4" ry="4" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M2 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3" />
      <path d="M22 9a3 3 0 0 0-3 3 3 3 0 0 0 3 3" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Unified Sport Icon Router
export function SportIcon({ sport, size = 18, color = "currentColor", className, style, ...props }) {
  const norm = String(sport || "").toLowerCase().trim();
  const iconProps = { size, color, className, style, ...props };

  if (norm.includes("foot") || norm.includes("soccer")) return <FootballIcon {...iconProps} />;
  if (norm.includes("crick")) return <CricketIcon {...iconProps} />;
  if (norm.includes("basket")) return <BasketballIcon {...iconProps} />;
  if (norm.includes("badm")) return <BadmintonIcon {...iconProps} />;
  if (norm.includes("tenn") && !norm.includes("table")) return <TennisIcon {...iconProps} />;
  if (norm.includes("table") || norm.includes("ping")) return <TableTennisIcon {...iconProps} />;
  if (norm.includes("swim")) return <SwimmingIcon {...iconProps} />;
  if (norm.includes("volley")) return <VolleyballIcon {...iconProps} />;
  return <StadiumIcon {...iconProps} />;
}

// ---------------------------------------------------------------- Unified Icon Lookup
const REGISTRY = {
  home: Home,
  search: Search,
  calendar: Calendar,
  clock: Clock,
  map: MapPin,
  mapPin: MapPin,
  location: MapPin,
  users: Users,
  user: User,
  trophy: Trophy,
  shield: Shield,
  shieldCheck: ShieldCheck,
  notification: Bell,
  bell: Bell,
  wallet: Wallet,
  creditCard: CreditCard,
  rupee: IndianRupee,
  indianRupee: IndianRupee,
  check: Check,
  checkCircle: CheckCircle,
  x: X,
  xCircle: XCircle,
  alert: AlertTriangle,
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  info: Info,
  help: HelpCircle,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  refresh: RefreshCw,
  refreshCw: RefreshCw,
  download: Download,
  upload: Upload,
  camera: Camera,
  image: Image,
  lock: Lock,
  unlock: Unlock,
  key: Key,
  mail: Mail,
  phone: Phone,
  star: Star,
  plus: Plus,
  minus: Minus,
  filter: Filter,
  logout: LogOut,
  logOut: LogOut,
  grid: Grid,
  list: List,
  building: Building,
  trending: TrendingUp,
  trendingUp: TrendingUp,
  chart: BarChart3,
  barChart: BarChart3,
  activity: Activity,
  ticket: Ticket,
  gift: Gift,
  flame: Flame,
  zap: Zap,
  lightning: Zap,
  sun: Sun,
  rain: CloudRain,
  cloudRain: CloudRain,
  copy: Copy,
  fileText: FileText,
  messageSquare: MessageSquare,
  settings: Settings,
  wrench: Wrench,
  qr: QrCode,
  qrCode: QrCode,
  externalLink: ExternalLink,
  inbox: Inbox,
  stadium: StadiumIcon,
  football: FootballIcon,
  cricket: CricketIcon,
  basketball: BasketballIcon,
  badminton: BadmintonIcon,
  tennis: TennisIcon,
  swimming: SwimmingIcon,
  volleyball: VolleyballIcon,
  tableTennis: TableTennisIcon,
};

// Map legacy emojis to professional Lucide-style icons
const EMOJI_MAP = {
  "✅": "checkCircle",
  "✓": "check",
  "✕": "x",
  "⚠️": "alertTriangle",
  "⚠": "alertTriangle",
  "🏟️": "stadium",
  "⚽": "football",
  "🏀": "basketball",
  "🏏": "cricket",
  "🏸": "badminton",
  "🏊": "swimming",
  "🏆": "trophy",
  "⚡": "zap",
  "👥": "users",
  "👤": "user",
  "📅": "calendar",
  "🕒": "clock",
  "⏰": "clock",
  "📍": "mapPin",
  "📧": "mail",
  "📞": "phone",
  "🔑": "key",
  "🔒": "lock",
  "🎟️": "ticket",
  "🎁": "gift",
  "🔥": "flame",
  "📷": "camera",
  "📭": "inbox",
  "🔎": "search",
  "🔍": "search",
  "💬": "messageSquare",
  "📜": "fileText",
  "🎮": "stadium",
  "★": "star",
};

export function Icon({ name, emoji, size = 18, color = "currentColor", filled = false, className, style, ...props }) {
  let Component = null;

  if (name && REGISTRY[name]) {
    Component = REGISTRY[name];
  } else if (emoji && EMOJI_MAP[emoji]) {
    Component = REGISTRY[EMOJI_MAP[emoji]];
  } else if (typeof name === "string" && EMOJI_MAP[name]) {
    Component = REGISTRY[EMOJI_MAP[name]];
  }

  if (Component) {
    return <Component size={size} color={color} filled={filled} className={className} style={style} {...props} />;
  }

  // Fallback to inbox if unknown
  return <Inbox size={size} color={color} className={className} style={style} {...props} />;
}

export default Icon;

