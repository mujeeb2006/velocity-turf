export const BOOKING_QR_PREFIX = "velocity-turf:booking:";
export const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extracts and validates a booking UUID from a QR code string or manual input.
 * Supports:
 * - "velocity-turf:booking:123e4567-e89b-12d3-a456-426614174000"
 * - "123e4567-e89b-12d3-a456-426614174000"
 * - URLs or text containing a UUID
 *
 * @param {string} text
 * @returns {string|null} The normalized lowercase UUID, or null if invalid.
 */
export function parseBookingQr(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const match = trimmed.match(UUID_REGEX);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Generates the standardized QR payload for a booking.
 * Matches existing player QR generator in PlayerAppClient.
 *
 * @param {string} bookingId
 * @returns {string}
 */
export function formatBookingQr(bookingId) {
  const cleanId = parseBookingQr(bookingId) || bookingId;
  return `${BOOKING_QR_PREFIX}${cleanId}`;
}
