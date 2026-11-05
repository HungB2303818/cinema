import { useQuery } from '@tanstack/react-query';
import { adminShowtimesApi } from '../api/showtimes.api';
import type { Showtime } from '../types/showtime.types';

export const useAdminShowtimeDetail = (id?: number) => {
  return useQuery<Showtime, Error>({
    queryKey: ['admin', 'showtimes', 'detail', id],
    queryFn: () => adminShowtimesApi.getById(id!),
    enabled: typeof id === 'number' && id > 0,
    staleTime: 30000,
  });
};
