import test from 'node:test';
import assert from 'node:assert/strict';

import { isSlotAvailableForBooking, canSubmitBooking } from '../lib/booking/policy.js';

test('isSlotAvailableForBooking accepts open slots and rejects blocked or booked values', () => {
  assert.equal(isSlotAvailableForBooking({ status: 'available' }), true);
  assert.equal(isSlotAvailableForBooking({ status: 'booked' }), false);
  assert.equal(isSlotAvailableForBooking({ status: 'locked' }), false);
  assert.equal(isSlotAvailableForBooking({ status: 'blocked' }), false);
});

test('canSubmitBooking rejects missing player and unavailable slots before insert', () => {
  const missingPlayer = canSubmitBooking({
    profile: null,
    turf: { id: 'turf-1', slots: [{ raw_time: '18:00:00', status: 'available' }] },
    selectedSlot: 0,
  });

  const takenSlot = canSubmitBooking({
    profile: { id: 'player-1' },
    turf: { id: 'turf-1', slots: [{ raw_time: '18:00:00', status: 'booked' }] },
    selectedSlot: 0,
  });

  assert.equal(missingPlayer.ok, false);
  assert.match(missingPlayer.error, /sign in/i);
  assert.equal(takenSlot.ok, false);
  assert.match(takenSlot.error, /just taken|not available/i);
});
