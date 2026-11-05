import { useQuery } from '@tanstack/react-query';
import { adminShowtimesApi } from '../api/showtimes.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { Showtime, AdminShowtimeFilters } from '../types/showtime.types';

export const useAdminShowtimes = (filters: AdminShowtimeFilters = {}) => {
  return useQuery<PageResponse<Showtime>, Error>({
    queryKey: ['admin', 'showtimes', filters],
    queryFn: () => adminShowtimesApi.list(filters),
    staleTime: 30000,
  });
};
