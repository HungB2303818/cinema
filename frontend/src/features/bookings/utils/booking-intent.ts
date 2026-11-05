import type { BookingIntent } from '../types/booking.types';

const INTENT_KEY_PREFIX = 'cinema_booking_intent_';

function getIntentKey(userId: number): string {
  return `${INTENT_KEY_PREFIX}${userId}`;
}

/**
 * Retrieve saved booking intent for a specific user from sessionStorage.
 * Handles corrupted JSON and missing/invalid fields safely.
 */
export function getSavedBookingIntent(userId: number): BookingIntent | null {
  try {
    const raw = sessionStorage.getItem(getIntentKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.userId === userId &&
      typeof parsed.showtimeId === 'number' &&
      Array.isArray(parsed.seatIds) &&
      typeof parsed.clientRequestId === 'string'
    ) {
      return parsed as BookingIntent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save booking intent to sessionStorage before initiating POST request.
 * Does not store sensitive tokens or ticket codes.
 */
export function saveBookingIntent(intent: BookingIntent): void {
  try {
    sessionStorage.setItem(getIntentKey(intent.userId), JSON.stringify(intent));
  } catch (err) {
    console.warn('Failed to save booking intent to sessionStorage:', err);
  }
}

/**
 * Update existing intent with created bookingId.
 */
export function updateBookingIntentWithId(
  userId: number,
  clientRequestId: string,
  bookingId: number
): void {
  const current = getSavedBookingIntent(userId);
  if (current && current.clientRequestId === clientRequestId) {
    saveBookingIntent({ ...current, bookingId });
  }
}

/**
 * Clear booking intent for a given user from sessionStorage.
 */
export function clearBookingIntent(userId: number): void {
  try {
    sessionStorage.removeItem(getIntentKey(userId));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if the stored intent matches the current selection.
 */
export function isMatchingIntent(
  stored: BookingIntent | null,
  showtimeId: number,
  sortedSeatIds: number[]
): boolean {
  if (!stored) return false;
  if (stored.showtimeId !== showtimeId) return false;
  if (stored.seatIds.length !== sortedSeatIds.length) return false;
  return stored.seatIds.every((id, idx) => id === sortedSeatIds[idx]);
}
