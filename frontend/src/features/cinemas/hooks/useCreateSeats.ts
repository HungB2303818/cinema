import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { SeatBatchRequest, SeatResponse } from '../types/cinema.types';

export const useCreateSeats = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation<SeatResponse[], Error, SeatBatchRequest>({
    mutationFn: (payload) => adminCinemasApi.createSeats(roomId, payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seats', roomId] });
    },
  });
};
