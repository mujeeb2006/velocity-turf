import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPageScroll, useScrollResetOnTab } from '../lib/scroll.js';

test('resetPageScroll: safe in non-browser / SSR environment without throwing', () => {
  assert.doesNotThrow(() => {
    resetPageScroll();
  });
});

test('useScrollResetOnTab: exports properly as a callable hook', () => {
  assert.equal(typeof useScrollResetOnTab, 'function');
});

test('resetPageScroll: resets window, document, and container scroll offsets when DOM is present', () => {
  let windowScrolledTo = null;
  const mockContainer1 = { scrollTop: 350 };
  const mockContainer2 = { scrollTop: 120 };
  const mockContainer3 = { scrollTop: 0 };

  global.window = {
    scrollTo: (options) => {
      windowScrolledTo = options;
    },
    history: { scrollRestoration: 'auto' },
  };

  global.document = {
    documentElement: { scrollTop: 400 },
    body: { scrollTop: 250 },
    querySelectorAll: (selector) => {
      if (selector.includes('main') || selector.includes('vt-dashboard-main')) {
        return [mockContainer1, mockContainer2, mockContainer3];
      }
      return [];
    },
  };

  global.requestAnimationFrame = (callback) => {
    callback();
  };

  try {
    resetPageScroll();

    assert.deepEqual(windowScrolledTo, { top: 0, left: 0, behavior: 'instant' });
    assert.equal(global.document.documentElement.scrollTop, 0);
    assert.equal(global.document.body.scrollTop, 0);
    assert.equal(mockContainer1.scrollTop, 0);
    assert.equal(mockContainer2.scrollTop, 0);
    assert.equal(mockContainer3.scrollTop, 0);
  } finally {
    delete global.window;
    delete global.document;
    delete global.requestAnimationFrame;
  }
});
