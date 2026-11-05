import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminShowtimesApi } from '../api/showtimes.api';
import type { ShowtimeRequest, ShowtimeCreatedResponse } from '../types/showtime.types';

export const useCreateShowtime = () => {
  const queryClient = useQueryClient();

  return useMutation<ShowtimeCreatedResponse, Error, ShowtimeRequest>({
    mutationFn: (payload) => adminShowtimesApi.create(payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['cinemas'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};
