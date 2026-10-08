import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidEmail, isStrongPassword, normalizeEmail, normalizeSignupRole } from '../lib/auth/validation.js';

test('normalizeEmail trims whitespace and lowercases the value', () => {
  assert.equal(normalizeEmail('  Player@Example.com  '), 'player@example.com');
});

test('normalizeSignupRole only permits public player signup', () => {
  assert.equal(normalizeSignupRole('Owner'), 'player');
  assert.equal(normalizeSignupRole('turf_owner'), 'player');
  assert.equal(normalizeSignupRole('player'), 'player');
  assert.equal(normalizeSignupRole('admin'), 'player');
  assert.equal(normalizeSignupRole(''), 'player');
});

test('isValidEmail accepts standard emails and rejects malformed ones', () => {
  assert.equal(isValidEmail('player@example.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);
});

test('isStrongPassword enforces an 8-character minimum and a non-trivial value', () => {
  assert.equal(isStrongPassword('abc12345'), true);
  assert.equal(isStrongPassword('short'), false);
  assert.equal(isStrongPassword('1234567'), false);
  assert.equal(isStrongPassword('      '), false);
});
