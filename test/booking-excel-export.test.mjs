import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  calculateEndTime,
  formatTimeSlot,
  formatBookingStatus,
  mapPaymentStatus,
  formatBookingExportRow,
  buildBookingExcelWorkbook,
  queryBookingsForExport,
} from "../lib/reports/booking-excel.js";

const TURF_1 = {
  id: "turf-uuid-1",
  name: "Greenfield Arena",
  address: "123 Stadium Road",
  city: "Bangalore",
  owner_id: "owner-uuid-1",
  owner: {
    id: "owner-uuid-1",
    full_name: "Rahul Dravid",
    email: "rahul@greenfield.com",
  },
};

const TURF_2 = {
  id: "turf-uuid-2",
  name: "Marina Turf",
  address: "45 Beach Way",
  city: "Chennai",
  owner_id: "owner-uuid-2",
  owner: {
    id: "owner-uuid-2",
    full_name: "Suresh Raina",
    email: "suresh@marina.com",
  },
};

const PLAYER_1 = {
  id: "player-uuid-1",
  full_name: "Virat K",
  email: "virat@example.com",
};

const SAMPLE_BOOKINGS = [
  {
    id: "b-001",
    turf_id: TURF_1.id,
    player_id: PLAYER_1.id,
    booking_date: "2026-11-01",
    start_time: "18:00:00",
    sport: "Football",
    players_count: 1,
    price: 1200,
    status: "confirmed",
    created_at: "2026-10-21T10:00:00Z",
    turf: TURF_1,
    player: PLAYER_1,
  },
  {
    id: "b-002",
    turf_id: TURF_1.id,
    player_id: PLAYER_1.id,
    booking_date: "2026-11-02",
    start_time: "07:00:00",
    sport: "Cricket",
    players_count: 1,
    price: 1500,
    status: "completed",
    created_at: "2026-10-21T11:00:00Z",
    turf: TURF_1,
    player: PLAYER_1,
  },
  {
    id: "b-003",
    turf_id: TURF_1.id,
    player_id: PLAYER_1.id,
    booking_date: "2026-11-03",
    start_time: "19:00:00",
    sport: "Football",
    players_count: 1,
    price: 1200,
    status: "cancelled",
    created_at: "2026-10-21T12:00:00Z",
    turf: TURF_1,
    player: PLAYER_1,
  },
  {
    id: "b-004",
    turf_id: TURF_2.id,
    player_id: PLAYER_1.id,
    booking_date: "2026-11-04",
    start_time: "20:00:00",
    sport: "Badminton",
    players_count: 1,
    price: 800,
    status: "declined",
    created_at: "2026-10-21T13:00:00Z",
    turf: TURF_2,
    player: PLAYER_1,
  },
];

// ── 1. Time Calculation & Status Mappings ─────────────────────────

test("calculateEndTime: adds 1 hour to start time accurately", () => {
  assert.equal(calculateEndTime("06:00:00"), "07:00");
  assert.equal(calculateEndTime("18:30"), "19:30");
  assert.equal(calculateEndTime("23:00"), "00:00");
  assert.equal(calculateEndTime(null), "N/A");
  assert.equal(calculateEndTime(""), "N/A");
});

test("formatTimeSlot: normalizes HH:mm time format", () => {
  assert.equal(formatTimeSlot("18:00:00"), "18:00");
  assert.equal(formatTimeSlot("07:30:15"), "07:30");
  assert.equal(formatTimeSlot(null), "N/A");
});

test("formatBookingStatus: returns proper title-cased status", () => {
  assert.equal(formatBookingStatus("confirmed"), "Confirmed");
  assert.equal(formatBookingStatus("completed"), "Completed");
  assert.equal(formatBookingStatus("cancelled"), "Cancelled");
  assert.equal(formatBookingStatus("declined"), "Declined");
  assert.equal(formatBookingStatus("pending"), "Pending");
  assert.equal(formatBookingStatus(null), "Unknown");
});

test("mapPaymentStatus: accurately reflects payment condition per booking status", () => {
  // Confirmed and completed bookings have verified payments
  assert.equal(mapPaymentStatus("confirmed"), "Paid");
  assert.equal(mapPaymentStatus("completed"), "Paid (Completed)");

  // Cancelled and declined bookings are refunded
  assert.equal(mapPaymentStatus("cancelled"), "Refunded");
  assert.equal(mapPaymentStatus("declined"), "Refunded");

  // Pending bookings are awaiting payment
  assert.equal(mapPaymentStatus("pending"), "Pending Payment");
  assert.equal(mapPaymentStatus("unknown"), "N/A");
});

// ── 2. Data Row Formatting & Accuracy ─────────────────────────────

test("formatBookingExportRow: produces complete, accurate 17-field export record", () => {
  const idemMap = new Map([["b-001", "idem_key_abc_123"]]);
  const row = formatBookingExportRow(SAMPLE_BOOKINGS[0], idemMap);

  assert.equal(row.bookingId, "b-001");
  assert.equal(row.bookingType, "Instant Booking");
  assert.equal(row.bookingStatus, "Confirmed");
  assert.equal(row.paymentStatus, "Paid");
  assert.equal(row.bookingDate, "2026-11-01");
  assert.equal(row.startTime, "18:00");
  assert.equal(row.endTime, "19:00");
  assert.equal(row.sport, "Football");
  assert.equal(row.amount, 1200);
  assert.equal(row.turfName, "Greenfield Arena");
  assert.equal(row.turfLocation, "123 Stadium Road, Bangalore");
  assert.equal(row.ownerName, "Rahul Dravid");
  assert.equal(row.playerName, "Virat K");
  assert.equal(row.playerEmail, "virat@example.com");
  assert.equal(row.playerContact, "N/A"); // Handles empty contact numbers safely
  assert.equal(row.referenceId, "idem_key_abc_123");
  assert.match(row.createdAt, /2026-10-21/);
});

test("formatBookingExportRow: handles cancelled and refunded records safely", () => {
  const cancelledRow = formatBookingExportRow(SAMPLE_BOOKINGS[2]);
  assert.equal(cancelledRow.bookingStatus, "Cancelled");
  assert.equal(cancelledRow.paymentStatus, "Refunded");
  assert.equal(cancelledRow.referenceId, "N/A"); // Default fallback when no transaction key exists
});

test("formatBookingExportRow: gracefully handles partial or missing joined records", () => {
  const bareBooking = {
    id: "bare-001",
    booking_date: "2026-11-10",
    start_time: "10:00:00",
    price: 500,
    status: "confirmed",
  };
  const row = formatBookingExportRow(bareBooking);

  assert.equal(row.bookingId, "bare-001");
  assert.equal(row.turfName, "Unknown Turf");
  assert.equal(row.turfLocation, "N/A");
  assert.equal(row.ownerName, "Unknown Owner");
  assert.equal(row.playerName, "Guest Player");
  assert.equal(row.playerEmail, "N/A");
  assert.equal(row.amount, 500);
});

// ── 3. Excel Workbook Generation & File Validity ─────────────────

test("buildBookingExcelWorkbook: generates valid .xlsx workbook that opens correctly", async () => {
  const idemMap = new Map([
    ["b-001", "VT-IDEM-001"],
    ["b-002", "VT-IDEM-002"],
  ]);

  const workbook = await buildBookingExcelWorkbook({
    bookings: SAMPLE_BOOKINGS,
    idempotencyKeyMap: idemMap,
    scopeTitle: "Greenfield Arena",
    generatedBy: "Rahul Dravid (Owner)",
  });

  const sheet = workbook.getWorksheet("Turf Bookings");
  assert.ok(sheet, "Worksheet 'Turf Bookings' must exist");

  // Title Banner in row 1
  assert.equal(sheet.getCell("A1").value, "VELOCITY TURF — BOOKINGS REPORT");

  // Metadata in row 2
  assert.match(sheet.getCell("A2").value, /Greenfield Arena/);
  assert.match(sheet.getCell("A2").value, /Total Records: 4/);

  // Column Headers in row 4
  assert.equal(sheet.getCell("A4").value, "Booking ID");
  assert.equal(sheet.getCell("B4").value, "Booking Type");
  assert.equal(sheet.getCell("C4").value, "Booking Status");
  assert.equal(sheet.getCell("D4").value, "Payment Status");
  assert.equal(sheet.getCell("I4").value, "Booking Amount (INR)");

  // First data row in row 5
  assert.equal(sheet.getCell("A5").value, "b-001");
  assert.equal(sheet.getCell("I5").value, 1200);

  // AutoFilter set on headers
  assert.ok(sheet.autoFilter, "AutoFilter must be configured on header row");

  // Convert to buffer and verify reloadability
  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 1000, "Workbook buffer must be non-empty");

  // Read back buffer into a fresh ExcelJS instance to verify file integrity
  const loadedWb = new ExcelJS.Workbook();
  await loadedWb.xlsx.load(buffer);
  const loadedSheet = loadedWb.getWorksheet("Turf Bookings");
  assert.ok(loadedSheet, "Loaded workbook must contain 'Turf Bookings' worksheet");
  assert.equal(loadedSheet.getCell("A1").value, "VELOCITY TURF — BOOKINGS REPORT");
  assert.equal(loadedSheet.getCell("A5").value, "b-001");
  assert.equal(loadedSheet.getCell("I5").value, 1200);
});

test("Multiple bookings produce separate rows without duplication", async () => {
  const workbook = await buildBookingExcelWorkbook({
    bookings: SAMPLE_BOOKINGS,
    scopeTitle: "Multi-row Test",
  });
  const sheet = workbook.getWorksheet("Turf Bookings");

  // Rows 5 through 8 should each have distinct booking IDs
  const rowIds = [
    sheet.getCell("A5").value,
    sheet.getCell("A6").value,
    sheet.getCell("A7").value,
    sheet.getCell("A8").value,
  ];

  assert.deepEqual(rowIds, ["b-001", "b-002", "b-003", "b-004"]);
  assert.equal(new Set(rowIds).size, 4, "No duplicate rows allowed");
});

// ── 4. Query & Authorization Scoping ──────────────────────────────

test("queryBookingsForExport: isolates owner bookings by their owned turfs only", async () => {
  // Mock admin client
  const mockAdmin = {
    from: (table) => {
      if (table === "turfs") {
        return {
          select: () => ({
            eq: (_col, val) => {
              if (val === "owner-uuid-1") return Promise.resolve({ data: [{ id: "turf-uuid-1" }] });
              if (val === "owner-uuid-2") return Promise.resolve({ data: [{ id: "turf-uuid-2" }] });
              return Promise.resolve({ data: [] });
            },
            in: (_col, ids) => Promise.resolve({
              data: [TURF_1, TURF_2].filter((t) => ids.includes(t.id)),
            }),
          }),
        };
      }
      if (table === "bookings") {
        return {
          select: () => ({
            order: () => ({
              order: () => ({
                limit: () => ({
                  in: (_col, ids) => Promise.resolve({
                    data: SAMPLE_BOOKINGS.filter((b) => ids.includes(b.turf_id)),
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            in: (_col, ids) => Promise.resolve({
              data: [PLAYER_1, TURF_1.owner, TURF_2.owner].filter((p) => ids.includes(p.id)),
            }),
          }),
        };
      }
      if (table === "idempotency_keys") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [] }),
          }),
        };
      }
      return {};
    },
  };

  // Export for Owner 1: should ONLY return bookings from turf-uuid-1
  const resultOwner1 = await queryBookingsForExport(mockAdmin, { ownerId: "owner-uuid-1" });
  assert.equal(resultOwner1.bookings.length, 3);
  assert.ok(resultOwner1.bookings.every((b) => b.turf_id === "turf-uuid-1"));
  assert.ok(!resultOwner1.bookings.some((b) => b.turf_id === "turf-uuid-2"));

  // Export for Owner 2: should ONLY return bookings from turf-uuid-2
  const resultOwner2 = await queryBookingsForExport(mockAdmin, { ownerId: "owner-uuid-2" });
  assert.equal(resultOwner2.bookings.length, 1);
  assert.equal(resultOwner2.bookings[0].turf_id, "turf-uuid-2");
});

test("queryBookingsForExport: returns empty when owner has no turfs", async () => {
  const mockAdmin = {
    from: (table) => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [] }), // No turfs found
      }),
    }),
  };

  const result = await queryBookingsForExport(mockAdmin, { ownerId: "empty-owner-uuid" });
  assert.equal(result.bookings.length, 0);
  assert.equal(result.idempotencyMap.size, 0);
});
