import type { SeatType } from '@/features/showtimes';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export interface CreateBookingRequest {
  showtimeId: number;
  seatIds: number[];
  clientRequestId: string;
}

export interface BookingResponse {
  bookingId: number;
  bookingCode: string;
  showtimeId: number;
  status: BookingStatus;
  seatIds: number[];
  totalAmount: number;
  expiresAt: string;
}

export interface BookingDetailSeatItem {
  seatId: number;
  label: string;
  seatType: SeatType;
  unitPrice: number;
}

export interface BookingDetailResponse {
  bookingId: number;
  bookingCode: string;
  showtimeId: number;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  status: BookingStatus;
  effectiveStatus: BookingStatus;
  totalAmount: number;
  createdAt: string;
  expiresAt: string;
  seats: BookingDetailSeatItem[];
}

export interface BookingIntent {
  version: 1;
  userId: number;
  showtimeId: number;
  seatIds: number[]; // sorted ascending, deduplicated
  clientRequestId: string;
  createdAt: string;
  bookingId?: number;
}

/**
 * General Booking interface supporting both legacy mock tickets and real booking responses
 */
export interface Booking {
  id?: number;
  bookingId?: number;
  bookingCode: string;
  showtimeId?: number;
  movieTitle?: string;
  startsAt?: string;
  roomName?: string;
  totalAmount: number;
  status: BookingStatus;
  effectiveStatus?: BookingStatus;
  expiresAt: string;
  createdAt?: string;
  seatIds?: number[];
  seats?: Array<{
    seatId?: number;
    label?: string;
    seatRow?: string;
    seatNumber?: number;
    seatType?: SeatType;
    unitPrice?: number;
  }>;
}
