import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterUsers,
  getUserBookingCount,
  normalizeAdminRole,
} from '../lib/admin/dashboard-utils.js';

test('normalizeAdminRole returns human-readable labels', () => {
  assert.equal(normalizeAdminRole('owner'), 'Turf Owner');
  assert.equal(normalizeAdminRole('admin'), 'Admin');
  assert.equal(normalizeAdminRole('player'), 'Player');
  assert.equal(normalizeAdminRole('unknown'), 'Player');
});

test('filterUsers searches names, roles, and emails case-insensitively', () => {
  const users = [
    { id: '1', name: 'Asha Mehta', role: 'Turf Owner', email: 'asha@example.com' },
    { id: '2', name: 'Rohan', role: 'Player', email: 'rohan@example.com' },
  ];

  assert.deepEqual(filterUsers(users, 'asha'), [users[0]]);
  assert.deepEqual(filterUsers(users, 'TURF OWNER'), [users[0]]);
  assert.deepEqual(filterUsers(users, 'ROHAN@EXAMPLE.COM'), [users[1]]);
  assert.deepEqual(filterUsers(users, ''), users);
});

test('getUserBookingCount counts bookings for each profile', () => {
  const bookings = [
    { player_id: 'owner-1', status: 'confirmed' },
    { player_id: 'owner-1', status: 'pending' },
    { player_id: 'player-1', status: 'completed' },
  ];

  assert.equal(getUserBookingCount(bookings, 'owner-1'), 2);
  assert.equal(getUserBookingCount(bookings, 'missing'), 0);
});
