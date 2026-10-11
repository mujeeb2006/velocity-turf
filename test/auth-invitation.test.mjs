import test from "node:test";
import assert from "node:assert/strict";

import { getSiteUrl, sanitizeRedirectPath } from "../lib/auth/url.js";
import {
  normalizeEmail,
  normalizeUserRole,
  isValidEmail,
  isStrongPassword,
} from "../lib/auth/validation.js";

test("getSiteUrl prefers NEXT_PUBLIC_SITE_URL environment variable when set", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://velocityturf.com/";
    assert.equal(getSiteUrl(), "https://velocityturf.com");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl resolves host from x-forwarded-host header", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const mockRequest = {
      headers: new Headers({
        "x-forwarded-host": "preview.velocityturf.app",
        "x-forwarded-proto": "https",
      }),
      url: "http://internal-node:3000/api/admin/owners",
    };
    assert.equal(getSiteUrl(mockRequest), "https://preview.velocityturf.app");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl falls back to request url origin", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const mockRequest = {
      headers: new Headers(),
      url: "http://localhost:3000/api/admin/owners",
    };
    assert.equal(getSiteUrl(mockRequest), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("getSiteUrl defaults to localhost:3000 when no request provided", () => {
  const oldEnv = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    assert.equal(getSiteUrl(), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = oldEnv;
  }
});

test("sanitizeRedirectPath permits safe relative application paths", () => {
  assert.equal(sanitizeRedirectPath("/auth/set-password"), "/auth/set-password");
  assert.equal(sanitizeRedirectPath("/owner"), "/owner");
  assert.equal(sanitizeRedirectPath("/"), "/");
});

test("sanitizeRedirectPath rejects open redirects and external URLs", () => {
  assert.equal(sanitizeRedirectPath("//evil.com", "/auth/set-password"), "/auth/set-password");
  assert.equal(sanitizeRedirectPath("https://evil.com", "/auth/set-password"), "/auth/set-password");
  assert.equal(sanitizeRedirectPath("javascript:alert(1)", "/auth/set-password"), "/auth/set-password");
  assert.equal(sanitizeRedirectPath(null, "/fallback"), "/fallback");
});

test("Owner role normalization correctly identifies owner variants", () => {
  assert.equal(normalizeUserRole("owner"), "owner");
  assert.equal(normalizeUserRole("OWNER"), "owner");
  assert.equal(normalizeUserRole("turf_owner"), "owner");
  assert.equal(normalizeUserRole("turf owner"), "owner");
  assert.equal(normalizeUserRole("admin"), "admin");
  assert.equal(normalizeUserRole("player"), "player");
  assert.equal(normalizeUserRole(""), "player");
});

test("Email and password validation accurately checks inputs", () => {
  assert.equal(isValidEmail("owner@turf.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(normalizeEmail("  OWNER@Turf.COM  "), "owner@turf.com");

  assert.equal(isStrongPassword("short"), false);
  assert.equal(isStrongPassword("1234567"), false);
  assert.equal(isStrongPassword("12345678"), true);
  assert.equal(isStrongPassword("SecretP@ssword123"), true);
});
