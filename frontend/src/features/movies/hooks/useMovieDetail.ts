import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { ApiErrorResponse } from '@/shared/api/http-client';

export function useMovieDetail(id: number) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getById(id),
    enabled: typeof id === 'number' && !isNaN(id) && id > 0,
    staleTime: 60_000,
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
