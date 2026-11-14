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

import { revenueBreakdown, revenueBy } from '../lib/dashboard/analytics.js';

const b = (date, price, status = 'confirmed', extra = {}) => ({
  booking_date: date, price, status, ...extra,
});

test('revenueBreakdown: correctly separates collected, pending, refunded', () => {
  const bookings = [
    b('2026-11-01', 1000, 'confirmed', { payment_status: 'paid' }),
    b('2026-11-02', 500, 'completed', { payment_status: 'paid' }),
    b('2026-11-03', 300, 'pending', { payment_status: 'pending' }),
    b('2026-11-04', 200, 'cancelled', { payment_status: 'refunded' }),
    b('2026-11-05', 150, 'declined', { payment_status: 'refunded' }),
  ];
  const rb = revenueBreakdown(bookings);
  assert.equal(rb.collected, 1500);
  assert.equal(rb.pending, 300);
  assert.equal(rb.refunded, 350);
  assert.equal(rb.cancelledCount, 1);
});

test('revenueBreakdown: infers payment_status from booking status when not set', () => {
  const bookings = [
    b('2026-11-01', 800, 'confirmed'),
    b('2026-11-02', 400, 'pending'),
    b('2026-11-03', 200, 'cancelled'),
  ];
  const rb = revenueBreakdown(bookings);
  assert.equal(rb.collected, 800);
  assert.equal(rb.pending, 400);
  assert.equal(rb.refunded, 200);
  assert.equal(rb.cancelledCount, 1);
});

test('revenueBreakdown: separates walk-in vs online revenue', () => {
  const bookings = [
    b('2026-11-01', 1000, 'confirmed', { payment_status: 'paid', booking_source: 'online' }),
    b('2026-11-02', 600, 'confirmed', { payment_status: 'paid', booking_source: 'walk_in' }),
    b('2026-11-03', 400, 'confirmed', { payment_status: 'paid' }),
  ];
  const rb = revenueBreakdown(bookings);
  assert.equal(rb.onlineRev, 1400);
  assert.equal(rb.walkInRev, 600);
  assert.equal(rb.collected, 2000);
});

test('revenueBreakdown: cancelled bookings do not count as collected revenue', () => {
  const bookings = [
    b('2026-11-01', 1000, 'confirmed', { payment_status: 'paid' }),
    b('2026-11-02', 500, 'cancelled', { payment_status: 'refunded' }),
    b('2026-11-03', 300, 'cancelled'),
  ];
  const rb = revenueBreakdown(bookings);
  assert.equal(rb.collected, 1000);
  assert.equal(rb.cancelledCount, 2);
  assert.equal(rb.refunded, 800);
});

test('revenueBreakdown: empty bookings returns zeroes', () => {
  const rb = revenueBreakdown([]);
  assert.equal(rb.collected, 0);
  assert.equal(rb.pending, 0);
  assert.equal(rb.refunded, 0);
  assert.equal(rb.cancelledCount, 0);
  assert.equal(rb.walkInRev, 0);
  assert.equal(rb.onlineRev, 0);
});

test('revenueBy: aggregates by turf ID, not name — no merge on duplicate names', () => {
  const bookings = [
    b('2026-11-01', 500, 'confirmed', { turf_id: 'aaa' }),
    b('2026-11-01', 300, 'confirmed', { turf_id: 'bbb' }),
    b('2026-11-01', 200, 'confirmed', { turf_id: 'aaa' }),
  ];
  const results = revenueBy(bookings, (x) => x.turf_id);
  assert.equal(results.length, 2);
  assert.equal(results.find((r) => r.key === 'aaa').revenue, 700);
  assert.equal(results.find((r) => r.key === 'bbb').revenue, 300);
});

test('revenueBy: pending and cancelled bookings excluded from turf revenue', () => {
  const bookings = [
    b('2026-11-01', 500, 'confirmed', { turf_id: 'x' }),
    b('2026-11-01', 999, 'pending', { turf_id: 'x' }),
    b('2026-11-01', 888, 'cancelled', { turf_id: 'x' }),
  ];
  const results = revenueBy(bookings, (x) => x.turf_id);
  assert.equal(results.length, 1);
  assert.equal(results[0].revenue, 500);
});
