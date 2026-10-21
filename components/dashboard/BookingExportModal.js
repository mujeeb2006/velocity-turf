"use client";

import { useState } from "react";
import { COLORS as V } from "@/lib/design-tokens";
import { Btn, Modal, inputStyle, labelStyle, font } from "@/components/dashboard/kit";

export async function triggerExcelDownload(url, fallbackFilename = "velocity-turf-bookings.xlsx") {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = "Failed to export Excel report.";
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  let filename = fallbackFilename;
  const disposition = res.headers.get("content-disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * Modal dialog for Turf Owners to export their turf bookings to Excel.
 */
export function OwnerBookingExportModal({ turfs = [], onClose, showToast }) {
  const [turfId, setTurfId] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePreset = (preset) => {
    setDatePreset(preset);
    setErrorMsg("");
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      const t = fmt(today);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(fmt(past));
      setEndDate(fmt(today));
    } else if (preset === "thisMonth") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(first));
      setEndDate(fmt(today));
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleExport = async () => {
    setErrorMsg("");
    if (datePreset === "custom") {
      if (startDate && endDate && startDate > endDate) {
        setErrorMsg("Start date cannot be after end date.");
        return;
      }
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (turfId) params.set("turfId", turfId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "all") params.set("status", status);

      const url = `/api/owner/bookings/export?${params.toString()}`;
      await triggerExcelDownload(url, `velocity-turf-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);

      showToast?.("Excel report downloaded successfully.", "success");
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to download Excel report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal title="Export Bookings to Excel (.xlsx)" onClose={onClose} width={480}>
      <div style={{ display: "grid", gap: 18, fontFamily: font }}>
        <p style={{ margin: 0, fontSize: 13, color: V.chalkDim, lineHeight: 1.5 }}>
          Export authoritative booking records for your turfs. The Excel spreadsheet will include player details, slot times, payment records, and fee breakdowns.
        </p>

        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: V.danger,
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div>
          <label style={labelStyle}>Select Turf</label>
          <select
            value={turfId}
            onChange={(e) => setTurfId(e.target.value)}
            style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
          >
            <option value="">All My Turfs ({turfs.length})</option>
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.city ? `(${t.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Date Range</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              { id: "all", label: "All Time" },
              { id: "thisMonth", label: "This Month" },
              { id: "last30", label: "Last 30 Days" },
              { id: "today", label: "Today" },
              { id: "custom", label: "Custom Dates" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${datePreset === p.id ? V.aqua : V.lineStrong}`,
                  background: datePreset === p.id ? "rgba(45,212,191,0.15)" : V.pitchCard,
                  color: datePreset === p.id ? V.aqua : V.chalkDim,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: V.chalkFaint, display: "block", marginBottom: 4 }}>From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: V.chalkFaint, display: "block", marginBottom: 4 }}>To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Booking Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
          >
            <option value="all">All Statuses (Confirmed, Completed, Cancelled, Declined)</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="completed">Completed Only</option>
            <option value="cancelled">Cancelled Only</option>
            <option value="declined">Declined Only</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose} disabled={exporting}>
            Cancel
          </Btn>
          <Btn variant="primary" icon="download" busy={exporting} onClick={handleExport}>
            {exporting ? "Generating Excel…" : "Download Excel (.xlsx)"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal dialog for Administrators to export all bookings across turfs to Excel.
 */
export function AdminBookingExportModal({ turfs = [], owners = [], onClose, showToast }) {
  const [turfId, setTurfId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePreset = (preset) => {
    setDatePreset(preset);
    setErrorMsg("");
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      const t = fmt(today);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(fmt(past));
      setEndDate(fmt(today));
    } else if (preset === "thisMonth") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(first));
      setEndDate(fmt(today));
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleExport = async () => {
    setErrorMsg("");
    if (datePreset === "custom") {
      if (startDate && endDate && startDate > endDate) {
        setErrorMsg("Start date cannot be after end date.");
        return;
      }
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (turfId) params.set("turfId", turfId);
      if (ownerId) params.set("ownerId", ownerId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status && status !== "all") params.set("status", status);
      if (paymentStatus && paymentStatus !== "all") params.set("paymentStatus", paymentStatus);

      const url = `/api/admin/bookings/export?${params.toString()}`;
      await triggerExcelDownload(url, `velocity-turf-all-bookings-admin-${new Date().toISOString().slice(0, 10)}.xlsx`);

      showToast?.("Consolidated Excel report downloaded successfully.", "success");
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to download admin Excel report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal title="Export All Bookings to Excel (.xlsx)" onClose={onClose} width={520}>
      <div style={{ display: "grid", gap: 16, fontFamily: font }}>
        <p style={{ margin: 0, fontSize: 13, color: V.chalkDim, lineHeight: 1.5 }}>
          Consolidated system-wide export across all turfs, owners, and players. Output includes customer details, payment references, slot times, and dynamic pricing records.
        </p>

        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: V.danger,
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Filter by Turf</label>
            <select
              value={turfId}
              onChange={(e) => setTurfId(e.target.value)}
              style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
            >
              <option value="">All Turfs ({turfs.length})</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Filter by Owner</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
            >
              <option value="">All Owners ({owners.length})</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name || o.email || o.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Date Range</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              { id: "all", label: "All Time" },
              { id: "thisMonth", label: "This Month" },
              { id: "last30", label: "Last 30 Days" },
              { id: "today", label: "Today" },
              { id: "custom", label: "Custom Dates" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${datePreset === p.id ? V.floodButton : V.lineStrong}`,
                  background: datePreset === p.id ? "rgba(99,102,241,0.15)" : V.pitchCard,
                  color: datePreset === p.id ? V.floodButton : V.chalkDim,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: V.chalkFaint, display: "block", marginBottom: 4 }}>From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: V.chalkFaint, display: "block", marginBottom: 4 }}>To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Booking Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              style={{ ...inputStyle, width: "100%", background: V.pitchCard }}
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid (Confirmed / Completed)</option>
              <option value="refunded">Refunded (Cancelled / Declined)</option>
              <option value="pending">Pending Payment</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={exporting}>
            Cancel
          </Btn>
          <Btn variant="primary" icon="download" busy={exporting} onClick={handleExport}>
            {exporting ? "Generating Excel…" : "Download Excel (.xlsx)"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
