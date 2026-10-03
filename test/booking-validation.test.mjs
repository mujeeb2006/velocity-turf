import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBookingRequest } from '../lib/booking/validation.js';

test('validateBookingRequest accepts a valid slot selection', () => {
  const result = validateBookingRequest({
    profile: { id: 'player-1' },
    turf: {
      id: 'turf-1',
      name: 'North Turf',
      slots: [{ raw_time: '18:00:00', status: 'available' }],
    },
    selectedSlot: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
});

test('validateBookingRequest rejects missing selection', () => {
  const result = validateBookingRequest({
    profile: { id: 'player-1' },
    turf: { id: 'turf-1', slots: [{ status: 'available' }] },
    selectedSlot: null,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /select a time slot/i);
});

test('validateBookingRequest rejects a slot that is no longer available', () => {
  const result = validateBookingRequest({
    profile: { id: 'player-1' },
    turf: {
      id: 'turf-1',
      slots: [{ raw_time: '18:00:00', status: 'booked' }],
    },
    selectedSlot: 0,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /just taken|not available/i);
});
