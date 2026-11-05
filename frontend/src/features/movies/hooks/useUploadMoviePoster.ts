import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi } from '../api/movies.api';
import type { Movie } from '../types/movie.types';

export function useUploadMoviePoster() {
  const queryClient = useQueryClient();

  return useMutation<Movie, Error, { id: number; file: File }>({
    mutationFn: ({ id, file }) => moviesApi.uploadPoster(id, file),
    retry: false, // Never auto-retry file upload to avoid duplicated uploads or side effects
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movie-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cinema-showtimes'] });
    },
  });
}
