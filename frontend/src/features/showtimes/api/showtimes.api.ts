import { httpClient } from '@/shared/api/http-client';
import type { Showtime, ShowtimeSeat } from '../types/showtime.types';

export const showtimesApi = {
  list: async (params?: { movieId?: number; date?: string; cinemaId?: number }): Promise<Showtime[]> => {
    const query = new URLSearchParams();
    if (params?.movieId) query.append('movieId', params.movieId.toString());
    if (params?.date) query.append('date', params.date);
    if (params?.cinemaId) query.append('cinemaId', params.cinemaId.toString());

    const res = await httpClient.get<Showtime[]>(`/showtimes?${query.toString()}`);
    return res.data;
  },

  getSeats: async (showtimeId: number): Promise<ShowtimeSeat[]> => {
    const res = await httpClient.get<ShowtimeSeat[]>(`/showtimes/${showtimeId}/seats`);
    return res.data;
  },
};
