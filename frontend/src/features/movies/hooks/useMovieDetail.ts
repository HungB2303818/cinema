import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';

export function useMovieDetail(id: number) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getById(id),
    enabled: !isNaN(id) && id > 0,
    staleTime: 5 * 60_000,
  });
}
