"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { validateBookingRequest } from "@/lib/booking/validation";
import { canSubmitBooking } from "@/lib/booking/policy";
import { dateKey, addDays } from "@/lib/dashboard/analytics";
import { formatBookingDate, formatINR, formatNotificationBody, formatNotificationTitle, formatTime12, relativeTime } from "@/lib/dashboard/format";
import { useToast } from "@/components/ui/toast";
import { SkeletonGrid, SkeletonCard, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { RankBadge } from "@/components/ui/rank-badge";
import { COLORS as V, NAV_ACCENTS, FONT_DISPLAY, FONT_BODY, FONT_DATA, panel, floodGlow, buttonStyle, statusBadge } from "@/lib/design-tokens";
import StadiumScene from "@/components/StadiumScene";
import BrandLockup from "@/components/brand-lockup";
import { SPORT_OPTIONS } from "@/lib/sports";
import { getTurfImages } from "@/lib/turf-images";
import {
  clearStoredBookingIntent,
  decodeBookingIntent,
  encodeBookingIntent,
  getStoredBookingIntent,
  saveBookingIntent,
} from "@/lib/booking/intent";
import {
  clearStoredMatchIntent,
  decodeMatchIntent,
  encodeMatchIntent,
  getStoredMatchIntent,
  saveMatchIntent,
} from "@/lib/match/intent";
import { extractErrorMessage } from "@/lib/api-response";
import { SmartNotificationCenter } from "@/components/dashboard/SmartNotificationCenter";
import {
  getTurfCurrentTime,
  isSessionStartedOrEnded,
  isSessionEnded,
  annotateSlotsWithLiveTime,
} from "@/lib/booking/session-time";
import { TeamsSection } from "@/components/dashboard/TeamsSection";
import { TournamentsSection } from "@/components/dashboard/TournamentsSection";
import { PackagesSection } from "@/components/dashboard/PackagesSection";
import { DemoNameWithBadge } from "@/components/ui/demo-badge";

function todayStr() {
  return dateKey();
}

function sportIcon(sport) {
  return {
    Football: "⚽",
    Basketball: "🏀",
    Cricket: "🏏",
    Badminton: "🏸",
    Swimming: "🏊",
  }[sport] || "🏟️";
}

function formatTurfLocation(address, city) {
  const street = String(address || "").trim();
  const town = String(city || "").trim();
  if (!street) return town;
  if (!town || street.toLowerCase().endsWith(town.toLowerCase())) return street;
  return `${street}, ${town}`;
}

function isUpcomingBooking(booking, now = new Date()) {
  const today = dateKey(now);
  if (booking.bookingDate > today) return true;
  if (booking.bookingDate < today) return false;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return booking.time >= currentTime;
}

function isPlayedBooking(booking, now = new Date()) {
  return ["confirmed", "completed"].includes(booking.status) && !isUpcomingBooking(booking, now);
}

// Rounds a Supabase "HH:MM:SS" time string down to "HH:MM" for display.
function fmtTime(t) {
  return t ? t.slice(0, 5) : t;
}

// Simple demand-based pricing: peak price once more than 70% of today's
// slots are taken, base price otherwise.
function calcPrice(turf, occupancy) {
  return occupancy > 70 ? Number(turf.peak_price) : Number(turf.base_price);
}


// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 20, color = "currentColor", filled = false }) => {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    search: <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    trophy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    lightning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    map: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
    clock: <><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" /></>,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    trending: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    sun: <><circle cx="12" cy="12" r="5" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
    rain: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19v2m4-2v2m4-2v2M3 15a7 7 0 0114 0H3z" />,
    qr: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4H6a2 2 0 00-2 2v6m8-8h6a2 2 0 012 2v6m-8-8v8m0 0H6m6 0h6m-6 0v8m-6-8H4m2 0v6a2 2 0 002 2h4M16 12h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4a2 2 0 012-2z" />,
    notification: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
    filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {icons[name]}
    </svg>
  );
};

// ============================================================
// SLOT GRID COMPONENT
// ============================================================
function SlotGrid({ slots = [], onSelect, selected, loading = false, price }) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10, padding: "8px 0" }}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} height={56} radius={12} />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "28px 16px", background: V.pitchCardRaised, borderRadius: 12, border: `1px solid ${V.line}` }}>
        <p style={{ color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY, margin: 0 }}>
          No time slots are listed for this date. Please pick another day.
        </p>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Available time slots"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10 }}
    >
      {slots.map((slot, i) => {
        const isSelected = selected === i;
        const isClosed = slot.status === "closed" || slot.status === "completed" || slot.isClosed || slot.isExpired;
        const isAvailable = slot.status === "available" && !isClosed;
        const isLocked = slot.status === "locked" && !isClosed;
        const isBooked = (slot.status === "booked" || slot.status === "confirmed") && !isClosed;

        const bg = isSelected
          ? V.floodButton || V.flood
          : isAvailable
          ? "rgba(27, 158, 102, 0.08)"
          : isLocked
          ? "rgba(180, 83, 9, 0.08)"
          : isClosed
          ? "rgba(107, 114, 128, 0.05)"
          : "rgba(17, 24, 39, 0.04)";

        const borderColor = isSelected
          ? V.floodButton || V.flood
          : isAvailable
          ? "rgba(27, 158, 102, 0.35)"
          : isLocked
          ? "rgba(180, 83, 9, 0.35)"
          : isClosed
          ? "rgba(107, 114, 128, 0.22)"
          : V.line;

        const textColor = isSelected
          ? "#ffffff"
          : isAvailable
          ? V.chalk
          : isLocked
          ? V.pending
          : V.chalkFaint;

        const statusLabel = isSelected
          ? "Selected"
          : isClosed
          ? "Closed"
          : isAvailable
          ? "Open"
          : isLocked
          ? "Held"
          : "Taken";

        const ariaStatus = isSelected
          ? "selected slot"
          : isClosed
          ? "This session has ended, unavailable"
          : isAvailable
          ? `available slot, ₹${price} per hour`
          : isLocked
          ? "temporarily locked slot"
          : "booked slot, unavailable";

        return (
          <button
            key={slot.raw_time || i}
            type="button"
            onClick={() => isAvailable && onSelect(i)}
            disabled={!isAvailable}
            aria-pressed={isSelected}
            aria-label={`${slot.time}, ${ariaStatus}`}
            title={isClosed ? "This session has ended." : undefined}
            style={{
              padding: "10px 6px",
              minHeight: 56,
              borderRadius: 12,
              border: `1.5px solid ${borderColor}`,
              background: bg,
              color: textColor,
              cursor: isAvailable ? "pointer" : "not-allowed",
              opacity: isClosed ? 0.6 : 1,
              transition: "transform 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s",
              fontFamily: FONT_BODY,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              boxShadow: isSelected ? "0 4px 14px rgba(21, 128, 81, 0.28)" : "none",
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 800, fontFamily: FONT_DATA }}>
              {slot.time}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.2,
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                opacity: isSelected ? 0.95 : 0.85,
              }}
            >
              {isSelected && <span aria-hidden="true">✓</span>}
              {isLocked && <span aria-hidden="true">🔒</span>}
              {statusLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BookingQrCode({ bookingId, size = 140 }) {
  return (
    <QRCodeSVG
      value={`velocity-turf:booking:${bookingId}`}
      size={size}
      level="H"
      includeMargin
      title={`QR ticket for booking ${bookingId}`}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}

// ============================================================
// TURF CARD
// ============================================================
function TurfCard({ turf, onBook, onMatch, index = 0 }) {
  const price = calcPrice(turf, turf.occupancy);
  const isDynamic = turf.occupancy > 70;
  const { cover: coverImage, gallery } = getTurfImages(turf);
  const hasAvailability = turf.slots.some(slot => slot.status === "available");

  return (
    <article className="vt-venue-card" style={{ ...panel(), "--venue-index": index }}>
      <div className="vt-venue-cover">
        <img src={coverImage} alt={`${turf.sports[0]} venue`} loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />
        <div className="vt-venue-cover-shade" />
        {gallery.length > 1 && (
          <span style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(10, 18, 14, 0.75)",
            backdropFilter: "blur(6px)",
            color: "#fff",
            padding: "2px 7px",
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: 700,
            zIndex: 2,
          }}>
            📷 {gallery.length} photos
          </span>
        )}
        <span className={`vt-venue-status ${hasAvailability ? "" : "unavailable"}`}>
          {hasAvailability ? "Open slots today" : "No slots today"}
        </span>
        {isDynamic && (
            <span className="vt-venue-demand">Filling fast</span>
          )}
          {turf.occupancy > 0 && (
            <div className="vt-venue-occupancy" aria-label={`${turf.occupancy}% of today's slots are booked`}>
              <span>Slots booked today</span>
              <span>{turf.occupancy}%</span>
              <div><i style={{ width: `${turf.occupancy}%` }} /></div>
            </div>
          )}
      </div>

      <div className="vt-venue-content">
        <div className="vt-venue-heading">
          <div>
            <h3 className="vt-venue-name">
              <DemoNameWithBadge name={turf.name} />
            </h3>
            <div className="vt-venue-location">
              <Icon name="map" size={14} color={V.chalkFaint} />
              <span title={turf.location}>{turf.location}</span>
            </div>
          </div>
          <div className="vt-venue-price">
            <strong>₹{price}</strong>
            <span>/ hr</span>
          </div>
        </div>

        <div className="vt-venue-tags">
          {turf.sports.map((s, index) => (
            <span key={s} className="vt-venue-tag vt-venue-sport" style={{ "--tag-accent": NAV_ACCENTS[index % NAV_ACCENTS.length] }}>
              {s}
            </span>
          ))}
          {turf.amenities.slice(0, 2).map(a => (
            <span key={a} className="vt-venue-tag">
              {a}
            </span>
          ))}
        </div>

        <div className="vt-venue-rating">
          <div className="vt-venue-stars">
            {[...Array(5)].map((_, i) => (
              <Icon key={i} name="star" size={12} filled={i < Math.round(turf.rating)} color={i < Math.round(turf.rating) ? V.flood : V.line} />
            ))}
          </div>
          <strong>{turf.rating}</strong>
          <span>({turf.reviews} reviews)</span>
        </div>

        <div className="vt-venue-actions">
          <button onClick={() => onBook(turf)} style={buttonStyle("primary", "md")}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Book now
          </button>
          <button onClick={() => onMatch(turf)} style={buttonStyle("secondary", "md")}
            onMouseEnter={e => { e.currentTarget.style.borderColor = V.lineStrong; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = V.line; }}
          >
            Join game
          </button>
        </div>
      </div>
    </article>
  );
}

// ============================================================
// BOOKING MODAL & CANCELLATION MODAL
// ============================================================
function BookingModal({ turf, profile, supabase, onClose, onConfirm, showToast, onGoToDashboard, resume = null }) {
  // `resume` is only a HINT from a pre-login selection. The date is range-checked
  // here, and the slot is only pre-selected after availability is re-fetched below.
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = todayStr();
    const hinted = resume?.bookingDate;
    return hinted && hinted >= today && hinted <= addDays(today, 6) ? hinted : today;
  });
  const resumeSlotRef = useRef(resume?.startTime ? { startTime: resume.startTime, date: resume.bookingDate } : null);
  const [resumeNotice, setResumeNotice] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalSlots, setModalSlots] = useState(() => turf?.slots || []);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotConflictMsg, setSlotConflictMsg] = useState("");
  const [step, setStep] = useState(1); // 1: date & slot, 2: review, 3: authoritative confirmation
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [bookingPrice, setBookingPrice] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const turfPhotos = useMemo(() => getTurfImages(turf), [turf]);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [userTeams, setUserTeams] = useState([]);
  const [userPasses, setUserPasses] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        if (d?.myTeams) setUserTeams(d.myTeams);
      })
      .catch(() => {});

    fetch("/api/player/packages")
      .then((r) => r.json())
      .then((d) => {
        if (d?.packages) {
          const active = d.packages.filter((p) => p.status === "active" && p.remainingSessions > 0);
          setUserPasses(active);
        }
      })
      .catch(() => {});
  }, [profile?.id]);

  // Client-side idempotency key for this booking session
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `vt-book-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const bookedSlotsCount = modalSlots.filter(s => s.status !== "available").length;
  const occupancy = modalSlots.length ? Math.round((bookedSlotsCount / modalSlots.length) * 100) : 0;
  const isDynamic = occupancy > 70;
  const price = bookingPrice ?? (turf ? calcPrice(turf, occupancy) : 0);
  const points = Math.floor(price * 0.1);

  // Generate 7 upcoming days
  const today = todayStr();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i);
    const [y, m, d] = key.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dateObj.toLocaleDateString("en-GB", { weekday: "short" });
    const dayMonth = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return { key, weekday, dayMonth };
  });

  // Fetch slots whenever the date changes
  useEffect(() => {
    let active = true;
    async function loadDateSlots() {
      setSlotsLoading(true);
      setSlotConflictMsg("");
      setSelectedSlot(null);
      try {
        const { data: slots, error } = await supabase.rpc("turf_slots", {
          p_turf_id: turf.id,
          p_date: selectedDate,
        });
        if (!active) return;
        if (error) {
          console.error("Could not fetch slots for date", error);
          setSlotConflictMsg("Couldn't refresh slot availability. Please try another date.");
        } else {
          const list = (slots || []).map(s => ({
            time: fmtTime(s.slot_time),
            raw_time: s.slot_time,
            status: s.status,
          }));
          const liveList = annotateSlotsWithLiveTime(list, selectedDate, getTurfCurrentTime());
          setModalSlots(liveList);

          // Restore a slot picked before sign-in ONLY if the fresh data says it is still free.
          const pending = resumeSlotRef.current;
          if (pending && pending.date === selectedDate) {
            resumeSlotRef.current = null;
            const wanted = String(pending.startTime).slice(0, 5);
            const index = liveList.findIndex(s => String(s.raw_time).slice(0, 5) === wanted);
            if (index >= 0 && liveList[index].status === "available" && !liveList[index].isClosed) {
              setSelectedSlot(index);
              setResumeNotice(`Welcome back! We re-checked availability: ${liveList[index].time} on ${selectedDate} is still open. Review the price, then confirm when you're ready.`);
            } else {
              setSlotConflictMsg(`The ${fmtTime(pending.startTime)} slot you picked earlier has ended or is no longer available. Your booking has not been made. Choose another available time to continue.`);
            }
          }
        }
      } catch (err) {
        if (!active) return;
        setSlotConflictMsg("Network error loading slots. Please retry.");
      } finally {
        if (active) setSlotsLoading(false);
      }
    }
    loadDateSlots();
    return () => { active = false; };
  }, [selectedDate, turf.id, supabase]);

  // Live real-time ticker to close expired sessions automatically
  useEffect(() => {
    const timer = setInterval(() => {
      const serverTime = getTurfCurrentTime();
      setModalSlots((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (s.status === "available" && isSessionStartedOrEnded(selectedDate, s.raw_time, serverTime)) {
            changed = true;
            return { ...s, status: "closed", isExpired: true, isClosed: true };
          }
          return s;
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedDate]);

  // If the user's selected slot expires or is closed in real time, deselect and inform:
  useEffect(() => {
    if (selectedSlot !== null) {
      const slot = modalSlots[selectedSlot];
      if (slot && (slot.status === "closed" || slot.isClosed || slot.isExpired)) {
        setSelectedSlot(null);
        setSlotConflictMsg("This session has ended. Please choose an upcoming time slot.");
      }
    }
  }, [modalSlots, selectedSlot]);

  if (!turf) return null;

  const handleCopyId = () => {
    if (!bookingId) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(bookingId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePay = async () => {
    const syntheticTurf = { ...turf, slots: modalSlots };
    const validation = validateBookingRequest({ profile, turf: syntheticTurf, selectedSlot });
    const policyValidation = canSubmitBooking({ profile, turf: syntheticTurf, selectedSlot });

    if (!validation.ok || !policyValidation.ok) {
      const message = validation.error || policyValidation.error || "Booking unavailable.";
      showToast(message, { type: "error" });
      if (message.includes("ended") || message.includes("closed")) {
        setSlotConflictMsg("This session has ended. Please choose an upcoming time slot.");
        setStep(1);
        setSelectedSlot(null);
      } else if (message.includes("just taken") || message.includes("no longer available")) {
        setSlotConflictMsg("That slot was just booked by another player. Please select another slot.");
        setStep(1);
        setSelectedSlot(null);
      }
      return;
    }

    setSubmitting(true);
    setSlotConflictMsg("");
    const slot = policyValidation.slot;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers = {
        "Content-Type": "application/json",
        "x-idempotency-key": idempotencyKey,
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          turfId: turf.id,
          startTime: slot.raw_time,
          sport: turf.sports?.[0],
          bookingDate: selectedDate,
          idempotencyKey,
          teamId: selectedTeamId || undefined,
          userPackageId: selectedPackageId || undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = extractErrorMessage(result, "Couldn't complete the booking. Try again.");
        showToast(message, { type: "error" });
        if (response.status === 409 || result?.code === "SLOT_CONFLICT" || message.includes("just taken") || message.includes("no longer available")) {
          setSlotConflictMsg("That slot was just booked by another player. We've refreshed the schedule below.");
          setStep(1);
          setSelectedSlot(null);
          // Refresh slots immediately
          const { data: freshSlots } = await supabase.rpc("turf_slots", {
            p_turf_id: turf.id,
            p_date: selectedDate,
          });
          if (freshSlots) {
            setModalSlots(freshSlots.map(s => ({
              time: fmtTime(s.slot_time),
              raw_time: s.slot_time,
              status: s.status,
            })));
          }
        }
        setSubmitting(false);
        return;
      }

      if (!result?.id) {
        showToast("The booking was saved, but its confirmation details could not be loaded. Please check your bookings dashboard.", { type: "error" });
        setSubmitting(false);
        return;
      }

      const finalPrice = Number(result.price ?? price);
      setBookingId(result.id);
      setBookingPrice(finalPrice);
      setStep(3);
    } catch (requestError) {
      console.error("Booking creation request failed", requestError);
      showToast("Couldn't reach the server. Check your connection and try again.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSlotData = selectedSlot !== null ? modalSlots[selectedSlot] : null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 18, 14, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        style={{
          ...panel(true),
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.25s ease",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          borderBottom: `1px solid ${V.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: V.pitchCard,
        }}>
          <div>
            <h2 id="booking-modal-title" style={{ color: V.chalk, margin: 0, fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
              {step === 3 ? "Booking Confirmed" : step === 2 ? "Review Booking" : `Book ${turf.name}`}
            </h2>
            <p style={{ color: V.chalkFaint, margin: "2px 0 0", fontSize: 13, fontFamily: FONT_BODY }}>
              {turf.location} · {turf.sports?.[0] || "All sports"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
            style={{
              background: "transparent",
              border: `1px solid ${V.lineStrong}`,
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: "pointer",
              color: V.chalk,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {step === 1 && (
            <>
              {/* Turf Photo Gallery */}
              {(() => {
                const photos = turfPhotos.gallery?.length ? turfPhotos.gallery : [turfPhotos.cover];
                const activePhoto = photos[activePhotoIdx] || photos[0];
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      position: "relative",
                      borderRadius: 14,
                      overflow: "hidden",
                      height: 190,
                      background: V.pitchCardRaised,
                      border: `1px solid ${V.line}`,
                    }}>
                      <img
                        src={activePhoto}
                        alt={`${turf.name} photo`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(10, 18, 14, 0.75) 0%, transparent 60%)",
                      }} />
                      {photos.length > 1 && (
                        <div style={{
                          position: "absolute",
                          bottom: 10,
                          right: 12,
                          background: "rgba(0,0,0,0.68)",
                          backdropFilter: "blur(6px)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                        }}>
                          {activePhotoIdx + 1} / {photos.length} photos
                        </div>
                      )}
                      {turf.amenities && turf.amenities.length > 0 && (
                        <div style={{
                          position: "absolute",
                          bottom: 10,
                          left: 12,
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}>
                          {turf.amenities.slice(0, 3).map((a) => (
                            <span key={a} style={{
                              background: "rgba(10, 18, 14, 0.7)",
                              backdropFilter: "blur(6px)",
                              color: V.chalkDim,
                              padding: "2px 7px",
                              borderRadius: 6,
                              fontSize: 10.5,
                              fontWeight: 600,
                              border: `1px solid ${V.line}`,
                            }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {photos.length > 1 && (
                      <div style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                        overflowX: "auto",
                        paddingBottom: 4,
                      }}>
                        {photos.map((src, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActivePhotoIdx(i)}
                            style={{
                              flexShrink: 0,
                              width: 56,
                              height: 42,
                              borderRadius: 8,
                              overflow: "hidden",
                              border: `2px solid ${activePhotoIdx === i ? V.flood : V.line}`,
                              padding: 0,
                              background: "none",
                              cursor: "pointer",
                              opacity: activePhotoIdx === i ? 1 : 0.65,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <img src={src} alt={`Thumbnail ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {resumeNotice && !slotConflictMsg && selectedSlot !== null && (
                <div role="status" style={{
                  background: "rgba(31, 155, 108, 0.1)",
                  border: "1px solid rgba(31, 155, 108, 0.35)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: V.chalk,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}>
                  {resumeNotice}
                </div>
              )}
              {/* Conflict Alert Banner if stale slot */}
              {slotConflictMsg && (
                <div role="alert" style={{
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: V.danger,
                  fontWeight: 600,
                }}>
                  <Icon name="alert" size={18} color={V.danger} />
                  <span>{slotConflictMsg}</span>
                </div>
              )}

              {/* Date Selector Pills */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", color: V.chalkDim, fontSize: 13, fontWeight: 700, marginBottom: 8, fontFamily: FONT_BODY }}>
                  1. Choose Date
                </label>
                <div
                  role="tablist"
                  aria-label="Select match date"
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    paddingBottom: 4,
                    scrollbarWidth: "none",
                  }}
                >
                  {dateOptions.map(opt => {
                    const isDateSelected = selectedDate === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="tab"
                        aria-selected={isDateSelected}
                        onClick={() => setSelectedDate(opt.key)}
                        style={{
                          flex: "0 0 auto",
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: `1.5px solid ${isDateSelected ? V.floodButton || V.flood : V.lineStrong}`,
                          background: isDateSelected ? "rgba(21, 128, 81, 0.1)" : V.pitchCard,
                          color: isDateSelected ? V.floodButton || V.flood : V.chalk,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          minWidth: 72,
                          fontFamily: FONT_BODY,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: isDateSelected ? 800 : 600 }}>{opt.weekday}</span>
                        <span style={{ fontSize: 11, color: isDateSelected ? V.floodButton || V.flood : V.chalkFaint, fontWeight: 500 }}>{opt.dayMonth}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot Legend & Grid */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
                <span style={{ color: V.chalkDim, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY }}>
                  2. Select Time Slot
                </span>
                <div style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: FONT_BODY }}>
                  <span style={{ color: V.floodButton || V.flood, display: "inline-flex", alignItems: "center", gap: 3 }}>● Open</span>
                  <span style={{ color: V.pending, display: "inline-flex", alignItems: "center", gap: 3 }}>● Held</span>
                  <span style={{ color: V.chalkFaint, display: "inline-flex", alignItems: "center", gap: 3 }}>● Taken</span>
                  <span style={{ color: "#9ca3af", display: "inline-flex", alignItems: "center", gap: 3 }}>● Closed</span>
                </div>
              </div>

              <SlotGrid
                slots={modalSlots}
                onSelect={setSelectedSlot}
                selected={selectedSlot}
                loading={slotsLoading}
                price={price}
              />

              {/* Price & Occupancy Callout */}
              <div style={{
                marginTop: 18,
                padding: "14px 16px",
                background: V.pitchCard,
                borderRadius: 14,
                border: `1px solid ${V.lineStrong}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <span style={{ color: V.chalkDim, fontSize: 13, fontFamily: FONT_BODY, display: "block" }}>
                    Standard Rate
                  </span>
                  {isDynamic && (
                    <span style={{ fontSize: 11, color: V.pending, fontWeight: 700, fontFamily: FONT_BODY }}>
                      🔥 High demand: Peak price applied
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: V.chalk, fontSize: 18, fontWeight: 800, fontFamily: FONT_BODY }}>
                    ₹{price}
                  </span>
                  <span style={{ color: V.chalkFaint, fontSize: 12 }}> / hour</span>
                </div>
              </div>

              {/* Proceed to Review */}
              <button
                type="button"
                disabled={selectedSlot === null}
                onClick={() => setStep(2)}
                style={{
                  marginTop: 18,
                  width: "100%",
                  ...buttonStyle("primary", "lg", selectedSlot === null),
                }}
              >
                {selectedSlot !== null
                  ? `Review Slot (${modalSlots[selectedSlot]?.time}) →`
                  : "Select a slot above"}
              </button>
            </>
          )}

          {step === 2 && selectedSlotData && (
            <>
              {/* Trust Badge */}
              <div style={{
                background: "rgba(21, 128, 81, 0.08)",
                border: "1px solid rgba(21, 128, 81, 0.25)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 18,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: V.floodButton || V.flood, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 14 }}>
                  ✓
                </div>
                <div>
                  <div style={{ color: V.confirmed, fontWeight: 800, fontSize: 14, fontFamily: FONT_BODY }}>
                    Instant Confirmation Guaranteed
                  </div>
                  <div style={{ color: V.chalkDim, fontSize: 12.5, marginTop: 2, fontFamily: FONT_BODY, lineHeight: 1.4 }}>
                    Your booking slot is held exclusively. This is a demo checkout; no real card charge will be made.
                  </div>
                </div>
              </div>

              {/* Detailed Booking Summary */}
              <div style={{
                background: V.pitchCard,
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
                border: `1px solid ${V.lineStrong}`,
              }}>
                <h4 style={{
                  color: V.chalkFaint,
                  fontSize: 11.5,
                  fontWeight: 800,
                  margin: "0 0 14px",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontFamily: FONT_BODY,
                }}>
                  Booking Summary
                </h4>

                {[
                  ["Turf Venue", turf.name],
                  ["Location", turf.location],
                  ["Sport", turf.sports?.[0] || "Sports"],
                  ["Date", formatBookingDate(selectedDate)],
                  ["Time Slot", `${selectedSlotData.time} – ${(parseInt(selectedSlotData.time) + 1)}:00`],
                  ["Duration", "1 hour match"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13.5 }}>
                    <span style={{ color: V.chalkDim, fontFamily: FONT_BODY }}>{label}</span>
                    <span style={{ color: V.chalk, fontWeight: 700, fontFamily: FONT_BODY, textAlign: "right" }}>{val}</span>
                  </div>
                ))}

                {/* Team selection */}
                {userTeams.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", marginBottom: 6 }}>
                      Book on Behalf of Team
                    </label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                    >
                      <option value="">Individual Booking (No team)</option>
                      {userTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sports Pass payment option */}
                {userPasses.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", marginBottom: 6 }}>
                      Payment Method
                    </label>
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 8, color: V.chalk, fontSize: 13 }}
                    >
                      <option value="">Standard Payment (₹{price})</option>
                      {userPasses.map((p) => (
                        <option key={p.id} value={p.id}>🎟️ {p.packageName} ({p.remainingSessions} sessions left)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ height: 1, background: V.lineStrong, margin: "14px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: V.chalk, fontSize: 16, fontWeight: 800, fontFamily: FONT_BODY }}>Total Payable</span>
                  <span style={{ color: V.floodButton || V.flood, fontSize: 22, fontWeight: 800, fontFamily: FONT_BODY }}>
                    {selectedPackageId ? "Free (1 Pass Credit)" : `₹${price}`}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: V.confirmed, fontWeight: 700, fontFamily: FONT_BODY, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>🎁</span> {selectedPackageId ? "Redeeming 1 pass session credit from your subscription" : `+${points} loyalty reward points will be credited upon confirmation`}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 10 }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(1)}
                  style={buttonStyle("secondary", "lg", submitting)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePay}
                  style={buttonStyle("primary", "lg", submitting)}
                >
                  {submitting ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid #ffffff",
                          borderRightColor: "transparent",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      <span>Confirming slot…</span>
                    </>
                  ) : (
                    selectedPackageId ? "Confirm & Redeem Pass" : `Confirm & Book · ₹${price}`
                  )}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(21, 128, 81, 0.12)",
                border: "2px solid rgba(21, 128, 81, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: V.floodButton || V.flood,
              }}>
                <Icon name="check" size={32} color={V.floodButton || V.flood} />
              </div>

              <h3 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                You're All Set!
              </h3>
              <p style={{ color: V.chalkDim, marginBottom: 20, fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.5 }}>
                Your booking is officially confirmed. Show your entry pass or QR ticket at the pitch reception.
              </p>

              {/* Booking Pass Card */}
              <div style={{
                background: V.pitchCard,
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${V.lineStrong}`,
                textAlign: "left",
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: V.chalkFaint, letterSpacing: 0.8 }}>
                      Booking Pass
                    </span>
                    <h4 style={{ margin: "2px 0 0", color: V.chalk, fontSize: 17, fontWeight: 800 }}>
                      {turf.name}
                    </h4>
                    <span style={{ fontSize: 12.5, color: V.chalkFaint }}>{turf.location}</span>
                  </div>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    background: "rgba(21, 128, 81, 0.12)",
                    color: V.confirmed,
                    border: "1px solid rgba(21, 128, 81, 0.28)",
                  }}>
                    ✓ Confirmed
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 13 }}>
                  <div>
                    <span style={{ color: V.chalkFaint, fontSize: 11 }}>Date</span>
                    <div style={{ fontWeight: 700, color: V.chalk, marginTop: 2 }}>{formatBookingDate(selectedDate)}</div>
                  </div>
                  <div>
                    <span style={{ color: V.chalkFaint, fontSize: 11 }}>Time Slot</span>
                    <div style={{ fontWeight: 700, color: V.chalk, marginTop: 2 }}>
                      {selectedSlotData?.time} (1 hr)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: V.chalkFaint, fontSize: 11 }}>Sport</span>
                    <div style={{ fontWeight: 700, color: V.chalk, marginTop: 2 }}>{turf.sports?.[0] || "Sports"}</div>
                  </div>
                  <div>
                    <span style={{ color: V.chalkFaint, fontSize: 11 }}>Total Paid</span>
                    <div style={{ fontWeight: 800, color: V.floodButton || V.flood, marginTop: 2 }}>₹{bookingPrice ?? price}</div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div style={{
                  background: "#ffffff",
                  padding: 16,
                  borderRadius: 14,
                  border: `1px solid ${V.line}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}>
                  {bookingId && <BookingQrCode bookingId={bookingId} size={150} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: V.chalkDim, fontSize: 11.5, fontFamily: FONT_DATA }}>
                      REF: {bookingId ? bookingId.slice(0, 13) + "…" : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      style={{
                        background: "transparent",
                        border: `1px solid ${V.lineStrong}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        color: copiedId ? V.confirmed : V.chalk,
                      }}
                    >
                      {copiedId ? "Copied!" : "Copy ID"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Next Actions */}
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onGoToDashboard?.();
                  }}
                  style={buttonStyle("primary", "lg")}
                >
                  View in My Games →
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  style={buttonStyle("secondary", "md")}
                >
                  Done & Browse More Turfs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelBookingModal({ booking, onClose, onCancelled, showToast }) {
  const [reason, setReason] = useState("Change of plans");
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          reason,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(extractErrorMessage(data, "Couldn't cancel this booking. Try again."), { type: "error" });
        setSubmitting(false);
        return;
      }

      showToast(`Cancelled booking at ${booking.turf}. The slot is now free again.`, { type: "info" });
      onCancelled();
      onClose();
    } catch (err) {
      console.error("Cancellation error", err);
      showToast("Network error. Please check your connection and retry.", { type: "error" });
      setSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 18, 14, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1150,
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        onSubmit={handleCancelSubmit}
        onClick={e => e.stopPropagation()}
        style={{
          ...panel(true),
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          padding: 24,
          display: "grid",
          gap: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div>
          <h2 id="cancel-modal-title" style={{ color: V.danger, fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 700, margin: 0 }}>
            Cancel Booking?
          </h2>
          <p style={{ color: V.chalkDim, fontSize: 13.5, margin: "6px 0 0", fontFamily: FONT_BODY }}>
            Are you sure you want to cancel your booking at <strong>{booking.turf}</strong> on <strong>{formatBookingDate(booking.bookingDate)} at {booking.time}</strong>?
          </p>
        </div>

        <div style={{
          background: "rgba(220, 38, 38, 0.08)",
          border: "1px solid rgba(220, 38, 38, 0.25)",
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: 12.5,
          color: V.chalkDim,
          lineHeight: 1.5,
        }}>
          ⚠️ Once cancelled, this time slot will be reopened immediately for other players and cannot be restored.
        </div>

        <label style={{ display: "grid", gap: 6, color: V.chalkDim, fontSize: 13, fontWeight: 600 }}>
          Reason for cancellation
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              background: V.pitchCard,
              border: `1px solid ${V.lineStrong}`,
              color: V.chalk,
              fontFamily: FONT_BODY,
              fontSize: 13.5,
            }}
          >
            <option value="Change of plans">Change of plans</option>
            <option value="Squad / players unavailable">Squad / players unavailable</option>
            <option value="Inclement weather / rain">Inclement weather / rain</option>
            <option value="Booked wrong turf or time">Booked wrong turf or time</option>
            <option value="Other reason">Other reason</option>
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={buttonStyle("secondary", "md", submitting)}
          >
            Keep Booking
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={buttonStyle("danger", "md", submitting)}
          >
            {submitting ? "Cancelling…" : "Yes, Cancel Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// HERO SECTION
// ============================================================
function HeroSection({ onExplore, venueCount, isLoading }) {
  const [searchVal, setSearchVal] = useState("");

  const submitSearch = () => onExplore(searchVal);

  return (
    <section className="vt-player-hero">
      <div className="vt-player-hero-copy">
        <div className="vt-player-hero-kicker"><span /> GAME ON. EVERY DAY.</div>
        <h1>
          Book a turf.<br />
          <em>Bring your squad.</em>
        </h1>
        <p className="vt-player-hero-description">
          Find turfs near you, see open slots instantly, and lock your game in seconds.
        </p>

        <div className="vt-player-search">
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingLeft: 12 }}>
            <Icon name="search" size={19} color={V.chalkFaint} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitSearch()}
              placeholder="Search football, cricket, badminton, or your area..."
              aria-label="Search turfs, sports, or locations"
            />
          </div>
          <button onClick={submitSearch} className="vt-player-search-button">
            Book now <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="vt-player-hero-trust">
          <span><i aria-hidden="true">✓</i> Real-time slots</span>
          <span><i aria-hidden="true">✓</i> No hidden charges</span>
          <span><i aria-hidden="true">✓</i> Quick online booking</span>
        </div>
      </div>

      <div className="vt-player-hero-visual" aria-label="Illustration of a sports venue">
        <div className="vt-player-scene-frame">
          <StadiumScene className="vt-player-scene" />
          <div className="vt-player-visual-caption">
            <span className="vt-player-caption-icon" aria-hidden="true">🏟️</span>
            <span><strong>Your next match is waiting.</strong><small>{isLoading ? "Finding turfs near you" : venueCount < 5 ? "Turfs near you" : `${venueCount} ${venueCount === 1 ? "turf" : "turfs"} ready to play`}</small></span>
          </div>
        </div>
        <div className="vt-player-hero-note">
          <span className="vt-player-note-mark" aria-hidden="true">✓</span>
          <span><strong>Slots you see are slots you get</strong><small>Instant confirmation</small></span>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// DISCOVER / TURF LIST
// ============================================================
function DiscoverSection({ turfs, onBook, onMatch, isLoading, initialSearch = "" }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState(initialSearch);
  const sportOptions = [...new Map([...SPORT_OPTIONS, ...turfs.flatMap((t) => t.sports || [])]
    .map((sport) => [String(sport).toLowerCase(), sport])).values()];
  const sports = ["All", ...sportOptions];

  useEffect(() => { setSearch(initialSearch); }, [initialSearch]);

  // Chip rail: track whether more chips are hidden on either side (drives the
  // edge fades and the arrow buttons) and keep it correct on resize.
  const railRef = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth > el.clientWidth + 2;
    const next = {
      start: canScroll && el.scrollLeft > 4,
      end: canScroll && el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    updateEdges();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateEdges) : null;
    observer?.observe(el);
    window.addEventListener("resize", updateEdges);
    return () => { observer?.disconnect(); window.removeEventListener("resize", updateEdges); };
  }, [updateEdges, sports.length]);
  const scrollBehavior = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const scrollRail = (direction) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.7), behavior: scrollBehavior() });
  };

  const q = search.trim().toLowerCase();
  const filtered = turfs
    .filter(t => filter === "All" || t.sports.some((sport) => String(sport).toLowerCase() === filter.toLowerCase()))
    .filter(t => !q || t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.sports.some(s => s.toLowerCase().includes(q)));

  return (
    <section className="vt-discover-section">
      <div className="vt-discover-inner">
        <div className="vt-discover-heading">
          <div className="vt-discover-heading-text">
            <span className="vt-section-eyebrow">PLAY NEAR YOU</span>
            <h2>Find your next turf</h2>
            <p>Football, cricket, badminton and more. Find a turf that fits your game.</p>
          </div>
          <span className="vt-venue-count">
            {isLoading ? "Updating turfs…" : `${filtered.length} ${filtered.length === 1 ? "turf" : "turfs"}`}
          </span>
        </div>

        <div className="vt-discover-controls">
          <div className="vt-sport-filters-wrap">
            <button
              type="button"
              className="vt-sport-scroll vt-sport-scroll-left"
              onClick={() => scrollRail(-1)}
              disabled={!edges.start}
              hidden={!edges.start && !edges.end}
              aria-label="Scroll sports left"
            >
              ‹
            </button>
            <div
              ref={railRef}
              className="vt-sport-filters"
              role="group"
              aria-label="Filter turfs by sport"
              onScroll={updateEdges}
              style={{ "--fade-l": edges.start ? "28px" : "0px", "--fade-r": edges.end ? "28px" : "0px" }}
            >
              {sports.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    setFilter(s);
                    // make sure a partially hidden chip ends up fully in view
                    e.currentTarget.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: scrollBehavior() });
                  }}
                  onFocus={(e) => {
                    e.currentTarget.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: scrollBehavior() });
                  }}
                  className={`vt-sport-filter ${filter === s ? "active" : ""}`}
                  aria-pressed={filter === s}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="vt-sport-scroll vt-sport-scroll-right"
              onClick={() => scrollRail(1)}
              disabled={!edges.end}
              hidden={!edges.start && !edges.end}
              aria-label="Scroll sports right"
            >
              ›
            </button>
          </div>

          <label className="vt-discover-search">
            <Icon name="search" size={17} color={V.chalkFaint} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search turf, area, or sport"
              aria-label="Search turf, area, or sport"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>
            )}
          </label>
        </div>

        {isLoading ? (
          <SkeletonGrid count={3} minColWidth={320} cardHeight={160} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={q ? `No turfs match "${search}"` : "No turfs match that filter"}
            subtitle={q ? "Try a different name, area, or sport." : "Try a different sport, or check back later as new turfs come online."}
          />
        ) : (
          <div className="vt-venue-grid">
            {filtered.map((t, index) => (
              <TurfCard key={t.id} turf={t} onBook={onBook} onMatch={onMatch} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// RESUME MATCH MODAL (Post-Auth Intent Confirmation)
// ============================================================
function ResumeMatchModal({ match, onClose, onConfirm, isPending }) {
  if (!match) return null;
  const isFull = match.players >= match.max;
  const fill = match.players / match.max;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 18, 14, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-match-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: V.pitchCard,
          border: `1px solid ${V.line}`,
          borderRadius: 20,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{match.sport === "Football" ? "⚽" : match.sport === "Basketball" ? "🏀" : "🏏"}</span>
          <div>
            <span style={{ color: V.flood, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, fontFamily: FONT_BODY }}>RESUME JOINING</span>
            <h3 id="resume-match-title" style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 24, margin: "2px 0 0" }}>
              {match.sport} Match
            </h3>
          </div>
        </div>

        <div style={{ background: V.pitch, border: `1px solid ${V.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: V.chalk, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, marginBottom: 8 }}>
            <Icon name="map" size={14} color={V.flood} />
            <span>{match.turf}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: V.chalkDim, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="clock" size={13} color={V.chalkFaint} />
              <span>{match.date}, {match.time}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="users" size={13} color={V.chalkFaint} />
              <span>{match.players}/{match.max} players</span>
            </div>
          </div>
          <div style={{ height: 6, background: V.line, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(1, fill) * 100}%`,
              background: fill >= 1 ? V.danger : fill > 0.8 ? V.pending : V.flood,
              borderRadius: 3,
            }} />
          </div>
        </div>

        {isFull ? (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${V.danger}44`,
            borderRadius: 10,
            padding: "12px 14px",
            color: V.chalk,
            fontSize: 13,
            fontFamily: FONT_BODY,
            marginBottom: 20,
            lineHeight: 1.4,
          }}>
            ⚠️ This match reached maximum capacity ({match.max}/{match.max}) while you were signing in. You can explore other open games.
          </div>
        ) : (
          <p style={{ color: V.chalkDim, fontSize: 13.5, fontFamily: FONT_BODY, lineHeight: 1.5, marginBottom: 24 }}>
            You selected this match before signing in. Would you like to confirm your spot now?
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isFull ? "1fr" : "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              background: "transparent",
              border: `1px solid ${V.line}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: V.chalkDim,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: FONT_BODY,
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isFull ? "Browse other matches" : "Cancel"}
          </button>
          {!isFull && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onConfirm(match)}
              style={{
                background: V.flood,
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: FONT_BODY,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Joining..." : "Confirm & Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GAME DETAILS & PAID PARTICIPATION MODAL
// ============================================================
function GameDetailsModal({
  game,
  profile,
  onClose,
  onConfirmed,
  onGoToDashboard,
  showToast,
}) {
  const [step, setStep] = useState(1); // 1 = Details & Fee Breakdown, 2 = Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Idempotency key for payment initiation and confirmation
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `vt-pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const fill = game ? (game.players || game.participant_count || 0) / (game.max || game.max_players || 1) : 0;
  const isFull = game?.is_full || fill >= 1;
  const unitFee = Number(game?.price_per_player || 0);

  const handlePayAndJoin = async () => {
    if (!profile?.id || submitting || isFull) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      // Step 1: Checkout / Order initialization (authoritative price & order reference from DB)
      const checkoutRes = await fetch("/api/player/games/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          matchId: game.id,
          idempotencyKey,
        }),
      });

      const checkoutData = await checkoutRes.json().catch(() => ({}));
      if (!checkoutRes.ok) {
        const msg = checkoutData.error || "Could not prepare game checkout. Please try again.";
        setErrorMsg(msg);
        showToast(msg, { type: "error" });
        setSubmitting(false);
        return;
      }

      const order = checkoutData.order;
      if (!order?.transactionReference) {
        setErrorMsg("Failed to generate payment order reference.");
        setSubmitting(false);
        return;
      }

      // Step 2: Payment verification and atomic participation confirmation
      const confirmRes = await fetch("/api/player/games/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          matchId: game.id,
          transactionReference: order.transactionReference,
          amount: order.amount,
          idempotencyKey,
        }),
      });

      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        const msg = confirmData.error || "Payment verification failed. Please try again.";
        setErrorMsg(msg);
        showToast(msg, { type: "error" });
        setSubmitting(false);
        return;
      }

      setConfirmation({
        ...confirmData,
        order,
      });
      setStep(2);
      onConfirmed();
      showToast(`Spot confirmed for "${game.title || game.sport + ' Match'}"! 🎉`, { type: "success" });
    } catch (err) {
      console.error("Game checkout/confirm exception:", err);
      setErrorMsg("Network error during payment verification. Please try again.");
      showToast("Network error. Please try again.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    const ref = confirmation?.transactionReference || confirmation?.order?.transactionReference;
    if (ref && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (!game) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 18, 14, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: V.pitchCardRaised,
          border: `1px solid ${V.lineStrong}`,
          borderRadius: 20,
          padding: "28px 24px",
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
      >
        {step === 1 ? (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 6, padding: "3px 10px", marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>{sportIcon(game.sport)}</span>
                  <span style={{ color: V.flood, fontSize: 11.5, fontWeight: 700, fontFamily: FONT_BODY }}>{game.sport.toUpperCase()} COMMUNITY GAME</span>
                </div>
                <h3 id="game-modal-title" style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: 0 }}>
                  {game.title || `${game.sport} Match`}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: "transparent",
                  border: `1px solid ${V.line}`,
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: V.chalkDim,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${V.danger}44`,
                borderRadius: 10,
                padding: "10px 14px",
                color: V.danger,
                fontSize: 13,
                marginBottom: 16,
              }}>
                {errorMsg}
              </div>
            )}

            {/* Venue & Time Summary */}
            <div style={{
              background: V.pitchCard,
              border: `1px solid ${V.line}`,
              borderRadius: 14,
              padding: "16px",
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: V.chalk, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                <span>🏟️</span>
                <span>{game.turf_name || game.turf}</span>
                <span style={{ color: V.chalkFaint, fontWeight: 400 }}>· {game.turf_city || "Venue"}</span>
              </div>
              {game.turf_address && (
                <div style={{ color: V.chalkFaint, fontSize: 12.5, marginBottom: 12, paddingLeft: 24 }}>
                  {game.turf_address}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, color: V.chalkDim, paddingTop: 10, borderTop: `1px solid ${V.line}` }}>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11.5, display: "block" }}>SCHEDULE</span>
                  <strong style={{ color: V.chalk }}>
                    {formatBookingDate(game.date || game.match_date)}
                  </strong>
                  <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 2 }}>
                    {formatTime12(game.start_time || game.time)} – {formatTime12(game.end_time || game.start_time || game.time)}
                  </div>
                </div>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11.5, display: "block" }}>AVAILABILITY</span>
                  <strong style={{ color: V.chalk }}>
                    {game.spots_left !== undefined ? game.spots_left : (game.max - game.players)} spots left
                  </strong>
                  <div style={{ fontSize: 12, color: V.chalkDim, marginTop: 2 }}>
                    {game.players || game.participant_count || 0}/{game.max || game.max_players} joined · {game.skill || "Any skill"}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 5, background: V.line, borderRadius: 3, overflow: "hidden", marginTop: 12 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(1, fill) * 100}%`,
                  background: fill >= 1 ? V.danger : fill > 0.8 ? V.pending : V.flood,
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {game.description && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${V.line}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: V.chalkDim,
                fontSize: 12.5,
                lineHeight: 1.5,
                marginBottom: 16,
                fontStyle: "italic",
              }}>
                "{game.description}"
              </div>
            )}

            {/* Participation Fee Breakdown */}
            <div style={{
              background: V.floodDim,
              border: `1px solid ${V.flood}4D`,
              borderRadius: 14,
              padding: "16px",
              marginBottom: 16,
            }}>
              <div style={{ color: V.flood, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Participation Fee Breakdown
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: V.chalkDim, marginBottom: 6 }}>
                <span>Individual Participation Fee</span>
                <span style={{ color: V.chalk, fontWeight: 700 }}>{formatINR(unitFee)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: V.chalkDim, marginBottom: 10 }}>
                <span>Platform Fee (Demo Waiver)</span>
                <span style={{ color: V.confirmed, fontWeight: 700 }}>FREE (₹0)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, color: V.chalk, fontWeight: 800, paddingTop: 10, borderTop: `1px solid ${V.flood}33` }}>
                <span>Total Amount Payable</span>
                <span style={{ color: V.flood, fontSize: 20 }}>{formatINR(unitFee)}</span>
              </div>
            </div>

            {/* Demo Notice */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${V.line}`,
              borderRadius: 10,
              padding: "10px 14px",
              color: V.chalkFaint,
              fontSize: 11.5,
              lineHeight: 1.5,
              marginBottom: 20,
            }}>
              ℹ️ <strong>Demo Checkout:</strong> Velocity Turf operates in demonstration mode. No real credit or debit card is charged. Your participation is verified and recorded upon confirmation.
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: `1px solid ${V.line}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: V.chalkDim,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || isFull}
                onClick={handlePayAndJoin}
                style={{
                  background: isFull ? V.lineStrong : V.flood,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: FONT_BODY,
                  cursor: submitting || isFull ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {submitting ? "Verifying Payment…" : isFull ? "Game Full" : `Pay ${formatINR(unitFee)} & Join Game`}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation Screen */
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.15)",
              border: `2px solid ${V.confirmed}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 28,
            }}>
              ✓
            </div>
            <h3 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>
              Spot Confirmed!
            </h3>
            <p style={{ color: V.chalkDim, fontSize: 14, margin: "0 0 20px" }}>
              You have successfully joined <strong>{game.title || `${game.sport} Match`}</strong>.
            </p>

            <div style={{
              background: V.pitchCard,
              border: `1px solid ${V.line}`,
              borderRadius: 14,
              padding: "16px",
              textAlign: "left",
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${V.line}` }}>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>TRANSACTION REFERENCE</span>
                  <span style={{ color: V.chalk, fontFamily: FONT_DATA, fontSize: 13, fontWeight: 700 }}>
                    {confirmation?.transactionReference || confirmation?.order?.transactionReference || "VT-PAY-CONFIRMED"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${V.line}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: V.chalkDim,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {copiedRef ? "Copied ✓" : "Copy"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>AMOUNT PAID</span>
                  <strong style={{ color: V.flood }}>{formatINR(confirmation?.amount ?? unitFee)}</strong>
                </div>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>PAYMENT STATUS</span>
                  <span style={{ color: V.confirmed, fontWeight: 700 }}>Verified (Paid)</span>
                </div>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>VENUE</span>
                  <strong style={{ color: V.chalk }}>{game.turf_name || game.turf}</strong>
                </div>
                <div>
                  <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>DATE & TIME</span>
                  <strong style={{ color: V.chalk }}>
                    {formatBookingDate(game.date || game.match_date)}, {formatTime12(game.start_time || game.time)}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: `1px solid ${V.line}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: V.chalkDim,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                  cursor: "pointer",
                }}
              >
                Browse Games
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToDashboard?.();
                }}
                style={{
                  background: V.flood,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: FONT_BODY,
                  cursor: "pointer",
                }}
              >
                View in Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MATCHMAKING / COMMUNITY GAMES DISCOVERY SECTION
// ============================================================
function MatchmakingSection({
  matches = [],
  turfs = [],
  onJoin,
  onLeave,
  onFindTurf,
  isLoading,
  fetchError,
  onRefresh,
  joinedMatchIds,
  turfFilter,
  turfName,
  onClearTurfFilter,
  pendingMatchAction,
}) {
  const [sportFilter, setSportFilter] = useState("all");
  const [selectedTurfId, setSelectedTurfId] = useState(turfFilter || "all");
  const [dateFilter, setDateFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const today = todayStr();
  const tomorrow = addDays(today, 1);

  // Available sports in current matches
  const availableSports = useMemo(() => {
    const set = new Set();
    matches.forEach(m => { if (m.sport) set.add(m.sport); });
    return Array.from(set);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // 1. Turf filter (either from external prop or local dropdown)
      const effectiveTurfId = turfFilter || (selectedTurfId !== "all" ? selectedTurfId : null);
      if (effectiveTurfId && m.turf_id !== effectiveTurfId) return false;

      // 2. Sport filter
      if (sportFilter !== "all" && m.sport !== sportFilter) return false;

      // 3. Date filter
      const mDate = m.raw_date || m.date;
      if (dateFilter === "today" && mDate !== today) return false;
      if (dateFilter === "tomorrow" && mDate !== tomorrow) return false;

      // 4. Time filter
      if (timeFilter !== "all") {
        const timeStr = String(m.start_time || m.time || "");
        const hour = parseInt(timeStr.slice(0, 2), 10);
        if (!Number.isNaN(hour)) {
          if (timeFilter === "morning" && (hour < 5 || hour >= 12)) return false;
          if (timeFilter === "afternoon" && (hour < 12 || hour >= 17)) return false;
          if (timeFilter === "evening" && (hour < 17 || hour >= 21)) return false;
          if (timeFilter === "night" && hour < 21 && hour >= 5) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (m.title || "").toLowerCase().includes(q);
        const turfMatch = (m.turf || m.turf_name || "").toLowerCase().includes(q);
        const cityMatch = (m.turf_city || "").toLowerCase().includes(q);
        const sportMatch = (m.sport || "").toLowerCase().includes(q);
        if (!titleMatch && !turfMatch && !cityMatch && !sportMatch) return false;
      }

      return true;
    });
  }, [matches, turfFilter, selectedTurfId, sportFilter, dateFilter, timeFilter, searchQuery, today, tomorrow]);

  const hasActiveFilters = Boolean(
    sportFilter !== "all" ||
    (selectedTurfId !== "all" && !turfFilter) ||
    dateFilter !== "all" ||
    timeFilter !== "all" ||
    searchQuery.trim().length > 0
  );

  const handleResetFilters = () => {
    setSportFilter("all");
    setSelectedTurfId("all");
    setDateFilter("all");
    setTimeFilter("all");
    setSearchQuery("");
    onClearTurfFilter?.();
  };

  return (
    <div className="vt-match-section" style={{ padding: "50px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Title & Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 8, padding: "5px 14px", marginBottom: 10 }}>
              <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: 0.4 }}>COMMUNITY GAMES</span>
            </div>
            <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700, margin: 0 }}>
              Discover & Join Approved Games
            </h2>
            <p style={{ color: V.chalkFaint, margin: "6px 0 0", fontFamily: FONT_BODY }}>
              Play scheduled open games at your favorite turfs with individual ticket pricing.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onRefresh}
              style={{
                ...buttonStyle("secondary", "sm"),
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>↻</span> Refresh Games
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          ...panel(),
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          {/* Top filter row: Search + Turfs + Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {/* Search */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Game, turf, or city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: V.pitchCard,
                  border: `1px solid ${V.line}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: V.chalk,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            {/* Turf Venue Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Venue / Turf
              </label>
              <select
                value={turfFilter || selectedTurfId}
                onChange={e => {
                  if (turfFilter) onClearTurfFilter?.();
                  setSelectedTurfId(e.target.value);
                }}
                style={{
                  width: "100%",
                  background: V.pitchCard,
                  border: `1px solid ${V.line}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: V.chalk,
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="all">All Turfs & Venues</option>
                {turfs.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.city || "Venue"})
                  </option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Date
              </label>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: V.pitchCard,
                  border: `1px solid ${V.line}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: V.chalk,
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="all">Any Upcoming Date</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
              </select>
            </div>

            {/* Time of Day filter */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: V.chalkFaint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Time of Day
              </label>
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: V.pitchCard,
                  border: `1px solid ${V.line}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  color: V.chalk,
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="all">All Times</option>
                <option value="morning">Morning (5 AM – 12 PM)</option>
                <option value="afternoon">Afternoon (12 PM – 5 PM)</option>
                <option value="evening">Evening (5 PM – 9 PM)</option>
                <option value="night">Night (9 PM+)</option>
              </select>
            </div>
          </div>

          {/* Sport Filter Pills Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, paddingTop: 10, borderTop: `1px solid ${V.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: V.chalkFaint, marginRight: 4 }}>SPORT:</span>
              <button
                type="button"
                onClick={() => setSportFilter("all")}
                style={{
                  background: sportFilter === "all" ? V.floodDim : "transparent",
                  border: `1px solid ${sportFilter === "all" ? V.flood : V.line}`,
                  borderRadius: 8,
                  padding: "4px 12px",
                  color: sportFilter === "all" ? V.flood : V.chalkDim,
                  fontSize: 12,
                  fontWeight: sportFilter === "all" ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                All Sports
              </button>
              {SPORT_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSportFilter(s)}
                  style={{
                    background: sportFilter === s ? V.floodDim : "transparent",
                    border: `1px solid ${sportFilter === s ? V.flood : V.line}`,
                    borderRadius: 8,
                    padding: "4px 12px",
                    color: sportFilter === s ? V.flood : V.chalkDim,
                    fontSize: 12,
                    fontWeight: sportFilter === s ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {sportIcon(s)} {s}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: "transparent",
                  border: `1px solid ${V.line}`,
                  borderRadius: 8,
                  padding: "5px 12px",
                  color: V.chalkDim,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear all filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Turf-specific active banner */}
        {turfFilter && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            background: V.floodDim,
            border: `1px solid ${V.flood}4D`,
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏟️</span>
              <span style={{ color: V.chalk, fontSize: 14, fontFamily: FONT_BODY }}>
                Filtered to matches at <strong style={{ color: V.flood }}>{turfName || "Selected Turf"}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onClearTurfFilter}
              style={{
                background: "transparent",
                border: `1px solid ${V.line}`,
                borderRadius: 8,
                color: V.chalkDim,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                cursor: "pointer",
                fontFamily: FONT_BODY,
              }}
            >
              View all venues ✕
            </button>
          </div>
        )}

        {/* Content Area: Loading / Error / Empty / Games List */}
        {isLoading ? (
          <div className="vt-match-list" style={{ display: "grid", gap: 16 }}>
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : fetchError ? (
          <div style={{
            ...panel(),
            padding: "36px 24px",
            textAlign: "center",
            borderRadius: 16,
            border: `1px solid ${V.danger}44`,
            background: "rgba(239,68,68,0.04)",
          }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <h3 style={{ color: V.danger, fontSize: 18, margin: "12px 0 6px", fontFamily: FONT_BODY }}>
              Could not load community games
            </h3>
            <p style={{ color: V.chalkDim, fontSize: 13.5, maxWidth: 440, margin: "0 auto 18px", fontFamily: FONT_BODY }}>
              {fetchError}
            </p>
            <button type="button" onClick={onRefresh} style={buttonStyle("secondary", "md")}>
              Try refreshing ↻
            </button>
          </div>
        ) : filteredMatches.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon="🔍"
              title="No approved games match your filters"
              subtitle="No community games meet your current criteria. Try adjusting sport, date, time, or venue to find open games."
              action={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" onClick={handleResetFilters} style={buttonStyle("primary", "md")}>
                    Reset all filters
                  </button>
                  <button type="button" onClick={onRefresh} style={buttonStyle("secondary", "md")}>
                    Refresh games ↻
                  </button>
                </div>
              }
              accent={V.flood}
            />
          ) : (
            <EmptyState
              icon="🏆"
              title="No approved community games available"
              subtitle="Turf owners schedule community games here once reviewed and approved by administrators. None are open right now. Check back soon or book your own slot!"
              action={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" onClick={onRefresh} style={buttonStyle("secondary", "md")}>
                    Refresh games ↻
                  </button>
                  <button type="button" onClick={onFindTurf} style={buttonStyle("primary", "md")}>
                    Find a turf to book →
                  </button>
                </div>
              }
              accent={V.flood}
            />
          )
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredMatches.map(m => {
              const maxP = m.max || m.max_players || 1;
              const curP = m.players || m.participant_count || 0;
              const fill = curP / maxP;
              const spotsLeft = m.spots_left !== undefined ? m.spots_left : Math.max(0, maxP - curP);
              const isFull = spotsLeft === 0 || m.is_full || fill >= 1;
              const skillColor = m.skill === "Beginner" ? V.confirmed : m.skill === "Intermediate" ? V.info : V.pending;
              const isJoined = joinedMatchIds?.has(m.id);
              const pendingAction = pendingMatchAction?.[m.id];
              const isLeaving = pendingAction === "leave";

              return (
                <div
                  key={m.id}
                  className="vt-match-card"
                  style={{
                    ...panel(),
                    borderRadius: 16,
                    padding: "22px 26px",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 20,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = V.lineStrong;
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = V.line;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 24 }}>{sportIcon(m.sport)}</span>
                      <div>
                        <h3 style={{ color: V.chalk, margin: 0, fontSize: 20, fontFamily: FONT_DISPLAY, fontWeight: 600 }}>
                          {m.title || `${m.sport} Match`}
                        </h3>
                        <span style={{ color: V.chalkFaint, fontSize: 13, fontFamily: FONT_BODY }}>
                          🏟️ {m.turf_name || m.turf} {m.turf_city ? `(${m.turf_city})` : ""}
                        </span>
                      </div>
                      <span style={{
                        marginLeft: "auto",
                        background: "transparent",
                        color: skillColor,
                        border: `1px solid ${skillColor}55`,
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT_BODY,
                      }}>
                        {m.skill}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12, flexWrap: "wrap", fontSize: 13, color: V.chalkDim, fontFamily: FONT_BODY }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="calendar" size={13} color={V.chalkFaint} />
                        <span>{m.date}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="clock" size={13} color={V.chalkFaint} />
                        <span>{m.time} – {formatTime12(m.end_time || m.start_time || m.time)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="users" size={13} color={V.chalkFaint} />
                        <span>{curP}/{maxP} players ({spotsLeft} spots open)</span>
                      </div>
                    </div>

                    {m.turf_address && (
                      <div style={{ color: V.chalkFaint, fontSize: 12, marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {m.turf_address}
                      </div>
                    )}

                    {/* Progress fill bar */}
                    <div style={{ height: 6, background: V.line, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${Math.min(1, fill) * 100}%`,
                        background: isFull ? V.danger : fill > 0.8 ? V.pending : V.flood,
                        borderRadius: 3, transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>

                  {/* Fee & Action Block */}
                  <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, minWidth: 160 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: V.chalkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Participation Fee
                      </div>
                      <div style={{ color: V.flood, fontSize: 24, fontWeight: 800, fontFamily: FONT_BODY }}>
                        {formatINR(m.price_per_player || 0)}
                      </div>
                      <div style={{ color: V.chalkFaint, fontSize: 11 }}>
                        per player
                      </div>
                    </div>

                    {isJoined ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{
                          background: "rgba(34, 197, 94, 0.12)",
                          border: `1px solid ${V.confirmed}55`,
                          color: V.confirmed,
                          fontSize: 12,
                          fontWeight: 800,
                          padding: "8px 14px",
                          borderRadius: 8,
                        }}>
                          Joined ✓
                        </span>
                        <button
                          type="button"
                          disabled={Boolean(pendingAction)}
                          onClick={() => onLeave(m)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${V.danger}55`,
                            borderRadius: 8,
                            padding: "8px 12px",
                            color: V.danger,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: pendingAction ? "not-allowed" : "pointer",
                          }}
                        >
                          {isLeaving ? "Leaving..." : "Leave"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isFull || Boolean(pendingAction)}
                        onClick={() => onJoin(m)}
                        style={{
                          background: isFull ? "transparent" : V.flood,
                          border: isFull ? `1px solid ${V.line}` : "none",
                          borderRadius: 10,
                          padding: "12px 22px",
                          color: isFull ? V.chalkFaint : "#ffffff",
                          fontWeight: 800,
                          cursor: isFull || pendingAction ? "not-allowed" : "pointer",
                          fontSize: 14,
                          fontFamily: FONT_BODY,
                          whiteSpace: "nowrap",
                          boxShadow: isFull ? "none" : `0 4px 14px ${V.flood}44`,
                        }}
                      >
                        {isFull ? "Full Capacity" : `Join for ${formatINR(m.price_per_player || 0)} →`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LOYALTY LEDGER
// ============================================================
function LoyaltySection({ isLoading, leaderboard, myPoints, gamesPlayed }) {
  const nextMilestone = 2000;
  const progress = Math.min(1, myPoints / nextMilestone);
  const myRank = leaderboard.find(p => p.isYou)?.rank;

  return (
    <div className="vt-loyalty-section" style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.floodDim, border: `1px solid ${V.flood}4D`, borderRadius: 8, padding: "5px 14px", marginBottom: 12 }}>
            <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: 0.4 }}>REWARDS</span>
          </div>
          <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 400, margin: 0 }}>Your rewards</h2>
        </div>

        {isLoading ? (
          <div className="vt-loyalty-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        ) : (
        <div className="vt-loyalty-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* My Points Card */}
          <div style={{ ...panel(true), borderRadius: 16, padding: 28 }}>
            <div style={{ color: V.chalkFaint, fontSize: 13, marginBottom: 8, fontFamily: FONT_BODY }}>Your points</div>
            <div style={{ color: V.chalk, fontFamily: FONT_DATA, fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
              {myPoints.toLocaleString()}
              <span style={{ fontSize: 16, color: V.flood, marginLeft: 8 }}>pts</span>
            </div>
            <div style={{ margin: "20px 0 8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: V.chalkFaint, fontSize: 12, fontFamily: FONT_BODY }}>Progress to Gold</span>
              <span style={{ color: V.flood, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ height: 6, background: V.line, borderRadius: 4 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: V.flood, borderRadius: 4 }} />
            </div>
            <div style={{ color: V.chalkFaint, fontSize: 11, marginTop: 6, fontFamily: FONT_BODY }}>
              {myPoints >= nextMilestone ? "You've reached Gold" : `${(nextMilestone - myPoints).toLocaleString()} pts to reach Gold`}
            </div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Leaderboard rank", value: myRank ? `#${myRank}` : "Not ranked yet" },
                { label: "Games played", value: gamesPlayed.toLocaleString() },
              ].map(s => (
                <div key={s.label} style={{ background: V.pitchCardRaised, borderRadius: 10, padding: 12, border: `1px solid ${V.line}` }}>
                  <div style={{ color: V.chalkFaint, fontSize: 11, fontFamily: FONT_BODY }}>{s.label}</div>
                  <div style={{ color: V.chalk, fontWeight: 700, fontSize: 15, marginTop: 4, fontFamily: FONT_DATA }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ ...panel(), borderRadius: 16, padding: 28 }}>
            <div style={{ color: V.chalkFaint, fontSize: 13, marginBottom: 16, fontFamily: FONT_BODY }}>Top players</div>
            {leaderboard.length === 0 ? (
              <EmptyState icon="🏆" title="The leaderboard is empty" subtitle="Book a game to earn your first points and start climbing the leaderboard." accent={V.flood} />
            ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {leaderboard.map(p => (
                <div key={p.rank} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: p.isYou ? V.floodDim : "transparent",
                  border: `1px solid ${p.isYou ? V.flood + "40" : V.line}`,
                  borderRadius: 10,
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => { if (!p.isYou) e.currentTarget.style.borderColor = V.lineStrong; }}
                  onMouseLeave={e => { if (!p.isYou) e.currentTarget.style.borderColor = V.line; }}
                >
                  <RankBadge rank={p.rank} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: p.isYou ? V.flood : V.chalk, fontWeight: 600, fontSize: 14, fontFamily: FONT_BODY }}>{p.name}</div>
                  </div>
                  <div style={{ color: V.chalk, fontWeight: 800, fontFamily: FONT_DATA, fontSize: 14 }}>
                    {p.points.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardSection({ isLoading, bookings, matchesJoined, joinedGames = [], onCancel, onReview, onDispute, onViewQr, onFindTurf, onFindGames, onViewGame }) {
  const [filter, setFilter] = useState("upcoming");
  const now = new Date();
  const upcoming = bookings.filter(b => ["pending", "confirmed"].includes(b.status) && isUpcomingBooking(b, now));
  const pastBookings = bookings.filter(booking => isPlayedBooking(booking, now));
  const cancelledOrDeclined = bookings.filter(b => ["cancelled", "declined"].includes(b.status));
  const totalSpent = bookings.filter(b => ["confirmed", "completed"].includes(b.status)).reduce((sum, b) => sum + b.price, 0);
  const gamesPlayed = pastBookings.length;

  const currentList =
    filter === "upcoming"
      ? upcoming
      : filter === "past"
      ? pastBookings
      : filter === "cancelled"
      ? cancelledOrDeclined
      : bookings;

  return (
    <div className="vt-dashboard-section" style={{ padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, color: V.floodButton || V.flood, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: FONT_BODY }}>
              Player Dashboard
            </span>
            <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 700, margin: "4px 0 0" }}>
              My Games & Activity
            </h2>
          </div>
          <button
            type="button"
            onClick={onFindTurf}
            style={buttonStyle("primary", "md")}
          >
            + Book New Game
          </button>
        </div>

        {isLoading ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} lines={1} />)}
            </div>
            <Skeleton width={160} height={14} style={{ marginBottom: 16 }} />
            <div style={{ display: "grid", gap: 12 }}>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
            </div>
          </>
        ) : (
        <>
          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
            {[
              { label: "Total spent", value: `₹${totalSpent.toLocaleString()}`, icon: "trending" },
              { label: "Games played", value: gamesPlayed, icon: "clock" },
              { label: "Squad matches joined", value: matchesJoined, icon: "trophy" },
              { label: "Upcoming bookings", value: upcoming.length, icon: "calendar" },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  ...panel(),
                  borderRadius: 16,
                  padding: "18px 20px",
                  transition: "transform 0.2s, border-color 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ background: "rgba(21, 128, 81, 0.1)", borderRadius: 10, padding: 8 }}>
                    <Icon name={s.icon} size={18} color={V.floodButton || V.flood} />
                  </div>
                </div>
                <div style={{ color: V.chalk, fontWeight: 800, fontSize: 24, fontFamily: typeof s.value === "string" && s.value.startsWith("₹") ? FONT_BODY : FONT_DATA }}>
                  {s.value}
                </div>
                <div style={{ color: V.chalkFaint, fontSize: 12.5, marginTop: 4, fontFamily: FONT_BODY, fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Filter Navigation Tabs */}
          <div
            role="tablist"
            aria-label="Filter bookings"
            style={{
              display: "flex",
              gap: 8,
              borderBottom: `1px solid ${V.line}`,
              paddingBottom: 12,
              marginBottom: 20,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {[
              { id: "upcoming", label: "Upcoming", count: upcoming.length },
              { id: "community", label: "Community Games", count: (joinedGames || []).length },
              { id: "past", label: "Completed", count: pastBookings.length },
              { id: "cancelled", label: "Cancelled / Declined", count: cancelledOrDeclined.length },
              { id: "all", label: "All Bookings", count: bookings.length },
            ].map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: active ? V.pitchCard : "transparent",
                    border: `1.5px solid ${active ? V.lineStrong : "transparent"}`,
                    color: active ? V.chalk : V.chalkDim,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: FONT_BODY,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    padding: "1px 7px",
                    borderRadius: 999,
                    fontSize: 11,
                    background: active ? "rgba(21, 128, 81, 0.12)" : "rgba(17, 24, 39, 0.06)",
                    color: active ? V.floodButton || V.flood : V.chalkFaint,
                    fontWeight: 800,
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bookings / Community Games List */}
          {filter === "community" ? (
            joinedGames.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <EmptyState
                  icon="🏆"
                  title="No joined community games yet"
                  subtitle="You haven't joined any community games yet. Browse scheduled games at nearby turfs to jump in and play with others!"
                  action={
                    <button type="button" onClick={onFindGames || onFindTurf} style={buttonStyle("primary", "md")}>
                      Browse Community Games →
                    </button>
                  }
                />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {joinedGames.map(jg => {
                  const game = jg.match || {};
                  const turf = game.turf || {};
                  return (
                    <article
                      key={jg.id}
                      style={{
                        ...panel(),
                        borderRadius: 16,
                        padding: "20px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 260 }}>
                        <div style={{
                          width: 50,
                          height: 50,
                          borderRadius: 14,
                          background: V.pitchCardRaised,
                          border: `1px solid ${V.line}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          flexShrink: 0,
                        }}>
                          {sportIcon(game.sport)}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h3 style={{ color: V.chalk, fontWeight: 800, fontSize: 17, margin: 0, fontFamily: FONT_BODY }}>
                              {game.title || `${game.sport} Community Match`}
                            </h3>
                            <span style={{
                              padding: "3px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              fontFamily: FONT_BODY,
                              background: "rgba(34, 197, 94, 0.15)",
                              color: V.confirmed,
                            }}>
                              Paid & Confirmed ✓
                            </span>
                          </div>
                          <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 4, fontFamily: FONT_BODY }}>
                            🏟️ {turf.name || "Turf"} ({turf.city || "Venue"}) · 📅 {formatBookingDate(game.match_date)} · ⏰ {formatTime12(game.start_time)} – {formatTime12(game.end_time || game.start_time)}
                          </div>
                          <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 4, fontFamily: FONT_DATA }}>
                            Ref: {jg.payment_id || "VT-PAY-CONFIRMED"} · Individual Spot Confirmed
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>Fee Paid</span>
                          <span style={{ color: V.flood, fontWeight: 800, fontSize: 18, fontFamily: FONT_BODY }}>
                            {formatINR(jg.amount_paid || 0)}
                          </span>
                        </div>
                        {onViewGame && (
                          <button
                            type="button"
                            onClick={() => onViewGame({
                              ...game,
                              ...jg,
                              turf_name: turf.name,
                              turf_city: turf.city,
                              turf_address: turf.address,
                              price_per_player: jg.amount_paid,
                            })}
                            style={buttonStyle("secondary", "sm")}
                          >
                            Game Details
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : currentList.length === 0 ? (
            <div style={{ marginTop: 12 }}>
              {filter === "upcoming" ? (
                <EmptyState
                  icon="📅"
                  title="No upcoming bookings"
                  subtitle="You have no matches scheduled right now. Browse nearby pitches to find an open slot and lock in your game."
                  action={
                    <button type="button" onClick={onFindTurf} style={buttonStyle("primary", "md")}>
                      Explore Available Turfs →
                    </button>
                  }
                />
              ) : filter === "past" ? (
                <EmptyState
                  icon="⚽"
                  title="No completed games yet"
                  subtitle="Matches you play will be archived here. After your match, you can leave ratings and reviews for the facility."
                  action={
                    <button type="button" onClick={onFindTurf} style={buttonStyle("secondary", "md")}>
                      Book Your First Match →
                    </button>
                  }
                />
              ) : filter === "cancelled" ? (
                <EmptyState
                  icon="✓"
                  title="No cancelled or declined bookings"
                  subtitle="You don't have any rejected or cancelled reservations on your record."
                />
              ) : (
                <EmptyState
                  icon="🏟️"
                  title="No bookings found"
                  subtitle="You haven't made any turf reservations yet."
                  action={
                    <button type="button" onClick={onFindTurf} style={buttonStyle("primary", "md")}>
                      Find a Turf →
                    </button>
                  }
                />
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {currentList.map(b => {
                const badge = statusBadge(b.status);
                const isUpcoming = ["pending", "confirmed"].includes(b.status) && isUpcomingBooking(b, now);
                const isPast = isPlayedBooking(b, now);
                const isCancelled = ["cancelled", "declined"].includes(b.status);

                return (
                  <article
                    key={b.id}
                    style={{
                      ...panel(),
                      borderRadius: 16,
                      padding: "20px 22px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 16,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Left: Venue & Timing Info */}
                    <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 260 }}>
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: 14,
                        background: V.pitchCardRaised,
                        border: `1px solid ${V.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}>
                        {sportIcon(b.sport)}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <h3 style={{ color: V.chalk, fontWeight: 800, fontSize: 17, margin: 0, fontFamily: FONT_BODY }}>
                            {b.turf}
                          </h3>
                          <span style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: FONT_BODY,
                            background: badge.bg,
                            color: badge.color,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}>
                            <span aria-hidden="true">{badge.glyph}</span>
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ color: V.chalkDim, fontSize: 13, marginTop: 4, fontFamily: FONT_BODY }}>
                          📅 {formatBookingDate(b.bookingDate)} · ⏰ {b.time} · 🏆 {b.sport}
                        </div>
                        {isCancelled && (
                          <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 4, fontFamily: FONT_BODY }}>
                            Slot has been released back to public availability.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Pricing & Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "right", marginRight: 6 }}>
                        <span style={{ color: V.chalkFaint, fontSize: 11, display: "block" }}>Paid Amount</span>
                        <span style={{ color: V.chalk, fontWeight: 800, fontSize: 17, fontFamily: FONT_BODY }}>
                          ₹{b.price}
                        </span>
                      </div>

                      {isUpcoming && (
                        <>
                          <button
                            type="button"
                            onClick={() => onViewQr(b)}
                            style={buttonStyle("secondary", "sm")}
                          >
                            QR Ticket
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancel(b)}
                            style={buttonStyle("danger", "sm")}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {isPast && !b.hasReview && (
                        <button
                          type="button"
                          onClick={() => onReview(b)}
                          style={buttonStyle("primary", "sm")}
                        >
                          Rate Turf
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDispute(b)}
                        style={buttonStyle("ghost", "sm")}
                      >
                        Help & Support
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}

function BookingQrModal({ booking, onClose }) {
  if (!booking) return null;

  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="booking-qr-title" onClick={event => event.stopPropagation()} style={{ ...panel(true), width: "100%", maxWidth: 380, padding: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 id="booking-qr-title" style={{ color: V.chalk, fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 400, margin: 0 }}>Booking QR ticket</h2>
          <button type="button" onClick={onClose} aria-label="Close QR ticket" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: V.chalk }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ color: V.chalkDim, fontFamily: FONT_BODY, fontSize: 14, marginBottom: 16 }}>
          {booking.turf} · {booking.date} · {booking.time}
        </div>
        <div style={{ display: "inline-grid", placeItems: "center", background: V.chalk, padding: 12, borderRadius: 12 }}>
          <BookingQrCode bookingId={booking.id} size={220} />
        </div>
        <div style={{ color: V.chalkFaint, fontSize: 11, fontFamily: FONT_DATA, marginTop: 16, wordBreak: "break-all" }}>
          Booking ID: {booking.id}
        </div>
        {booking.status === "pending" && (
          <p style={{ color: V.pending, fontSize: 12, fontFamily: FONT_BODY, margin: "14px 0 0" }}>
            This booking is awaiting review.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewModal({ booking, profile, supabase, onClose, onReviewed, showToast }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = comment.trim();
    if (!trimmed) {
      showToast("Add a few words about your visit.", { type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turfId: booking.turfId,
          bookingId: booking.id,
          rating,
          comment: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(extractErrorMessage(data, "Couldn't submit your review. Try again."), { type: "error" });
        return;
      }
      showToast("Review submitted. Thanks for sharing your experience.", { type: "success" });
      if (typeof onReviewed === "function") {
        onReviewed(booking.id);
      }
      onClose();
    } catch (err) {
      console.error("review submit network error", err);
      showToast("Network error. Check your connection and try again.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", padding: 16 }}>
      <form role="dialog" aria-modal="true" aria-labelledby="review-title" onSubmit={submit} onClick={e => e.stopPropagation()} style={{ ...panel(true), width: "100%", maxWidth: 460, padding: 24, display: "grid", gap: 16 }}>
        <div>
          <h2 id="review-title" style={{ color: V.chalk, fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 400 }}>Review {booking.turf}</h2>
          <p style={{ color: V.chalkFaint, fontSize: 13, marginTop: 4 }}>{booking.date} · {booking.time}</p>
        </div>
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend style={{ color: V.chalkDim, fontSize: 13, marginBottom: 8 }}>Your rating</legend>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)} style={{ border: 0, background: "transparent", color: value <= rating ? V.flood : V.chalkFaint, fontSize: 26, cursor: "pointer", padding: 2 }}>★</button>)}
          </div>
        </fieldset>
        <label style={{ display: "grid", gap: 7, color: V.chalkDim, fontSize: 13 }}>
          Your review
          <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={4} required style={{ width: "100%", padding: 12, borderRadius: 8, background: V.pitchCardRaised, border: `1px solid ${V.line}`, color: V.chalk, font: `14px ${FONT_BODY}`, resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={buttonStyle("secondary", "sm")}>Cancel</button>
          <button type="submit" disabled={submitting} style={buttonStyle("primary", "sm")}>{submitting ? "Submitting..." : "Submit review"}</button>
        </div>
      </form>
    </div>
  );
}

function DisputeModal({ booking, profile, supabase, onClose, showToast }) {
  const [category, setCategory] = useState("Facility issue");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = details.trim();
    if (!trimmed || trimmed.length < 5) {
      showToast("Describe the issue before submitting (at least 5 characters).", { type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          category,
          details: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(extractErrorMessage(data, "Couldn't submit your issue. Try again."), { type: "error" });
        return;
      }
      showToast(
        data.ticketNumber
          ? `Support ticket ${data.ticketNumber} created. Our team will review your request.`
          : "Issue sent to support.",
        { type: "success" }
      );
      onClose();
    } catch (err) {
      console.error("Dispute submission error", err);
      showToast("Network error. Please check your connection and retry.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", padding: 16 }}>
      <form role="dialog" aria-modal="true" aria-labelledby="dispute-title" onSubmit={submit} onClick={e => e.stopPropagation()} style={{ ...panel(true), width: "100%", maxWidth: 460, padding: 24, display: "grid", gap: 16 }}>
        <div>
          <h2 id="dispute-title" style={{ color: V.chalk, fontSize: 22, fontFamily: FONT_DISPLAY, fontWeight: 400 }}>Report a booking issue</h2>
          <p style={{ color: V.chalkFaint, fontSize: 13, marginTop: 4 }}>{booking.turf} · {booking.date} · ₹{booking.price}</p>
        </div>
        <label style={{ display: "grid", gap: 7, color: V.chalkDim, fontSize: 13 }}>
          Issue type
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 8, background: V.pitchCardRaised, border: `1px solid ${V.line}`, color: V.chalk, fontFamily: FONT_BODY }}>
            {["Facility issue", "Booking or slot", "Payment", "Safety concern", "Other"].map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 7, color: V.chalkDim, fontSize: 13 }}>
          Details
          <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={4} required placeholder="Describe what happened..." style={{ width: "100%", padding: 12, borderRadius: 8, background: V.pitchCardRaised, border: `1px solid ${V.line}`, color: V.chalk, font: `14px ${FONT_BODY}`, resize: "vertical" }} />
        </label>
        <div style={{ color: V.chalkFaint, fontSize: 12 }}>Booking amount: ₹{booking.price}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={buttonStyle("secondary", "sm")}>Cancel</button>
          <button type="submit" disabled={submitting} style={buttonStyle("primary", "sm")}>{submitting ? "Submitting..." : "Send to support"}</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// GUEST PROMPT — shown on tabs that need an account (Dashboard, Loyalty)
// ============================================================
function GuestPrompt({ icon, title, body, router }) {
  return (
    <div style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", ...panel(), borderRadius: 18, padding: "48px 32px" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
        <h2 style={{ color: V.chalk, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 400, margin: "0 0 10px" }}>{title}</h2>
        <p style={{ color: V.chalkDim, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 28px" }}>{body}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => router.push("/signup")} style={buttonStyle("primary", "md")}>Sign up free</button>
          <button onClick={() => router.push("/login")} style={buttonStyle("secondary", "md")}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function PlayerAppClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("home");

  // Periodically trigger backend cleanup of expired sessions
  useEffect(() => {
    // Initial run on mount
    fetch('/api/bookings/close-expired', { method: 'POST' }).catch(console.error);
    const interval = setInterval(() => {
      fetch('/api/bookings/close-expired', { method: 'POST' }).catch(console.error);
    }, 60000); // every 60 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["home", "discover", "matches", "loyalty", "dashboard"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const [bookingTurf, setBookingTurf] = useState(null);
  const [bookingQr, setBookingQr] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [disputeBooking, setDisputeBooking] = useState(null);

  const [turfs, setTurfs] = useState([]);
  const [turfsLoading, setTurfsLoading] = useState(true);
  const [turfsError, setTurfsError] = useState(false);
  const [resumeIntent, setResumeIntent] = useState(null);
  const resumeHandledRef = useRef(false);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchTurfFilter, setMatchTurfFilter] = useState(null);
  const [pendingMatchAction, setPendingMatchAction] = useState({});
  const [resumeMatchCandidate, setResumeMatchCandidate] = useState(null);
  const resumeMatchHandledRef = useRef(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [myBookings, setMyBookings] = useState([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(true);
  const [matchesJoinedCount, setMatchesJoinedCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedMatchIds, setJoinedMatchIds] = useState(new Set());
  const [selectedGameForCheckout, setSelectedGameForCheckout] = useState(null);
  const [matchesError, setMatchesError] = useState("");
  const [joinedGamesList, setJoinedGamesList] = useState([]);

  async function fetchTurfs() {
    const { data, error } = await supabase
      .from("turfs")
      .select("*")
      .eq("status", "live")
      .order("rating", { ascending: false });
    if (error) {
      showToast("Couldn't load turfs. Try refreshing.", { type: "error" });
      setTurfsError(true);
      setTurfsLoading(false);
      return;
    }
    const date = todayStr();
    let availabilityFailed = false;
    const withSlots = await Promise.all((data || []).map(async (t) => {
      const { data: slots, error: slotsError } = await supabase.rpc("turf_slots", { p_turf_id: t.id, p_date: date });
      if (slotsError) {
        availabilityFailed = true;
        console.error(`could not load slot availability for turf ${t.id}`, slotsError);
        return { ...t, location: formatTurfLocation(t.address, t.city), reviews: t.review_count, slots: [], occupancy: 0 };
      }
      // Map raw slots to UI-friendly format
      const rawSlotList = (slots || []).map(s => ({ time: fmtTime(s.slot_time), raw_time: s.slot_time, status: s.status }));
      // Annotate slots with live expiration/closure based on server time
      const serverTime = getTurfCurrentTime();
      const slotList = annotateSlotsWithLiveTime(rawSlotList, date, serverTime);
      const bookedCount = slotList.filter(s => s.status !== "available").length;
      const occupancy = slotList.length ? Math.round((bookedCount / slotList.length) * 100) : 0;
      return { ...t, location: formatTurfLocation(t.address, t.city), reviews: t.review_count, slots: slotList, occupancy };
    }));
    setTurfs(withSlots);
    if (availabilityFailed) {
      showToast("Couldn't load availability for some turfs. Please refresh or try again later.", { type: "error" });
    }
    setTurfsLoading(false);
  }

  async function fetchMatches() {
    setMatchesLoading(true);
    setMatchesError("");
    try {
      const res = await fetch("/api/player/games");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMatchesError(json.error || "Could not load community games.");
        setMatchesLoading(false);
        return;
      }
      const raw = json.games || [];
      setMatches(raw.map(m => ({
        id: m.id,
        title: m.title || `${m.sport} Game`,
        description: m.description || "",
        sport: m.sport,
        turf: m.turf_name || "Turf",
        turf_name: m.turf_name || "Turf",
        turf_city: m.turf_city || "",
        turf_address: m.turf_address || "",
        turf_id: m.turf_id,
        time: fmtTime(m.start_time),
        start_time: m.start_time,
        end_time: m.end_time || m.start_time,
        date: formatBookingDate(m.date),
        raw_date: m.date,
        players: m.participant_count,
        max: m.max_players,
        spots_left: m.spots_left,
        skill: m.skill || "Any",
        price_per_player: Number(m.price_per_player || 0),
        status: m.status,
        is_full: m.is_full,
      })));
    } catch (err) {
      console.error("fetchMatches error:", err);
      setMatchesError("Couldn't load matches. Check your connection.");
    } finally {
      setMatchesLoading(false);
    }
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase.from("leaderboard").select("*").order("rank").limit(10);
    if (error) {
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboard((data || []).map(p => ({
      rank: p.rank,
      name: p.player_id === profile?.id ? "You" : (p.full_name || "Player"),
      points: p.points,
      isYou: p.player_id === profile?.id,
    })));
    setLeaderboardLoading(false);
  }

  async function fetchMyBookings() {
    if (!profile?.id) { setMyBookingsLoading(false); return; }
    const { data, error } = await supabase
      .from("bookings")
      .select("*, turf:turfs(name)")
      .eq("player_id", profile.id)
      .is("archived_at", null)
      .order("booking_date", { ascending: true });
    if (error) {
      showToast("Couldn't load your bookings. Try refreshing.", { type: "error" });
      setMyBookingsLoading(false);
      return;
    }

    // Fetch existing review booking_ids so we can hide the "Rate Turf" button
    // for bookings that have already been reviewed.
    let reviewedBookingIds = new Set();
    if ((data || []).length > 0) {
      const bookingIds = (data || []).map(b => b.id);
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id", bookingIds);
      reviewedBookingIds = new Set((reviewRows || []).map(r => r.booking_id));
    }

    setMyBookings((data || []).map(b => ({
      id: b.id,
      turfId: b.turf_id,
      turf: b.turf?.name || "Turf",
      date: formatBookingDate(b.booking_date),
      bookingDate: b.booking_date,
      time: fmtTime(b.start_time),
      sport: b.sport,
      price: Number(b.price),
      status: b.status,
      hasReview: reviewedBookingIds.has(b.id),
    })));
    setMyBookingsLoading(false);

    const { count } = await supabase
      .from("match_participants")
      .select("id", { count: "exact", head: true })
      .eq("player_id", profile.id);
    setMatchesJoinedCount(count || 0);
  }

  async function fetchNotifications() {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) {
      setNotifications(data || []);
    }
  }

  async function fetchJoinedMatches() {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("match_participants")
      .select("id, match_id, amount_paid, payment_status, payment_id, created_at, match:matches(*, turf:turfs(name, city, address))")
      .eq("player_id", profile.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setJoinedGamesList(data);
      setJoinedMatchIds(new Set(data.map(r => r.match_id)));
      setMatchesJoinedCount(data.length);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!profile?.id || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;

    const { error } = await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    if (error) {
      showToast("Couldn't mark notifications as read.", { type: "error" });
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      await handleMarkAllRead();
    }
  };

  const handleLeaveMatch = async (match) => {
    if (!match?.id || !profile?.id) return;
    if (pendingMatchAction[match.id]) return;

    setPendingMatchAction(prev => ({ ...prev, [match.id]: "leave" }));
    try {
      const { error } = await supabase
        .from("match_participants")
        .delete()
        .eq("match_id", match.id)
        .eq("player_id", profile.id);

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("network") || msg.includes("timeout") || msg.includes("connection")) {
          showToast("Connection failed. Please try again.", { type: "error" });
        } else {
          showToast("Couldn't leave the match. Please try again.", { type: "error" });
        }
        return;
      }

      showToast(`Left "${match.sport} Match" at ${match.turf}.`, { type: "info" });
      await Promise.all([fetchMatches(), fetchJoinedMatches()]);
    } catch (err) {
      console.error("handleLeaveMatch exception:", err);
      showToast("Connection failed. Please try again.", { type: "error" });
    } finally {
      setPendingMatchAction(prev => {
        const next = { ...prev };
        delete next[match.id];
        return next;
      });
    }
  };

  useEffect(() => {
    fetchTurfs();
    fetchMatches();
    if (profile?.id) fetchLeaderboard(); else setLeaderboardLoading(false);
    fetchMyBookings();
    fetchNotifications();
    fetchJoinedMatches();

    // Live slot/match/notification updates: when anyone books a slot,
    // joins a match, or a new notification arrives, refresh so every open
    // tab reflects it without a manual reload.
    const channel = supabase
      .channel("player-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchTurfs();
        fetchMyBookings();
        fetchNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_participants" }, () => { fetchMatches(); fetchJoinedMatches(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile?.id}` }, (payload) => {
        fetchNotifications();
        if (payload?.new?.title && !showNotifications) {
          showToast(formatNotificationTitle(payload.new.title), { type: "info" });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${profile?.id}` }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const isTabLoading = (tab) => {
    if (tab === "discover") return turfsLoading;
    if (tab === "matches") return matchesLoading;
    if (tab === "loyalty") return leaderboardLoading;
    if (tab === "dashboard") return myBookingsLoading;
    return false;
  };

  const handleBook = (turf) => {
    if (!profile?.id) {
      // Remember what the guest wanted so sign-up / sign-in can bring them back to it.
      const intent = { turfId: turf.id, turfName: turf.name, sport: turf.sports?.[0] || "" };
      saveBookingIntent(intent);
      const encoded = encodeBookingIntent(intent);
      router.push(encoded ? `/signup?bookingIntent=${encoded}` : "/signup");
      return;
    }
    setBookingTurf(turf);
  };
  const handleBookingClose = () => { setBookingTurf(null); setResumeIntent(null); };

  // Resume a booking started before authentication. This only RE-OPENS the
  // booking modal: nothing is created or paid until the user confirms there.
  useEffect(() => {
    if (resumeHandledRef.current || turfsLoading || !profile?.id) return;
    resumeHandledRef.current = true; // one attempt per page load (refresh-safe)

    const params = new URLSearchParams(window.location.search);
    const intent = decodeBookingIntent(params.get("resumeBooking")) || getStoredBookingIntent();
    if (!intent) return;

    // Consume it so refresh / back / re-opened callbacks never replay it.
    clearStoredBookingIntent();
    if (params.has("resumeBooking")) {
      params.delete("resumeBooking");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }

    setActiveTab("discover");
    if (turfsError) {
      showToast("We couldn't reload turfs to restore your booking. Please pick your turf again.", { type: "info" });
      return;
    }
    const turf = turfs.find((t) => t.id === intent.turfId);
    if (!turf) {
      showToast("That turf is no longer available for booking. Your booking has not been made. Browse other turfs to continue.", { type: "info" });
      return;
    }
    setResumeIntent(intent);
    setBookingTurf(turf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turfsLoading, turfsError, profile?.id, turfs]);

  // Resume a match joined before authentication. This prompts the user with
  // latest availability and lets them confirm explicitly.
  useEffect(() => {
    if (resumeMatchHandledRef.current || matchesLoading || !profile?.id) return;

    const params = new URLSearchParams(window.location.search);
    const resumeParam = params.get("resumeMatch");
    const intent = decodeMatchIntent(resumeParam) || getStoredMatchIntent();
    if (!intent) return;

    resumeMatchHandledRef.current = true;
    clearStoredMatchIntent();
    if (params.has("resumeMatch")) {
      params.delete("resumeMatch");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }

    setActiveTab("matches");
    if (matchesLoading) return;

    const targetMatch = matches.find(m => m.id === intent.matchId);
    if (!targetMatch) {
      showToast("That game is no longer open or available.", { type: "info" });
      return;
    }

    if (joinedMatchIds.has(targetMatch.id)) {
      showToast("You've already joined this game.", { type: "info" });
      return;
    }

    setResumeMatchCandidate(targetMatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchesLoading, profile?.id, matches, joinedMatchIds]);

  const handleJoin = (match) => {
    if (!match?.id) return;

    if (!profile?.id) {
      const intent = {
        matchId: match.id,
        sport: match.sport,
        turfName: match.turf,
        turfId: match.turf_id,
        date: match.date,
        time: match.time,
        action: "join",
      };
      saveMatchIntent(intent);
      const encoded = encodeMatchIntent(intent);
      router.push(encoded ? `/signup?matchIntent=${encoded}` : "/signup");
      return;
    }

    setSelectedGameForCheckout(match);
  };

  const handleBookingConfirmed = () => {
    handleBookingClose();
    showToast("Booking confirmed. Your QR ticket is available in your dashboard.", { type: "success" });
    fetchTurfs();
    fetchMyBookings();
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (profile?.full_name || profile?.email || "P").trim().charAt(0).toUpperCase();

  const TABS = [
    { id: "home", label: "Home", icon: "home" },
    { id: "discover", label: "Discover", icon: "search" },
    { id: "matches", label: "Matches", icon: "lightning" },
    { id: "teams", label: "Teams", icon: "users" },
    { id: "tournaments", label: "Tournaments", icon: "trophy" },
    { id: "packages", label: "Passes", icon: "star" },
    { id: "loyalty", label: "Rewards", icon: "trending" },
    { id: "dashboard", label: "Dashboard", icon: "calendar" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${V.pitch}; }
        ::-webkit-scrollbar-thumb { background: ${V.flood}; border-radius: 2px; }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input::placeholder { color: ${V.chalkFaint}; }

        /* Exactly one nav renders at a time: top bar on desktop, tab bar on mobile. */
        .vt-top-nav { display: flex; }
        .vt-bottom-nav { display: none; }
        .vt-mobile-topbar { display: none; }
        @media (max-width: 767px) {
          .vt-top-nav { display: none !important; }
          .vt-bottom-nav { display: flex !important; }
          .vt-mobile-topbar { display: flex !important; }
          .vt-main-content { padding-top: 56px !important; padding-bottom: calc(max(var(--vt-bottom-nav-h, 72px), env(safe-area-inset-bottom, 0px)) + 24px) !important; }
        }
      `}</style>

      <div className="vt-player-app" style={{
        minHeight: "100vh",
        backgroundColor: V.pitch,
        color: V.chalk,
        fontFamily: FONT_BODY,
        position: "relative",
      }}>
        {/* SLIM TOP BAR (Mobile only) — the bottom tab bar is all navigation,
            so account actions (notifications, sign out) live here instead. */}
        <div className="vt-mobile-topbar" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V.line}`,
          padding: "0 16px", height: 56,
          alignItems: "center", justifyContent: "space-between",
        }}>
          <BrandLockup markSize={34} compact />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {profile?.id ? (
              <>
                <button onClick={toggleNotifications} aria-label="Notifications" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <Icon name="notification" size={15} />
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -2, minWidth: 14, height: 14, padding: "0 4px", borderRadius: 999, background: V.flood, color: "#ffffff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button onClick={() => router.push("/settings")} aria-label="Account settings" title="Account settings" className="vt-mobile-account-button" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "6px 9px", cursor: "pointer", color: V.chalk, fontSize: 11, fontWeight: 700, fontFamily: FONT_BODY }}>
                  {initial}
                </button>
                <button onClick={handleSignOut} aria-label="Sign out" title="Sign out" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: V.chalkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="logout" size={15} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: V.chalk, fontSize: 12.5, fontWeight: 700, fontFamily: FONT_BODY }}>
                  Sign in
                </button>
                <button onClick={() => router.push("/signup")} style={{ background: V.flood, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#ffffff", fontSize: 12.5, fontWeight: 800, fontFamily: FONT_BODY }}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        {/* TOP NAV (Desktop) */}
        <nav className="vt-top-nav" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V.line}`,
          padding: "0 32px",
          height: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <BrandLockup markSize={46} />

          {/* Desktop Nav */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((tab, index) => (
              <button key={tab.id} onClick={() => { if (tab.id === "matches") setMatchTurfFilter(null); setActiveTab(tab.id); }} style={{
                padding: "8px 16px", borderRadius: 8,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${V.flood}` : "2px solid transparent",
                color: activeTab === tab.id ? V.flood : V.chalkDim,
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                transition: "color 0.2s, border-color 0.2s", fontFamily: FONT_BODY,
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            {profile?.id ? (
              <>
                <button onClick={toggleNotifications} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: V.chalk, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <Icon name="notification" size={16} />
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -2, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 999, background: V.flood, color: "#ffffff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button onClick={handleSignOut} title="Sign out" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: V.chalkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="logout" size={16} />
                </button>
                <button onClick={() => router.push("/settings")} title="Account settings" aria-label="Account settings" style={{ width: 36, height: 36, borderRadius: 8, background: V.flood, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#ffffff", fontFamily: FONT_BODY, cursor: "pointer" }}>
                  {initial}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/login")} style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 10, padding: "9px 16px", cursor: "pointer", color: V.chalk, fontSize: 13.5, fontWeight: 700, fontFamily: FONT_BODY }}>
                  Sign in
                </button>
                <button onClick={() => router.push("/signup")} style={{ background: V.flood, border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", color: "#ffffff", fontSize: 13.5, fontWeight: 800, fontFamily: FONT_BODY }}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </nav>
        <SmartNotificationCenter
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAll={handleMarkAllRead}
          onMarkOne={async (id) => {
            await supabase.from("notifications").update({ read: true }).eq("id", id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
          }}
          emptyText="Your booking updates, game reminders, and venue notices will show up here."
        />

        {/* MAIN CONTENT */}
        <main className="vt-main-content" style={{ paddingTop: 64, paddingBottom: 80 }}>
          {activeTab === "home" && (
            <>
              <HeroSection
                onExplore={(query) => { setSearchQuery(query || ""); setActiveTab("discover"); }}
                venueCount={turfs.length}
                isLoading={turfsLoading}
              />
              <section className="vt-home-promo">
                <div className="vt-home-promo-icon" aria-hidden="true">↗</div>
                <div className="vt-home-promo-copy">
                  <span className="vt-section-eyebrow">READY TO PLAY?</span>
                  <strong>Gather the squad. We&apos;ll sort the ground.</strong>
                  <p>Compare turfs, pick a time, and book. Your game is set in a few taps.</p>
                </div>
                <button className="vt-home-promo-button" onClick={() => setActiveTab("discover")}>
                  See all turfs <span aria-hidden="true">→</span>
                </button>
              </section>
            </>
          )}
          {activeTab === "discover" && (
            <DiscoverSection
              turfs={turfs}
              onBook={handleBook}
              onMatch={(turf) => {
                setMatchTurfFilter(turf.id);
                setActiveTab("matches");
              }}
              isLoading={isTabLoading("discover")}
              initialSearch={searchQuery}
            />
          )}
          {activeTab === "matches" && (
            <MatchmakingSection
              matches={matches}
              turfs={turfs}
              onJoin={handleJoin}
              onLeave={handleLeaveMatch}
              onFindTurf={() => setActiveTab("discover")}
              isLoading={isTabLoading("matches")}
              fetchError={matchesError}
              onRefresh={fetchMatches}
              joinedMatchIds={joinedMatchIds}
              turfFilter={matchTurfFilter}
              turfName={turfs.find(t => t.id === matchTurfFilter)?.name || matches.find(m => m.turf_id === matchTurfFilter)?.turf || ""}
              onClearTurfFilter={() => setMatchTurfFilter(null)}
              pendingMatchAction={pendingMatchAction}
            />
          )}
          {activeTab === "teams" && (profile?.id
            ? <TeamsSection profile={profile} showToast={showToast} onSelectTeamForBooking={() => setActiveTab("discover")} />
            : <GuestPrompt icon="👥" title="Team management lives here" body="Sign up to create teams, invite teammates, and book venues together." router={router} />
          )}
          {activeTab === "tournaments" && (
            <TournamentsSection profile={profile} showToast={showToast} />
          )}
          {activeTab === "packages" && (
            <PackagesSection profile={profile} showToast={showToast} />
          )}
          {activeTab === "loyalty" && (profile?.id
            ? <LoyaltySection isLoading={isTabLoading("loyalty") || myBookingsLoading} leaderboard={leaderboard} myPoints={leaderboard.find(p => p.isYou)?.points ?? 0} gamesPlayed={myBookings.filter((booking) => isPlayedBooking(booking)).length} />
            : <GuestPrompt icon="🏆" title="Track your rewards" body="Sign up to earn loyalty points on every booking and see where you rank." router={router} />
          )}
          {activeTab === "dashboard" && (profile?.id
            ? <DashboardSection
                isLoading={isTabLoading("dashboard")}
                bookings={myBookings}
                matchesJoined={matchesJoinedCount}
                joinedGames={joinedGamesList}
                onCancel={setCancellingBooking}
                onReview={setReviewBooking}
                onDispute={setDisputeBooking}
                onViewQr={setBookingQr}
                onFindTurf={() => setActiveTab("discover")}
                onFindGames={() => setActiveTab("matches")}
                onViewGame={(g) => setSelectedGameForCheckout(g)}
              />
            : <GuestPrompt icon="📅" title="Your dashboard lives here" body="Sign up to see your bookings, track spend, and manage upcoming games." router={router} />
          )}
        </main>

        {/* BOTTOM TAB BAR (Mobile feel) */}
        <nav className="vt-bottom-nav" aria-label="Primary navigation" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${V.line}`,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "6px 8px 10px",
          gap: 4,
        }}>
          {TABS.map((tab, index) => (
            <button key={tab.id} onClick={() => { if (tab.id === "matches") setMatchTurfFilter(null); setActiveTab(tab.id); }} aria-current={activeTab === tab.id ? "page" : undefined} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 10px", borderRadius: 10, flexShrink: 0,
              minWidth: 54,
              color: activeTab === tab.id ? V.flood : V.chalkFaint,
              transition: "color 0.2s",
            }}>
              <Icon name={tab.icon} size={20} color={activeTab === tab.id ? V.flood : V.chalkFaint} />
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: V.flood }} />
              )}
            </button>
          ))}
        </nav>

        {/* BOOKING MODAL */}
        {bookingTurf && (
          <BookingModal
            turf={bookingTurf}
            profile={profile}
            supabase={supabase}
            onClose={handleBookingClose}
            onConfirm={handleBookingConfirmed}
            onGoToDashboard={() => setActiveTab("dashboard")}
            showToast={showToast}
            resume={resumeIntent}
          />
        )}
        {selectedGameForCheckout && (
          <GameDetailsModal
            game={selectedGameForCheckout}
            profile={profile}
            onClose={() => setSelectedGameForCheckout(null)}
            onConfirmed={() => {
              fetchMatches();
              fetchJoinedMatches();
              fetchMyBookings();
            }}
            onGoToDashboard={() => setActiveTab("dashboard")}
            showToast={showToast}
          />
        )}
        {cancellingBooking && (
          <CancelBookingModal
            booking={cancellingBooking}
            onClose={() => setCancellingBooking(null)}
            onCancelled={() => {
              fetchMyBookings();
              fetchTurfs();
            }}
            showToast={showToast}
          />
        )}
        {reviewBooking && (
          <ReviewModal
            booking={reviewBooking}
            profile={profile}
            supabase={supabase}
            onClose={() => setReviewBooking(null)}
            onReviewed={(bId) => {
              setMyBookings(prev => prev.map(b => b.id === bId ? { ...b, hasReview: true } : b));
              fetchMyBookings();
            }}
            showToast={showToast}
          />
        )}
        {disputeBooking && <DisputeModal booking={disputeBooking} profile={profile} supabase={supabase} onClose={() => setDisputeBooking(null)} showToast={showToast} />}
        {resumeMatchCandidate && (
          <ResumeMatchModal
            match={resumeMatchCandidate}
            isPending={Boolean(pendingMatchAction[resumeMatchCandidate.id])}
            onClose={() => setResumeMatchCandidate(null)}
            onConfirm={(m) => {
              setResumeMatchCandidate(null);
              handleJoin(m);
            }}
          />
        )}

        {/* Real-time indicator */}
        <div className="vt-live-indicator" style={{
          position: "fixed", bottom: 76, right: 20, zIndex: 800,
          background: V.pitchCardRaised, border: `1px solid ${V.flood}44`,
          borderRadius: 50, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: V.flood, display: "block" }} />
          <span style={{ color: V.flood, fontSize: 11, fontWeight: 700, fontFamily: FONT_DATA }}>LIVE</span>
        </div>
      </div>
    </>
  );
}
