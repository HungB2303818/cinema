import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminShowtimesApi } from '../api/showtimes.api';
import type {
  BatchAutoGenerateShowtimesRequest,
  BatchAutoGenerateShowtimesResponse,
} from '../types/showtime.types';

export const usePreviewAutoGenerateShowtimes = () => {
  return useMutation<
    BatchAutoGenerateShowtimesResponse,
    Error,
    BatchAutoGenerateShowtimesRequest
  >({
    mutationFn: (payload) => adminShowtimesApi.previewAutoGenerate(payload),
    retry: false,
  });
};

export const useAutoGenerateShowtimes = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BatchAutoGenerateShowtimesResponse,
    Error,
    BatchAutoGenerateShowtimesRequest
  >({
    mutationFn: (payload) => adminShowtimesApi.autoGenerate(payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['cinema-showtimes'] });
    },
  });
};
