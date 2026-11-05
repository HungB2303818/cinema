import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { Movie, MovieRequest } from '../types/movie.types';

export function useUpdateMovie() {
  const queryClient = useQueryClient();

  return useMutation<Movie, Error, { id: number; data: MovieRequest }>({
    mutationFn: ({ id, data }) => moviesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate admin list and details
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movie-detail', variables.id] });

      // Invalidate public queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cinema-showtimes'] });
    },
  });
}
