import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminShowtimesApi } from '../api/showtimes.api';
import type { ShowtimeRequest, Showtime } from '../types/showtime.types';

export const useUpdateShowtime = (showtimeId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<Showtime, Error, ShowtimeRequest>({
    mutationFn: (payload) => {
      if (!showtimeId) throw new Error('Showtime ID is required for update');
      return adminShowtimesApi.update(showtimeId, payload);
    },
    retry: false,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'showtimes', 'detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['cinemas'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};
