import test from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptanceRate, addDays, avgResolutionHours, dateKey, filterByRange, hourDistribution, monthComparison,
  pctChange, ratingSummary, revenueBy, revenueSeries, sportBreakdown, statusCounts, sumRevenue, upcomingBookings,
} from '../lib/dashboard/analytics.js';
import {
  csvCell, formatCompactINR, formatDayLabel, formatDelta, formatHours, formatINR, formatTime12, relativeTime, seriesToBars, toCSV,
} from '../lib/dashboard/format.js';

const b = (booking_date, price, status = 'confirmed', extra = {}) => ({ booking_date, price, status, ...extra });

test('dateKey uses local time, not UTC', () => {
  // 02:00 local on the 6th is still the 5th in UTC for any UTC+ zone; the key must follow the local calendar.
  assert.equal(dateKey(new Date(2026, 9, 6, 2, 0)), '2026-10-06');
  assert.equal(dateKey(new Date(2026, 0, 1, 23, 59)), '2026-01-01');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('revenueSeries returns one row per day and only counts paid bookings', () => {
  const rows = revenueSeries([
    b('2026-10-06', 1000), b('2026-10-06', 500, 'completed'), b('2026-10-05', 700),
    b('2026-10-05', 999, 'pending'), b('2026-10-04', 999, 'declined'), b('2026-10-07', 999), b('2026-09-01', 999),
  ], 3, '2026-10-06');
  assert.deepEqual(rows.map((r) => r.date), ['2026-10-04', '2026-10-05', '2026-10-06']);
  assert.deepEqual(rows.map((r) => r.revenue), [0, 700, 1500]);
  assert.deepEqual(rows.map((r) => r.count), [0, 1, 2]);
});

test('monthComparison compares month-to-date with the same days of last month', () => {
  const bookings = [
    b('2026-10-01', 100), b('2026-10-06', 200), b('2026-10-20', 9999), // future this month: excluded
    b('2026-09-01', 100), b('2026-09-06', 100), b('2026-09-07', 5000), // after day 6: excluded
  ];
  const m = monthComparison(bookings, '2026-10-06');
  assert.equal(m.revenue, 300);
  assert.equal(m.prevRevenue, 200);
  assert.equal(m.revenueChange, 50);
  assert.equal(m.count, 2);
  assert.equal(m.countChange, 0);
});

test('monthComparison caps the previous window at the end of a shorter month', () => {
  const m = monthComparison([b('2026-09-30', 100), b('2026-10-31', 300)], '2026-10-31');
  assert.equal(m.prevRevenue, 100);
  assert.equal(m.revenue, 300);
});

test('pctChange returns null without a baseline', () => {
  assert.equal(pctChange(100, 0), null);
  assert.equal(pctChange(0, 0), null);
  assert.equal(pctChange(50, 100), -50);
});

test('revenueBy groups and sorts by revenue', () => {
  const rows = revenueBy([b('2026-10-01', 100, 'confirmed', { turf_id: 'a' }), b('2026-10-01', 400, 'confirmed', { turf_id: 'b' }), b('2026-10-01', 50, 'confirmed', { turf_id: 'a' }), b('2026-10-01', 999, 'pending', { turf_id: 'c' })], (x) => x.turf_id);
  assert.deepEqual(rows.map((r) => [r.key, r.revenue, r.count]), [['b', 400, 1], ['a', 150, 2]]);
});

test('sportBreakdown and hourDistribution ignore declined and cancelled bookings', () => {
  const list = [
    { sport: 'Football', start_time: '18:00:00', status: 'confirmed' }, { sport: 'Football', start_time: '18:00', status: 'pending' },
    { sport: 'Cricket', start_time: '07:00:00', status: 'completed' }, { sport: 'Cricket', start_time: '07:00:00', status: 'declined' },
    { sport: 'Hockey', start_time: '09:00:00', status: 'cancelled' },
  ];
  assert.deepEqual(sportBreakdown(list).map((s) => [s.key, s.count]), [['Football', 2], ['Cricket', 1]]);
  const hours = hourDistribution(list);
  assert.equal(hours.length, 24);
  assert.equal(hours[18].count, 2);
  assert.equal(hours[7].count, 1);
  assert.equal(hours[9].count, 0);
});

test('filterByRange keeps only the trailing window', () => {
  const list = [b('2026-10-06', 1), b('2026-10-04', 1), b('2026-10-03', 1), b('2026-10-07', 1)];
  assert.equal(filterByRange(list, 3, '2026-10-06').length, 2);
});

test('acceptanceRate only counts answered requests', () => {
  assert.equal(acceptanceRate([{ status: 'confirmed' }, { status: 'completed' }, { status: 'declined' }, { status: 'pending' }]), 67);
  assert.equal(acceptanceRate([{ status: 'pending' }]), null);
});

test('statusCounts and upcomingBookings', () => {
  const list = [b('2026-10-08', 1, 'confirmed', { start_time: '10:00' }), b('2026-10-06', 1, 'confirmed', { start_time: '19:00' }), b('2026-10-05', 1, 'confirmed', { start_time: '10:00' }), b('2026-10-09', 1, 'pending')];
  assert.equal(statusCounts(list).confirmed, 3);
  assert.equal(statusCounts(list).all, 4);
  assert.deepEqual(upcomingBookings(list, '2026-10-06').map((x) => x.booking_date), ['2026-10-06', '2026-10-08']);
});

test('avgResolutionHours averages only resolved disputes', () => {
  const hours = avgResolutionHours([
    { created_at: '2026-10-01T00:00:00Z', resolved_at: '2026-10-01T02:00:00Z' },
    { created_at: '2026-10-01T00:00:00Z', resolved_at: '2026-10-01T04:00:00Z' },
    { created_at: '2026-10-01T00:00:00Z', resolved_at: null },
  ]);
  assert.equal(hours, 3);
  assert.equal(avgResolutionHours([{ created_at: '2026-10-01T00:00:00Z', resolved_at: null }]), null);
});

test('ratingSummary builds an average and a 5-to-1 distribution', () => {
  const s = ratingSummary([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }]);
  assert.equal(s.total, 4);
  assert.equal(s.average, 3.75);
  assert.deepEqual(s.distribution.map((r) => r.count), [2, 1, 0, 0, 1]);
  assert.equal(s.distribution[0].pct, 50);
  assert.equal(ratingSummary([]).average, null);
});

test('sumRevenue is inclusive of both ends', () => {
  assert.deepEqual(sumRevenue([b('2026-10-01', 10), b('2026-10-03', 20), b('2026-10-04', 40)], '2026-10-01', '2026-10-03'), { revenue: 30, count: 2 });
});

// ------------------------------------------------------------------ format
test('formatINR and formatCompactINR use Indian grouping and lakh/crore', () => {
  assert.equal(formatINR(1234567), '₹12,34,567');
  assert.equal(formatINR('abc'), '₹0');
  assert.equal(formatCompactINR(950), '₹950');
  assert.equal(formatCompactINR(12500), '₹12.5K');
  assert.equal(formatCompactINR(250000), '₹2.5L');
  assert.equal(formatCompactINR(30000000), '₹3Cr');
});

test('formatTime12 handles midnight, noon and seconds', () => {
  assert.equal(formatTime12('00:00:00'), '12:00 AM');
  assert.equal(formatTime12('12:30'), '12:30 PM');
  assert.equal(formatTime12('18:00:00'), '6:00 PM');
  assert.equal(formatTime12(null), '');
});

test('formatHours, formatDelta and relativeTime', () => {
  assert.equal(formatHours(null), '—');
  assert.equal(formatHours(0.25), '15 min');
  assert.equal(formatHours(6.54), '6.5 hrs');
  assert.equal(formatHours(72), '3 days');
  assert.equal(formatDelta(null), null);
  assert.equal(formatDelta(12), '+12%');
  assert.equal(formatDelta(-4), '−4%');
  const now = Date.parse('2026-10-06T12:00:00Z');
  assert.equal(relativeTime('2026-10-06T11:59:30Z', now), 'just now');
  assert.equal(relativeTime('2026-10-06T10:00:00Z', now), '2 hr ago');
  assert.equal(relativeTime('2026-10-04T12:00:00Z', now), '2 days ago');
});

test('formatDayLabel names today, tomorrow and yesterday', () => {
  assert.equal(formatDayLabel('2026-10-06', '2026-10-06'), 'Today');
  assert.equal(formatDayLabel('2026-10-07', '2026-10-06'), 'Tomorrow');
  assert.equal(formatDayLabel('2026-10-05', '2026-10-06'), 'Yesterday');
});

test('toCSV quotes cells and neutralises spreadsheet formulas', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+91 98765'), "'+91 98765");
  const csv = toCSV([{ n: 'Asha', v: 5 }], [{ label: 'Name', key: 'n' }, { label: 'Double', value: (r) => r.v * 2 }]);
  assert.equal(csv, 'Name,Double\r\nAsha,10');
});

test('seriesToBars labels weekdays for short ranges', () => {
  const bars = seriesToBars([{ date: '2026-10-06', revenue: 500, count: 1 }], 7);
  assert.equal(bars[0].value, 500);
  assert.match(bars[0].tooltip, /1 booking$/);
});
