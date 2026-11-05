import { useQuery } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { Cinema } from '../types/cinema.types';

export const useAdminCinemas = (page = 0, size = 20, sort = 'id,asc') => {
  return useQuery<PageResponse<Cinema>, Error>({
    queryKey: ['admin', 'cinemas', page, size, sort],
    queryFn: () => adminCinemasApi.listCinemas(page, size, sort),
    staleTime: 30000,
  });
};
