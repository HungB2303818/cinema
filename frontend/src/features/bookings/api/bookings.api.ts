import { httpClient } from '@/shared/api/http-client';
import type { Booking, CreateBookingRequest } from '../types/booking.types';

export const bookingsApi = {
  create: async (data: CreateBookingRequest): Promise<Booking> => {
    const res = await httpClient.post<Booking>('/bookings', data);
    return res.data;
  },
};
