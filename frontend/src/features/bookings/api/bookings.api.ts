import { httpClient } from '@/shared/api/http-client';
import type {
  BookingResponse,
  BookingDetailResponse,
  CreateBookingRequest,
} from '../types/booking.types';

export const bookingsApi = {
  /**
   * POST /api/bookings
   * Request: { showtimeId, seatIds, clientRequestId }
   * Response: 201 Created or 200 Replay
   */
  create: async (data: CreateBookingRequest): Promise<BookingResponse> => {
    const res = await httpClient.post<BookingResponse>('/bookings', data);
    return res.data;
  },

  /**
   * GET /api/bookings/{id}
   * Owner CUSTOMER or ADMIN
   */
  getById: async (bookingId: number): Promise<BookingDetailResponse> => {
    const res = await httpClient.get<BookingDetailResponse>(`/bookings/${bookingId}`);
    return res.data;
  },
};
