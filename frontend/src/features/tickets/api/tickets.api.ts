import { httpClient } from '@/shared/api/http-client';
import type { Booking } from '@/features/bookings';

export const ticketsApi = {
  getMyTickets: async (): Promise<Booking[]> => {
    const res = await httpClient.get<Booking[]>('/tickets/my');
    return res.data;
  },
};
