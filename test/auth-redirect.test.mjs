import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectPath } from "../lib/auth/url.js";

test("keeps legitimate same-site paths, including booking-resume URLs", () => {
  assert.equal(sanitizeRedirectPath("/player", "/"), "/player");
  assert.equal(sanitizeRedirectPath("/owner", "/"), "/owner");
  assert.equal(sanitizeRedirectPath("/?resumeBooking=abc_DEF-123", "/x"), "/?resumeBooking=abc_DEF-123");
  assert.equal(sanitizeRedirectPath("/player?resumeBooking=abc&tab=discover", "/x"), "/player?resumeBooking=abc&tab=discover");
});

test("rejects absolute, protocol-relative and scheme URLs (open redirect)", () => {
  for (const evil of ["https://evil.example", "http://evil.example/a", "//evil.example", "///evil.example", "javascript:alert(1)", "data:text/html,hi", "/redirect?to=https://evil.example"]) {
    assert.equal(sanitizeRedirectPath(evil, "/safe"), "/safe", evil);
  }
});

test("rejects backslash and control-character tricks that browsers turn into '//'", () => {
  for (const evil of ["/\\evil.example", "/\\/evil.example", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\u0000/evil.example"]) {
    assert.equal(sanitizeRedirectPath(evil, "/safe"), "/safe", JSON.stringify(evil));
  }
});

test("rejects non-strings, empty and relative values", () => {
  for (const bad of [undefined, null, 42, {}, [], "", "   ", "player", "./player", "../x"]) {
    assert.equal(sanitizeRedirectPath(bad, "/safe"), "/safe", String(bad));
  }
});
