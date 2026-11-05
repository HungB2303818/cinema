import { useQuery } from '@tanstack/react-query';
import { showtimesApi } from '../api/showtimes.api';
import { useMovieShowtimes } from './useMovieShowtimes';
import type { CinemaShowtimesQueryParams } from '../types/showtime.types';

export { useMovieShowtimes };

export function useShowtimes(params?: {
  movieId?: number;
  date?: string;
  cinemaId?: number;
  page?: number;
  size?: number;
}) {
  return useMovieShowtimes(
    params?.movieId && params?.date
      ? {
          movieId: params.movieId,
          date: params.date,
          cinemaId: params.cinemaId,
          page: params.page,
          size: params.size,
        }
      : null
  );
}

export function useCinemaShowtimes(params: CinemaShowtimesQueryParams | null) {
  return useQuery({
    queryKey: ['cinema-showtimes', params?.cinemaId, params?.date, params?.page, params?.size],
    queryFn: () => showtimesApi.getCinemaShowtimes(params!),
    enabled: Boolean(params && params.cinemaId && params.date),
    staleTime: 30_000,
  });
}

export function useShowtimeSeats(
  showtimeId: number | null,
  options?: { enabled?: boolean; polling?: boolean }
) {
  const isEnabled =
    (options?.enabled ?? true) && typeof showtimeId === 'number' && showtimeId > 0;
  const shouldPoll = options?.polling ?? true;

  return useQuery({
    queryKey: ['showtime-seats', showtimeId],
    queryFn: () => showtimesApi.getSeats(showtimeId!),
    enabled: isEnabled,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? 10_000 : false,
    refetchOnWindowFocus: true,
  });
}
