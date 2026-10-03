import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidEmail, isStrongPassword, normalizeEmail } from '../lib/auth/validation.js';

test('normalizeEmail trims whitespace and lowercases the value', () => {
  assert.equal(normalizeEmail('  Player@Example.com  '), 'player@example.com');
});

test('isValidEmail accepts standard emails and rejects malformed ones', () => {
  assert.equal(isValidEmail('player@example.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);
});

test('isStrongPassword enforces a minimum length and a non-trivial value', () => {
  assert.equal(isStrongPassword('abc123'), true);
  assert.equal(isStrongPassword('short'), false);
  assert.equal(isStrongPassword('      '), false);
});
