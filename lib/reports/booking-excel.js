import ExcelJS from "exceljs";

/**
 * Calculates slot end time given a start time.
 * Turf booking slots in Velocity Turf have a 1-hour duration.
 *
 * @param {string} startTime e.g. "06:00:00" or "18:00"
 * @returns {string} e.g. "07:00" or "19:00"
 */
export function calculateEndTime(startTime) {
  if (!startTime || typeof startTime !== "string") return "N/A";
  const parts = startTime.split(":");
  if (parts.length < 2) return startTime;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] || "00";
  if (isNaN(hour)) return startTime;
  hour = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:${minute.slice(0, 2)}`;
}

/**
 * Formats time to HH:mm string.
 */
export function formatTimeSlot(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "N/A";
  return timeStr.slice(0, 5);
}

/**
 * Maps booking status to human-readable booking status.
 */
export function formatBookingStatus(status) {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return "Declined";
    case "pending":
      return "Pending";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  }
}

/**
 * Maps booking status to authoritative payment status.
 * In Velocity Turf, bookings confirmed upon slot selection are paid.
 * Cancelled or declined bookings are refunded.
 */
export function mapPaymentStatus(status) {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "confirmed":
      return "Paid";
    case "completed":
      return "Paid (Completed)";
    case "cancelled":
      return "Refunded";
    case "declined":
      return "Refunded";
    case "pending":
      return "Pending Payment";
    default:
      return "N/A";
  }
}

/**
 * Normalizes date to YYYY-MM-DD.
 */
export function formatDate(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(dateVal);
  }
}

/**
 * Formats full timestamp to YYYY-MM-DD HH:mm:ss.
 */
export function formatDateTime(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return String(dateVal);
  }
}

/**
 * Formats a single booking record into the authoritative export row object.
 *
 * @param {Object} booking Database booking record
 * @param {Map<string, string>} idempotencyKeyMap Map of bookingId -> idempotencyKey
 * @returns {Object} Structured booking row
 */
export function formatBookingExportRow(booking, idempotencyKeyMap = new Map()) {
  const player = booking.player || {};
  const turf = booking.turf || {};
  const owner = turf.owner || {};

  const bookingId = booking.id || "N/A";
  const startTime = formatTimeSlot(booking.start_time);
  const endTime = calculateEndTime(startTime);
  const status = booking.status || "confirmed";
  const paymentStatus = mapPaymentStatus(status);
  const amount = Number(booking.price ?? 0);

  // Reference / Transaction ID: check idempotency map or fallback
  const refId = idempotencyKeyMap.get(booking.id) || "N/A";

  // Location string: address, city
  const locationParts = [turf.address, turf.city].filter(Boolean);
  const turfLocation = locationParts.length > 0 ? locationParts.join(", ") : "N/A";

  return {
    bookingId,
    bookingType: "Instant Booking",
    bookingStatus: formatBookingStatus(status),
    paymentStatus,
    bookingDate: formatDate(booking.booking_date),
    startTime,
    endTime,
    sport: booking.sport || "General",
    amount,
    turfName: turf.name || "Unknown Turf",
    turfLocation,
    ownerName: owner.full_name || owner.email || "Unknown Owner",
    playerName: player.full_name || "Guest Player",
    playerEmail: player.email || "N/A",
    playerContact: player.phone || "N/A",
    referenceId: refId,
    createdAt: formatDateTime(booking.created_at),
  };
}

/**
 * Builds a styled, validated Excel (.xlsx) workbook for bookings.
 *
 * @param {Object} options
 * @param {Array} options.bookings List of raw booking records from DB
 * @param {Map<string, string>} [options.idempotencyKeyMap] Map of booking.id -> key
 * @param {string} [options.scopeTitle] e.g. "Admin Consolidated" or owner's turf name
 * @param {string} [options.generatedBy] Role or user name
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function buildBookingExcelWorkbook({
  bookings = [],
  idempotencyKeyMap = new Map(),
  scopeTitle = "All Turfs",
  generatedBy = "System",
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Velocity Turf System";
  workbook.lastModifiedBy = generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Turf Bookings", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 4, showGridLines: true }],
    properties: { defaultRowHeight: 20 },
  });

  const columnsDef = [
    { header: "Booking ID", key: "bookingId", width: 38 },
    { header: "Booking Type", key: "bookingType", width: 17 },
    { header: "Booking Status", key: "bookingStatus", width: 16 },
    { header: "Payment Status", key: "paymentStatus", width: 18 },
    { header: "Booking Date", key: "bookingDate", width: 15 },
    { header: "Start Time", key: "startTime", width: 13 },
    { header: "End Time", key: "endTime", width: 13 },
    { header: "Sport / Activity", key: "sport", width: 17 },
    { header: "Booking Amount (INR)", key: "amount", width: 22 },
    { header: "Turf Name", key: "turfName", width: 26 },
    { header: "Turf Location", key: "turfLocation", width: 32 },
    { header: "Turf Owner", key: "ownerName", width: 22 },
    { header: "Player Name", key: "playerName", width: 22 },
    { header: "Player Email", key: "playerEmail", width: 28 },
    { header: "Player Contact", key: "playerContact", width: 16 },
    { header: "Payment / Ref ID", key: "referenceId", width: 30 },
    { header: "Created At", key: "createdAt", width: 22 },
  ];

  const totalCols = columnsDef.length;

  // Row 1: Title Banner
  const titleRow = sheet.getRow(1);
  titleRow.height = 32;
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell("A1");
  titleCell.value = "VELOCITY TURF — BOOKINGS REPORT";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Deep Navy Slate
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Metadata / Scope / Generated Time
  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const metaRow = sheet.getRow(2);
  metaRow.height = 22;
  sheet.mergeCells(2, 1, 2, totalCols);
  const metaCell = sheet.getCell("A2");
  metaCell.value = `Scope: ${scopeTitle}  |  Generated: ${nowStr}  |  Generated By: ${generatedBy}  |  Total Records: ${bookings.length}`;
  metaCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF94A3B8" } };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: Blank separator
  const sepRow = sheet.getRow(3);
  sepRow.height = 10;

  // Row 4: Column Headers
  const headerRow = sheet.getRow(4);
  headerRow.height = 28;
  columnsDef.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFF8FAFC" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" }, // Slate 700
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.key === "amount" ? "right" : ["bookingDate", "startTime", "endTime", "bookingStatus", "paymentStatus"].includes(col.key) ? "center" : "left",
      wrapText: false,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF475569" } },
      bottom: { style: "medium", color: { argb: "FF475569" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // Data rows starting from Row 5
  let currentRowIdx = 5;
  for (const b of bookings) {
    const rowData = formatBookingExportRow(b, idempotencyKeyMap);
    const row = sheet.getRow(currentRowIdx);
    row.height = 22;

    const isEven = (currentRowIdx - 5) % 2 === 1;
    const rowBgColor = isEven ? "FFF8FAFC" : "FFFFFFFF";

    columnsDef.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const val = rowData[col.key];

      cell.value = val;
      cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBgColor },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (col.key === "amount") {
        cell.numFmt = '"₹"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else if (["bookingDate", "startTime", "endTime", "bookingStatus", "paymentStatus"].includes(col.key)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Highlight status badges subtly
      if (col.key === "bookingStatus") {
        if (val === "Confirmed") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF16A34A" } };
        else if (val === "Completed") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0284C7" } };
        else if (val === "Cancelled" || val === "Declined") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFDC2626" } };
      }
      if (col.key === "paymentStatus") {
        if (val.startsWith("Paid")) cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF16A34A" } };
        else if (val === "Refunded") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF9333EA" } };
      }
    });

    currentRowIdx++;
  }

  // Summary Row if bookings exist
  if (bookings.length > 0) {
    const summaryRow = sheet.getRow(currentRowIdx);
    summaryRow.height = 24;

    // Label in column 8 (Sport / Activity)
    const labelCell = summaryRow.getCell(8);
    labelCell.value = "Total Amount:";
    labelCell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
    labelCell.alignment = { vertical: "middle", horizontal: "right" };

    // Sum Formula in column 9 (Amount)
    const sumCell = summaryRow.getCell(9);
    sumCell.value = { formula: `SUM(I5:I${currentRowIdx - 1})` };
    sumCell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
    sumCell.numFmt = '"₹"#,##0.00';
    sumCell.alignment = { vertical: "middle", horizontal: "right" };
    sumCell.border = {
      top: { style: "thin", color: { argb: "FF475569" } },
      bottom: { style: "double", color: { argb: "FF475569" } },
    };

    currentRowIdx++;
  }

  // AutoFilter across all columns on header Row 4
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(4, currentRowIdx - 1), column: totalCols },
  };

  // Set explicit column widths with extra safety margin
  columnsDef.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });

  return workbook;
}

/**
 * Server-side query helper to fetch bookings with joins and related info.
 *
 * @param {Object} admin Supabase admin client
 * @param {Object} filters
 * @param {string[]} [filters.turfIds] Array of allowed turf IDs
 * @param {string} [filters.ownerId] Specific owner ID
 * @param {string} [filters.startDate] YYYY-MM-DD
 * @param {string} [filters.endDate] YYYY-MM-DD
 * @param {string} [filters.status] Booking status
 * @param {string} [filters.paymentStatus] Payment status
 * @param {number} [filters.limit] Max records (default 10,000)
 * @returns {Promise<{ bookings: Array, idempotencyMap: Map }>}
 */
export async function queryBookingsForExport(admin, {
  turfIds = null,
  ownerId = null,
  startDate = null,
  endDate = null,
  status = null,
  paymentStatus = null,
  limit = 10000,
} = {}) {
  // If ownerId is provided, resolve all their turfs first
  let scopedTurfIds = turfIds;
  if (ownerId) {
    const { data: ownerTurfs } = await admin
      .from("turfs")
      .select("id")
      .eq("owner_id", ownerId);
    const resolvedIds = (ownerTurfs || []).map((t) => t.id);
    if (!resolvedIds.length) {
      return { bookings: [], idempotencyMap: new Map() };
    }
    if (scopedTurfIds && scopedTurfIds.length) {
      scopedTurfIds = scopedTurfIds.filter((id) => resolvedIds.includes(id));
      if (!scopedTurfIds.length) {
        return { bookings: [], idempotencyMap: new Map() };
      }
    } else {
      scopedTurfIds = resolvedIds;
    }
  }

  let query = admin
    .from("bookings")
    .select(`
      id,
      turf_id,
      player_id,
      booking_date,
      start_time,
      sport,
      players_count,
      price,
      status,
      created_at
    `)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(limit);

  if (scopedTurfIds && scopedTurfIds.length) {
    query = query.in("turf_id", scopedTurfIds);
  }

  if (startDate) {
    query = query.gte("booking_date", startDate);
  }

  if (endDate) {
    query = query.lte("booking_date", endDate);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (paymentStatus && paymentStatus !== "all") {
    if (paymentStatus === "paid") {
      query = query.in("status", ["confirmed", "completed"]);
    } else if (paymentStatus === "refunded") {
      query = query.in("status", ["cancelled", "declined"]);
    } else if (paymentStatus === "pending") {
      query = query.eq("status", "pending");
    }
  }

  const { data: rawBookings, error: bookingsError } = await query;
  if (bookingsError) {
    throw bookingsError;
  }

  const bookings = rawBookings || [];
  if (!bookings.length) {
    return { bookings: [], idempotencyMap: new Map() };
  }

  // Fetch unique turf IDs and player IDs to populate joins robustly
  const targetTurfIds = [...new Set(bookings.map((b) => b.turf_id).filter(Boolean))];
  const targetPlayerIds = [...new Set(bookings.map((b) => b.player_id).filter(Boolean))];
  const targetBookingIds = bookings.map((b) => b.id);

  const [turfsRes, playersRes, idemRes] = await Promise.all([
    targetTurfIds.length
      ? admin.from("turfs").select("id, name, address, city, owner_id").in("id", targetTurfIds)
      : { data: [] },
    targetPlayerIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", targetPlayerIds)
      : { data: [] },
    targetBookingIds.length
      ? admin.from("idempotency_keys").select("key, resource_id").in("resource_id", targetBookingIds)
      : { data: [] },
  ]);

  const turfList = turfsRes.data || [];
  const playerList = playersRes.data || [];
  const idemList = idemRes.data || [];

  // Fetch owners of the turfs
  const targetOwnerIds = [...new Set(turfList.map((t) => t.owner_id).filter(Boolean))];
  const { data: ownerProfiles } = targetOwnerIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", targetOwnerIds)
    : { data: [] };

  const ownerMap = new Map((ownerProfiles || []).map((o) => [o.id, o]));
  const turfMap = new Map(
    turfList.map((t) => [
      t.id,
      {
        ...t,
        owner: ownerMap.get(t.owner_id) || null,
      },
    ])
  );
  const playerMap = new Map(playerList.map((p) => [p.id, p]));
  const idempotencyMap = new Map(idemList.map((i) => [i.resource_id, i.key]));

  // Assemble full rich booking objects
  const richBookings = bookings.map((b) => ({
    ...b,
    turf: turfMap.get(b.turf_id) || null,
    player: playerMap.get(b.player_id) || null,
  }));

  return { bookings: richBookings, idempotencyMap };
}
