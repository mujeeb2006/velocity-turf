"use client";

import { useState, useEffect } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { Btn, Modal, font, inputStyle, labelStyle } from "@/components/dashboard/kit";
import { formatNotificationBody, formatNotificationTitle, relativeTime } from "@/lib/dashboard/format";

export function SmartNotificationCenter({
  open,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAll,
  onMarkOne,
  emptyText = "No notifications yet.",
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState({
    in_app: true,
    email: true,
    whatsapp: false,
    reminders_24h: true,
    reminders_2h: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      fetch("/api/notifications/preferences")
        .then((r) => r.json())
        .then((data) => {
          if (data.preferences) setPrefs(data.preferences);
        })
        .catch(() => {});
    }
  }, [open]);

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setShowPreferences(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrefs(false);
    }
  }

  if (!open) return null;

  const categories = [
    { id: "all", label: "All" },
    { id: "bookings", label: "Bookings" },
    { id: "facility", label: "Facility" },
    { id: "payments", label: "Payments" },
  ];

  const filtered = notifications.filter((n) => {
    if (unreadOnly && n.read) return false;
    if (selectedCategory !== "all" && n.category && n.category !== selectedCategory) return false;
    return true;
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 899 }} />
      <div
        className="vt-notif-panel"
        role="dialog"
        aria-label="Smart Notification Center"
        style={{
          position: "fixed",
          zIndex: 1000,
          width: "min(420px, calc(100vw - 32px))",
          maxHeight: 560,
          display: "flex",
          flexDirection: "column",
          background: V.pitchCard,
          border: `1px solid ${V.line}`,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${V.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: V.pitchCard,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: V.chalk, display: "flex", alignItems: "center", gap: 8 }}>
              Smart Notification Center
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, background: V.pending, color: "#fff", padding: "1px 7px", borderRadius: 10 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ color: V.chalkFaint, fontSize: 11.5, marginTop: 2 }}>
              Bookings, reminders & facility notifications
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              title="Channel Preferences & Reminders"
              style={{
                background: "transparent",
                border: `1px solid ${V.line}`,
                borderRadius: 8,
                color: V.chalkDim,
                padding: "6px 9px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ⚙️ Preferences
            </button>
            {unreadCount > 0 && (
              <Btn size="sm" onClick={onMarkAll}>
                Mark all read
              </Btn>
            )}
          </div>
        </div>

        {/* Category Pills & Filters */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${V.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontFamily: font,
                    fontWeight: active ? 700 : 500,
                    background: active ? V.floodDim : "transparent",
                    color: active ? V.flood : V.chalkDim,
                    border: `1px solid ${active ? V.flood + "66" : "transparent"}`,
                    cursor: "pointer",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: V.chalkDim, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 180 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: V.chalkFaint, fontSize: 13 }}>
              {emptyText}
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                className="vt-row vt-row-click"
                onClick={() => {
                  if (!n.read && onMarkOne) onMarkOne(n.id);
                  if (n.link) window.location.href = n.link;
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 18px",
                  border: 0,
                  borderBottom: `1px solid ${V.line}`,
                  background: n.read ? "transparent" : V.floodDim,
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ color: V.chalk, fontWeight: n.read ? 600 : 750, fontSize: 13, marginBottom: 3 }}>
                    {formatNotificationTitle(n.title)}
                  </div>
                  {!n.read && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: V.flood, flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>

                {n.body && (
                  <div style={{ color: V.chalkDim, fontSize: 12.5, lineHeight: 1.45 }}>
                    {formatNotificationBody(n.title, n.body)}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, fontSize: 10.5, color: V.chalkFaint }}>
                  <span>{relativeTime(n.created_at)}</span>
                  {n.delivery_status && (
                    <span style={{ textTransform: "uppercase", fontSize: 9.5, opacity: 0.8 }}>
                      ● {n.delivery_status}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <Modal
          title="Notification Channels & Reminders"
          subtitle="Configure in-app, email, WhatsApp, and smart booking reminders"
          onClose={() => setShowPreferences(false)}
          maxWidth={460}
          footer={
            <>
              <Btn onClick={() => setShowPreferences(false)} disabled={savingPrefs}>Close</Btn>
              <Btn variant="primary" busy={savingPrefs} onClick={handleSavePreferences}>Save Preferences</Btn>
            </>
          }
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12.5, color: V.chalkDim }}>
              Configure your preferred delivery channels. In-app alerts are primary; external channels require configured integration.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${V.line}` }}>
                <input
                  type="checkbox"
                  checked={prefs.in_app}
                  onChange={(e) => setPrefs((p) => ({ ...p, in_app: e.target.checked }))}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: V.chalk }}>In-App Notifications</div>
                  <div style={{ fontSize: 11.5, color: V.chalkDim }}>Receive real-time alerts inside the dashboard</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${V.line}` }}>
                <input
                  type="checkbox"
                  checked={prefs.email}
                  onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.checked }))}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: V.chalk }}>Email Notifications</div>
                  <div style={{ fontSize: 11.5, color: V.chalkDim }}>Send booking and account updates to your verified email</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${V.line}` }}>
                <input
                  type="checkbox"
                  checked={prefs.whatsapp}
                  onChange={(e) => setPrefs((p) => ({ ...p, whatsapp: e.target.checked }))}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: V.chalk }}>WhatsApp Updates (Optional)</div>
                  <div style={{ fontSize: 11.5, color: V.chalkDim }}>Receive booking alerts when WhatsApp provider is connected</div>
                </div>
              </label>
            </div>

            <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: 12 }}>
              <span style={labelStyle}>Automated Booking Reminders</span>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={prefs.reminders_24h}
                    onChange={(e) => setPrefs((p) => ({ ...p, reminders_24h: e.target.checked }))}
                  />
                  <span style={{ fontSize: 13, color: V.chalk }}>24 hours before match kickoff</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={prefs.reminders_2h}
                    onChange={(e) => setPrefs((p) => ({ ...p, reminders_2h: e.target.checked }))}
                  />
                  <span style={{ fontSize: 13, color: V.chalk }}>2 hours before match kickoff</span>
                </label>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

