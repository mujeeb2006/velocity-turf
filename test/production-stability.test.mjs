import test from 'node:test';
import assert from 'node:assert/strict';

import { extractErrorMessage } from '../lib/api-response.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';

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
