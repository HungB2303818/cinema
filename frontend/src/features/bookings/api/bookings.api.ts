import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type {
  BookingResponse,
  BookingDetailResponse,
  BookingSummaryItem,
  BookingCancelResponse,
  BookingHistoryQueryParams,
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

  /**
   * GET /api/bookings/me?page=0&size=20&sort=createdAt,desc
   * Only authenticated CUSTOMER
   */
  getHistory: async (
    params?: BookingHistoryQueryParams
  ): Promise<PageResponse<BookingSummaryItem>> => {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    const sort = params?.sort ?? 'createdAt,desc';

    const res = await httpClient.get<PageResponse<BookingSummaryItem>>(
      `/bookings/me?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`
    );
    return res.data;
  },

  /**
   * POST /api/bookings/{id}/cancel
   * Only authenticated CUSTOMER owner of PENDING booking
   */
  cancel: async (bookingId: number): Promise<BookingCancelResponse> => {
    const res = await httpClient.post<BookingCancelResponse>(
      `/bookings/${bookingId}/cancel`
    );
    return res.data;
  },
};
