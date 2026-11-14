import type { BookingDetailResponse } from '@/features/bookings';
import { formatCurrency } from '@/shared/utils';

/**
 * Text encoded into the checkout QR code. Scanning it only needs to show the
 * booking code and amount, so no authenticated public URL is required.
 */
export function buildBookingQrPayload(booking: BookingDetailResponse): string {
  return [
    `Mã đơn: ${booking.bookingCode}`,
    `Số tiền: ${formatCurrency(booking.totalAmount)}`,
  ].join('\n');
}
