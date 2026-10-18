import test from "node:test";
import assert from "node:assert/strict";
import {
  VALID_PAYOUT_TRANSITIONS,
  isValidPayoutTransition,
  canonicalPayoutIdentifier,
  validatePayoutCreation,
} from "../lib/payout/policy.js";
import { toCSV } from "../lib/dashboard/format.js";

test("VALID_PAYOUT_TRANSITIONS allows valid transitions and disallows invalid ones", () => {
  // From pending
  assert.ok(isValidPayoutTransition("pending", "processing"));
  assert.ok(isValidPayoutTransition("pending", "paid"));
  assert.ok(isValidPayoutTransition("pending", "failed"));

  // From processing
  assert.ok(isValidPayoutTransition("processing", "paid"));
  assert.ok(isValidPayoutTransition("processing", "failed"));
  assert.ok(isValidPayoutTransition("processing", "pending"));

  // From failed
  assert.ok(isValidPayoutTransition("failed", "processing"));
  assert.ok(isValidPayoutTransition("failed", "pending"));
  assert.equal(isValidPayoutTransition("failed", "paid"), false);

  // From paid (terminal - money disbursed)
  assert.equal(VALID_PAYOUT_TRANSITIONS.paid.length, 0);
  assert.equal(isValidPayoutTransition("paid", "pending"), false);
  assert.equal(isValidPayoutTransition("paid", "processing"), false);
  assert.equal(isValidPayoutTransition("paid", "failed"), false);

  // Idempotent transitions
  assert.equal(isValidPayoutTransition("paid", "paid"), true);
  assert.equal(isValidPayoutTransition("pending", "pending"), true);
});

test("Payout identifier resolution falls back safely across schema column variants", () => {
  // Schema with payout_number
  assert.equal(
    canonicalPayoutIdentifier({ payout_number: "PO-202610-1001", payout_id: null, id: "12345678-0000-0000-0000-000000000000" }),
    "PO-202610-1001"
  );

  // Schema with payout_id only
  assert.equal(
    canonicalPayoutIdentifier({ payout_number: null, payout_id: "PO-202610-9999", id: "12345678-0000-0000-0000-000000000000" }),
    "PO-202610-9999"
  );

  // Schema with UUID id only
  assert.equal(
    canonicalPayoutIdentifier({ payout_number: null, payout_id: null, id: "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44" }),
    "PO-3f2b8c1e"
  );

  // Empty record fallback
  assert.equal(canonicalPayoutIdentifier({}), "—");
  assert.equal(canonicalPayoutIdentifier(null), "—");
});

test("validatePayoutCreation rejects invalid inputs and accepts valid ones", () => {
  const validOwnerId = "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44";

  assert.equal(
    validatePayoutCreation({
      ownerId: validOwnerId,
      amount: 15000,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
    }).ok,
    true
  );

  // Invalid owner ID
  assert.equal(
    validatePayoutCreation({
      ownerId: "bad-id",
      amount: 15000,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
    }).ok,
    false
  );

  // Negative or zero amount
  assert.equal(
    validatePayoutCreation({
      ownerId: validOwnerId,
      amount: 0,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
    }).ok,
    false
  );
  assert.equal(
    validatePayoutCreation({
      ownerId: validOwnerId,
      amount: -500,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
    }).ok,
    false
  );

  // Period start after period end
  assert.equal(
    validatePayoutCreation({
      ownerId: validOwnerId,
      amount: 1000,
      periodStart: "2026-10-20",
      periodEnd: "2026-10-10",
    }).ok,
    false
  );
});

test("Payout CSV export handles consistent identifiers and escapes formula injections", () => {
  const payouts = [
    {
      id: "3f2b8c1e-5a47-4d9e-8b61-0c9d2e7a1f44",
      payout_number: "PO-202610-1001",
      owner: "Asha Mehta",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
      amount: 15000,
      status: "paid",
    },
    {
      id: "4a1b2c3d-0000-0000-0000-000000000000",
      payout_number: "=cmd|' /C calc'!A0", // malicious spreadsheet formula
      owner: "Malicious Owner",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-15",
      amount: 5000,
      status: "processing",
    },
  ];

  const columns = [
    { label: "Payout ID", value: (p) => p.payout_number || p.payout_id || p.id },
    { label: "Owner", key: "owner" },
    { label: "Start", key: "periodStart" },
    { label: "End", key: "periodEnd" },
    { label: "Amount (INR)", key: "amount" },
    { label: "Status", key: "status" },
  ];

  const csv = toCSV(payouts, columns);
  assert.ok(csv.includes("PO-202610-1001"));
  assert.ok(csv.includes("Asha Mehta"));
  assert.ok(csv.includes("paid"));
  // Formula character '=' should be prefixed with "'"
  assert.ok(csv.includes("'=cmd|' /C calc'!A0"));
});
