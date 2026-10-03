import test from 'node:test';
import assert from 'node:assert/strict';

import { getPortalHome, resolveRoleRedirect } from '../lib/auth/guards.js';

test('getPortalHome resolves the correct dashboard for each role', () => {
  assert.equal(getPortalHome({ role: 'admin' }), '/admin');
  assert.equal(getPortalHome({ role: 'owner' }), '/owner');
  assert.equal(getPortalHome({ role: 'player' }), '/player');
  assert.equal(getPortalHome(null), '/login');
});

test('resolveRoleRedirect blocks access for the wrong role and allows matching roles', () => {
  assert.equal(resolveRoleRedirect({ role: 'admin' }, 'owner'), '/unauthorized');
  assert.equal(resolveRoleRedirect({ role: 'owner' }, 'owner'), null);
  assert.equal(resolveRoleRedirect(null, 'player'), '/login');
});
