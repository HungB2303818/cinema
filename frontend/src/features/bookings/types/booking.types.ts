import type { SeatType } from '@/features/showtimes';

export interface BookingSeatItem {
  seatId: number;
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  unitPrice: number;
}

export interface Booking {
  id: number;
  bookingCode: string;
  showtimeId: number;
  movieTitle?: string;
  startsAt?: string;
  roomName?: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  seats?: BookingSeatItem[];
}

export interface CreateBookingRequest {
  showtimeId: number;
  seatIds: number[];
  clientRequestId: string;
}
