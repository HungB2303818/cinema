import { useQuery } from '@tanstack/react-query';
import { showtimesApi } from '../api/showtimes.api';

export function useShowtimes(params?: { movieId?: number; date?: string; cinemaId?: number }) {
  return useQuery({
    queryKey: ['showtimes', params],
    queryFn: () => showtimesApi.list(params),
    staleTime: 30_000,
  });
}

export function useShowtimeSeats(showtimeId: number | null) {
  return useQuery({
    queryKey: ['showtime-seats', showtimeId],
    queryFn: () => showtimesApi.getSeats(showtimeId!),
    enabled: typeof showtimeId === 'number' && showtimeId > 0,
    staleTime: 10_000,
  });
}
