import type { Booking } from '@/features/bookings';

export interface TicketItem {
  seatId: number;
  label: string;
  ticketCode: string;
}

export type TicketBooking = Booking;

/**
 * FE-08: Check-in ticket request DTO.
 * ticketCode must be non-blank, max 48 characters.
 * Preserves exact code without trimming, case-folding, or truncating.
 */
export interface CheckinRequest {
  ticketCode: string;
}

/**
 * FE-08: Check-in ticket response DTO from POST /api/staff/tickets/check-in.
 */
export interface CheckinResponse {
  result: 'CHECKED_IN' | string;
  movieTitle: string;
  roomName: string;
  seatLabel: string;
  checkedInAt: string; // ISO 8601 UTC timestamp
}
