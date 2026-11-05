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

export const adminShowtimesApi = {
  /**
   * GET /api/admin/showtimes
   */
  list: async (filters: import('../types/showtime.types').AdminShowtimeFilters = {}): Promise<PageResponse<Showtime>> => {
    const query = new URLSearchParams();
    if (filters.cinemaId) query.append('cinemaId', filters.cinemaId.toString());
    if (filters.roomId) query.append('roomId', filters.roomId.toString());
    if (filters.movieId) query.append('movieId', filters.movieId.toString());
    if (filters.date) query.append('date', filters.date);
    if (filters.status) query.append('status', filters.status);
    if (filters.page !== undefined) query.append('page', filters.page.toString());
    if (filters.size !== undefined) query.append('size', filters.size.toString());
    if (filters.sort) query.append('sort', filters.sort);

    const queryString = query.toString();
    const res = await httpClient.get<PageResponse<Showtime>>(
      `/admin/showtimes${queryString ? `?${queryString}` : ''}`
    );
    return res.data;
  },

  /**
   * GET /api/admin/showtimes/{id}
   */
  getById: async (id: number): Promise<Showtime> => {
    const res = await httpClient.get<Showtime>(`/admin/showtimes/${id}`);
    return res.data;
  },

  /**
   * POST /api/admin/showtimes
   * Trả về { showtime: Showtime, createdSeatCount: number }
   */
  create: async (
    payload: import('../types/showtime.types').ShowtimeRequest
  ): Promise<import('../types/showtime.types').ShowtimeCreatedResponse> => {
    const res = await httpClient.post<import('../types/showtime.types').ShowtimeCreatedResponse>(
      '/admin/showtimes',
      payload
    );
    return res.data;
  },

  /**
   * PUT /api/admin/showtimes/{id}
   * Trả về Showtime trực tiếp
   */
  update: async (
    id: number,
    payload: import('../types/showtime.types').ShowtimeRequest
  ): Promise<Showtime> => {
    const res = await httpClient.put<Showtime>(`/admin/showtimes/${id}`, payload);
    return res.data;
  },
};
