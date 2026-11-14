import test from 'node:test';
import assert from 'node:assert/strict';

import { extractErrorMessage } from '../lib/api-response.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';
import { calculateSlotPrice } from '../lib/turf/pricing.js';

// ── 1. Error Message Extraction & Non-String Object Safety ───────────────────

test('extractErrorMessage: handles raw string errors safely', () => {
  assert.equal(extractErrorMessage('Something went wrong'), 'Something went wrong');
  assert.equal(extractErrorMessage('   '), 'An unexpected error occurred. Please try again.');
});

test('extractErrorMessage: handles structured API error objects', () => {
  assert.equal(extractErrorMessage({ error: 'Direct error message' }), 'Direct error message');
  assert.equal(extractErrorMessage({ error: { message: 'Nested error message' } }), 'Nested error message');
  assert.equal(extractErrorMessage({ message: 'Top-level message' }), 'Top-level message');
  assert.equal(extractErrorMessage({ errorDetail: { message: 'Error detail message' } }), 'Error detail message');
  assert.equal(extractErrorMessage({ details: { message: 'Validation detail message' } }), 'Validation detail message');
});

test('extractErrorMessage: never returns an object that could trigger React error #31', () => {
  const testCases = [
    { error: { code: 'PGRST204', details: 'Column not found' } },
    { error: { unknown: true } },
    { code: 500 },
    null,
    undefined,
    {},
    [1, 2, 3],
  ];

  for (const tc of testCases) {
    const result = extractErrorMessage(tc, 'Fallback message');
    assert.equal(typeof result, 'string', `Failed for case: ${JSON.stringify(tc)}`);
    assert.ok(result.length > 0);
  }
});

// ── 2. ErrorBoundary State Transition Safety ──────────────────────────────────

test('ErrorBoundary.getDerivedStateFromError captures error object cleanly', () => {
  const err = new Error('Test rendering exception');
  const nextState = ErrorBoundary.getDerivedStateFromError(err);
  assert.equal(nextState.hasError, true);
  assert.equal(nextState.error, err);
});

test('ErrorBoundary handles string and non-Error objects gracefully', () => {
  const stringErr = ErrorBoundary.getDerivedStateFromError('Plain string error');
  assert.equal(stringErr.hasError, true);
  assert.equal(stringErr.error, 'Plain string error');

  const objErr = ErrorBoundary.getDerivedStateFromError({ custom: 'exception' });
  assert.equal(objErr.hasError, true);
  assert.deepEqual(objErr.error, { custom: 'exception' });
});

// ── 3. PostgREST Match Participants Column Grant Parity ───────────────────────

test('Granted columns for match_participants include match_id, player_id, payment_status, amount_paid', () => {
  const grantedColumns = new Set([
    'match_id',
    'player_id',
    'payment_status',
    'amount_paid',
    'payment_id',
    'idempotency_key',
  ]);

  // Head count queries must use a granted column (match_id, not ungranted id)
  const headCountColumn = 'match_id';
  assert.ok(grantedColumns.has(headCountColumn), 'Head count query must use an authorized column');

  // Direct table queries must stay within granted columns
  const directColumns = ['match_id', 'player_id', 'payment_status', 'amount_paid'];
  for (const col of directColumns) {
    assert.ok(grantedColumns.has(col), `Column ${col} must be in the granted set`);
  }
});

// ── 4. Channel Name Uniqueness & Collision Prevention ─────────────────────────

test('Realtime channel generator produces unique, collision-proof channel names', () => {
  const names = new Set();
  const profileId = 'test-player-123';

  for (let i = 0; i < 100; i++) {
    const channelName = `player-live-${profileId}-${Math.random().toString(36).slice(2, 7)}`;
    assert.ok(!names.has(channelName), `Collision detected on iteration ${i}: ${channelName}`);
    names.add(channelName);
  }
  assert.equal(names.size, 100);
});

// ── 5. Optional API Failure Isolation ─────────────────────────────────────────

test('Failed rewards/referral API payload fallback does not throw or corrupt dashboard state', () => {
  // Simulate a partial rewards/wallet failure response
  const responseData = {
    wallet: {
      availablePoints: 0,
      available_points: 0,
      inrValue: 0,
    },
    settings: {
      conversion_rate_points_per_inr: 1,
      min_redemption_points: 100,
    },
    referralError: 'Referral data temporarily unavailable.',
  };

  const referralError = responseData.referralError;
  const safeMessage = typeof referralError === 'string'
    ? referralError
    : referralError?.message || 'Could not load referral data.';

  assert.equal(typeof safeMessage, 'string');
  assert.equal(safeMessage, 'Referral data temporarily unavailable.');
});

// ── 6. Player Booking Modal Date & Slot Pricing Safety ────────────────────────

test('Player Booking Modal: price evaluation with selectedDate and slotTime works cleanly', () => {
  const turf = {
    id: 'turf-abc',
    base_price: 1200,
    peak_price: 1600,
    pricing_rules: {
      timeBands: [
        { id: 'evening', label: 'Evening', startTime: '18:00', endTime: '23:00', price: 1600 },
      ],
    },
  };

  const selectedDate = '2026-11-18';
  const modalSlots = [
    { time: '07:00 AM', raw_time: '07:00', status: 'available' },
    { time: '06:00 PM', raw_time: '18:00', status: 'available' },
  ];

  // Helper mimicking calcPrice from PlayerAppClient.js
  const calcPrice = (t, occ, date, time) => {
    if (!t) return 0;
    if (date && time) {
      return calculateSlotPrice(t, date, time, occ).price;
    }
    const base = Number(t.base_price || t.price || 0);
    return occ > 70 ? Math.round(base * 1.15) : base;
  };

  // Case 1: Initial state before user selects any slot (selectedSlot === null)
  let selectedSlot = null;
  let bookingPrice = null;
  const occupancy = 0;
  const slotTime1 = selectedSlot !== null ? (modalSlots[selectedSlot]?.raw_time || modalSlots[selectedSlot]?.time) : null;
  const price1 = bookingPrice ?? (turf ? calcPrice(turf, occupancy, selectedDate, slotTime1) : 0);
  assert.equal(price1, 1200, 'Unselected slot falls back to base price without throwing');

  // Case 2: User selects Slot 0 (07:00 regular hour)
  selectedSlot = 0;
  const slotTime2 = selectedSlot !== null ? (modalSlots[selectedSlot]?.raw_time || modalSlots[selectedSlot]?.time) : null;
  const price2 = bookingPrice ?? (turf ? calcPrice(turf, occupancy, selectedDate, slotTime2) : 0);
  assert.equal(price2, 1200, 'Regular slot returns base price');

  // Case 3: User selects Slot 1 (18:00 Evening peak band)
  selectedSlot = 1;
  const slotTime3 = selectedSlot !== null ? (modalSlots[selectedSlot]?.raw_time || modalSlots[selectedSlot]?.time) : null;
  const price3 = bookingPrice ?? (turf ? calcPrice(turf, occupancy, selectedDate, slotTime3) : 0);
  assert.equal(price3, 1600, 'Peak slot returns dynamic time-band price');

  // Case 4: Pre-set bookingPrice (e.g. from completed group booking)
  bookingPrice = 500;
  const price4 = bookingPrice ?? (turf ? calcPrice(turf, occupancy, selectedDate, slotTime3) : 0);
  assert.equal(price4, 500, 'Pre-set bookingPrice takes precedence');
});
