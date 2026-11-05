import { httpClient } from '@/shared/api/http-client';
import type { CheckinRequest, CheckinResponse, TicketItem } from '../types/ticket.types';

export const ticketsApi = {
  /**
   * FE-06: Fetch issued tickets for a CONFIRMED booking.
   * Server returns 409 BOOKING_STATE_CONFLICT if booking is not CONFIRMED.
   */
  getByBookingId: async (bookingId: number): Promise<TicketItem[]> => {
    const res = await httpClient.get<TicketItem[]>(`/bookings/${bookingId}/tickets`);
    return res.data;
  },

  /**
   * FE-08: Check in a single ticket using its exact ticketCode.
   * Restricted to STAFF or ADMIN roles.
   * Note: staffId is resolved on server from the authenticated JWT principal.
   */
  checkIn: async (request: CheckinRequest): Promise<CheckinResponse> => {
    const res = await httpClient.post<CheckinResponse>('/staff/tickets/check-in', request);
    return res.data;
  },
};
