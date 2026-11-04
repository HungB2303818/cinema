import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { MovieQueryParams } from '../types/movie.types';

export function useMovies(params?: MovieQueryParams) {
  return useQuery({
    queryKey: ['movies', params],
    queryFn: () => moviesApi.list(params),
    staleTime: 60_000,
  });
}
