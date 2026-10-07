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

import {
  countUsersByRole, filterTurfs, filterUsersByRole, getUserSpend, sortRows,
} from '../lib/admin/dashboard-utils.js';

test('getUserSpend only sums confirmed and completed bookings', () => {
  const bookings = [
    { player_id: 'p', status: 'confirmed', price: '500' },
    { player_id: 'p', status: 'completed', price: 250 },
    { player_id: 'p', status: 'declined', price: 999 },
    { player_id: 'p', status: 'pending', price: 999 },
    { player_id: 'q', status: 'confirmed', price: 100 },
  ];
  assert.equal(getUserSpend(bookings, 'p'), 750);
  assert.equal(getUserSpend(bookings, 'none'), 0);
});

test('role filter and counts', () => {
  const users = [{ role: 'Player' }, { role: 'Player' }, { role: 'Turf Owner' }, { role: 'Admin' }];
  assert.equal(filterUsersByRole(users, 'Player').length, 2);
  assert.equal(filterUsersByRole(users, 'all').length, 4);
  assert.deepEqual(countUsersByRole(users), { all: 4, Player: 2, 'Turf Owner': 1, Admin: 1 });
});

test('filterTurfs matches name, owner and city and respects status', () => {
  const turfs = [
    { name: 'Arena Nova', owner: 'Asha', city: 'Noida', status: 'live' },
    { name: 'Green Park', owner: 'Rohan', city: 'Bengaluru', status: 'pending' },
  ];
  assert.equal(filterTurfs(turfs, { query: 'noida' }).length, 1);
  assert.equal(filterTurfs(turfs, { query: 'rohan' })[0].name, 'Green Park');
  assert.equal(filterTurfs(turfs, { status: 'pending' }).length, 1);
  assert.equal(filterTurfs(turfs, { query: 'arena', status: 'pending' }).length, 0);
});

test('sortRows sorts numbers and text, is stable, and does not mutate', () => {
  const rows = [{ n: 'b', v: 2 }, { n: 'A', v: 2 }, { n: 'c', v: 10 }];
  assert.deepEqual(sortRows(rows, 'v', 'desc').map((r) => r.n), ['c', 'b', 'A']);
  assert.deepEqual(sortRows(rows, 'n', 'asc').map((r) => r.n), ['A', 'b', 'c']);
  assert.deepEqual(rows.map((r) => r.n), ['b', 'A', 'c']);
  assert.equal(sortRows(rows, undefined), rows);
});
