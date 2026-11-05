import { useQuery } from '@tanstack/react-query';
import { showtimesApi } from '../api/showtimes.api';
import type { ShowtimeQueryParams } from '../types/showtime.types';
import type { ApiErrorResponse } from '@/shared/api/http-client';

export function useMovieShowtimes(params: ShowtimeQueryParams | null | undefined) {
  const movieId = params?.movieId;
  const date = params?.date;

  const isValidMovieId = typeof movieId === 'number' && !isNaN(movieId) && movieId > 0;
  const isValidDate = Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
  const isEnabled = isValidMovieId && isValidDate;

  return useQuery({
    queryKey: [
      'movie-showtimes',
      movieId,
      date,
      params?.cinemaId,
      params?.page ?? 0,
      params?.size ?? 20,
      params?.sort ?? 'startsAt,asc',
    ],
    queryFn: () => showtimesApi.getMovieShowtimes(params!),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: (failureCount, error: Error) => {
      const apiErr = error as ApiErrorResponse;
      if (apiErr?.status === 404 || apiErr?.code === 'RESOURCE_NOT_FOUND') {
        return false;
      }
      if (import.meta.env.MODE === 'test') {
        return false;
      }
      return failureCount < 1;
    },
  });
}
