import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { Movie } from '../types/movie.types';
import { useAuth } from '@/features/auth';

export function useAdminMovieDetail(id: number | null | undefined) {
  const { hasRole } = useAuth();

  return useQuery<Movie, Error>({
    queryKey: ['admin-movie-detail', id],
    queryFn: () => moviesApi.getAdminMovieById(id!),
    enabled: Boolean(id && id > 0 && hasRole('ADMIN')),
  });
}
