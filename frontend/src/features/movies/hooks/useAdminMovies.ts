import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { Movie, AdminMovieQueryParams } from '../types/movie.types';
import type { PageResponse } from '@/shared/types/api.types';
import { useAuth } from '@/features/auth';

export function useAdminMovies(params: AdminMovieQueryParams = {}) {
  const { hasRole } = useAuth();

  return useQuery<PageResponse<Movie>, Error>({
    queryKey: ['admin-movies', params],
    queryFn: () => moviesApi.getAdminMovies(params),
    enabled: hasRole('ADMIN'),
    staleTime: 30 * 1000,
  });
}
