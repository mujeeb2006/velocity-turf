"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: { accent: "#22C55E", glyph: "✓" },
  error: { accent: "#EF4444", glyph: "✕" },
  info: { accent: "#0EA5E9", glyph: "i" },
  warning: { accent: "#F97316", glyph: "!" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const type = opts.type || "info";
    const duration = opts.duration ?? 4000;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: components can still call showToast without crashing
    // the app if a page ever renders outside the provider.
    return { showToast: () => {}, dismiss: () => {} };
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 4000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(13,21,38,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${s.accent}55`,
              borderLeft: `3px solid ${s.accent}`,
              borderRadius: 14,
              padding: "12px 16px",
              minWidth: 260,
              maxWidth: 420,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              fontFamily: "'Exo 2', sans-serif",
              animation: "toastIn 0.25s ease",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: s.accent + "22",
                color: s.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 11,
                flexShrink: 0,
              }}
            >
              {s.glyph}
            </span>
            <span style={{ flex: 1, color: "#fff", fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>
              {t.message}
            </span>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: 2,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
