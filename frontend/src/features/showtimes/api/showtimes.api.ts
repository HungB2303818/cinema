import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type {
  Showtime,
  ShowtimeQueryParams,
  SeatMapResponse,
  CinemaMovieShowtimeGroup,
  CinemaShowtimesQueryParams,
} from '../types/showtime.types';

export const showtimesApi = {
  /**
   * GET /api/movies/{id}/showtimes?date=...&cinemaId=...&page=...&size=...&sort=...
   * Note: date is required by backend, cinemaId is optional.
   */
  getMovieShowtimes: async (params: ShowtimeQueryParams): Promise<PageResponse<Showtime>> => {
    const query = new URLSearchParams();
    query.append('date', params.date);
    if (params.cinemaId) query.append('cinemaId', params.cinemaId.toString());
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());
    if (params.sort) query.append('sort', params.sort);

    const res = await httpClient.get<PageResponse<Showtime>>(
      `/movies/${params.movieId}/showtimes?${query.toString()}`
    );
    return res.data;
  },

  /**
   * GET /api/cinemas/{id}/showtimes?date=...&page=...&size=...
   * Note: date is required by backend, groups by movie.
   */
  getCinemaShowtimes: async (
    params: CinemaShowtimesQueryParams
  ): Promise<PageResponse<CinemaMovieShowtimeGroup>> => {
    const query = new URLSearchParams();
    query.append('date', params.date);
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());

    const res = await httpClient.get<PageResponse<CinemaMovieShowtimeGroup>>(
      `/cinemas/${params.cinemaId}/showtimes?${query.toString()}`
    );
    return res.data;
  },

  /**
   * GET /api/showtimes/{id}/seats
   */
  getSeats: async (showtimeId: number): Promise<SeatMapResponse> => {
    const res = await httpClient.get<SeatMapResponse>(`/showtimes/${showtimeId}/seats`);
    return res.data;
  },
};
