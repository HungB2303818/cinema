import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { Movie, MovieRequest } from '../types/movie.types';

export function useCreateMovie() {
  const queryClient = useQueryClient();

  return useMutation<Movie, Error, MovieRequest>({
    mutationFn: (data: MovieRequest) => moviesApi.create(data),
    onSuccess: () => {
      // Invalidate both admin and public queries
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
}
