import test from "node:test";
import assert from "node:assert/strict";
import { apiError, Errors, extractErrorMessage } from "../lib/api-response.js";

test("extractErrorMessage extracts message from plain strings", () => {
  assert.equal(extractErrorMessage("Database connection timeout"), "Database connection timeout");
  assert.equal(extractErrorMessage("   Slot already booked   "), "Slot already booked");
});

test("extractErrorMessage extracts from simple error object shape", () => {
  assert.equal(extractErrorMessage({ error: "Invalid credentials" }), "Invalid credentials");
  assert.equal(extractErrorMessage({ message: "Turf not found" }), "Turf not found");
});

test("extractErrorMessage extracts from nested error object shape", () => {
  assert.equal(extractErrorMessage({ error: { message: "Nested error message" } }), "Nested error message");
  assert.equal(extractErrorMessage({ errorDetail: { message: "Detailed failure" } }), "Detailed failure");
  assert.equal(extractErrorMessage({ details: { message: "Field validation error" } }), "Field validation error");
});

test("extractErrorMessage falls back safely on empty or malformed inputs without throwing", () => {
  const fallback = "Custom fallback error.";
  assert.equal(extractErrorMessage(null, fallback), fallback);
  assert.equal(extractErrorMessage(undefined, fallback), fallback);
  assert.equal(extractErrorMessage("", fallback), fallback);
  assert.equal(extractErrorMessage({}, fallback), fallback);
  assert.equal(extractErrorMessage({ error: {} }, fallback), fallback);
  assert.equal(extractErrorMessage(12345, fallback), fallback);
  assert.equal(extractErrorMessage(true, fallback), fallback);
  assert.equal(extractErrorMessage([], fallback), fallback);
});

test("apiError builds standard structured error response with status code", async () => {
  const res = apiError({
    code: "BAD_REQUEST",
    message: "Invalid slot time requested.",
    status: 400,
    requestId: "req-123",
  });

  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.error, "Invalid slot time requested.");
  assert.equal(json.code, "BAD_REQUEST");
  assert.equal(json.message, "Invalid slot time requested.");
  assert.equal(json.requestId, "req-123");
  assert.deepEqual(json.errorDetail, {
    code: "BAD_REQUEST",
    message: "Invalid slot time requested.",
    requestId: "req-123",
  });
});

test("Errors constructors produce appropriate status and error codes", async () => {
  const badReq = Errors.badRequest("Malformed data", "r-1");
  assert.equal(badReq.status, 400);
  const badReqBody = await badReq.json();
  assert.equal(badReqBody.code, "BAD_REQUEST");

  const unauth = Errors.unauthorized("Sign in required", "r-2");
  assert.equal(unauth.status, 401);
  const unauthBody = await unauth.json();
  assert.equal(unauthBody.code, "UNAUTHORIZED");

  const forbid = Errors.forbidden("Forbidden", "r-3");
  assert.equal(forbid.status, 403);

  const notFnd = Errors.notFound("Not found", "r-4");
  assert.equal(notFnd.status, 404);

  const slotConflict = Errors.slotTaken("r-5");
  assert.equal(slotConflict.status, 409);
  const slotConflictBody = await slotConflict.json();
  assert.equal(slotConflictBody.code, "SLOT_CONFLICT");
  assert.match(slotConflictBody.message, /taken/i);

  const idemConflict = Errors.idempotencyConflict("r-6");
  assert.equal(idemConflict.status, 409);
  const idemConflictBody = await idemConflict.json();
  assert.equal(idemConflictBody.code, "IDEMPOTENCY_CONFLICT");
});
