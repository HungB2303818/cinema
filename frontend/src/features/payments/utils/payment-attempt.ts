import type { PaymentAttempt } from '../types/payment.types';

const STORAGE_KEY_PREFIX = 'cinema_payment_attempt_';

export function getPaymentAttemptKey(userId: number, bookingId: number): string {
  return `${STORAGE_KEY_PREFIX}${userId}_${bookingId}`;
}

export function savePaymentAttempt(attempt: PaymentAttempt): void {
  try {
    const key = getPaymentAttemptKey(attempt.userId, attempt.bookingId);
    sessionStorage.setItem(key, JSON.stringify(attempt));
  } catch (error) {
    console.warn('Failed to save payment attempt to sessionStorage', error);
  }
}

export function getSavedPaymentAttempt(
  userId: number,
  bookingId: number
): PaymentAttempt | null {
  try {
    const key = getPaymentAttemptKey(userId, bookingId);
    const item = sessionStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === 1 &&
      parsed.userId === userId &&
      parsed.bookingId === bookingId &&
      typeof parsed.idempotencyKey === 'string' &&
      (parsed.simulatedResult === 'SUCCESS' || parsed.simulatedResult === 'FAILED')
    ) {
      return parsed as PaymentAttempt;
    }
    // Invalid structure: clean up
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export function clearPaymentAttempt(userId: number, bookingId: number): void {
  try {
    const key = getPaymentAttemptKey(userId, bookingId);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage clear errors
  }
}

export function clearAllUserPaymentAttempts(userId: number): void {
  try {
    const prefix = `${STORAGE_KEY_PREFIX}${userId}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage clear errors
  }
}
