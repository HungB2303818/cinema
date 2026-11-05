import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { SeatRequest, SeatResponse } from '../types/cinema.types';

export const useUpdateSeat = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation<SeatResponse, Error, { seatId: number; payload: SeatRequest }>({
    mutationFn: ({ seatId, payload }) => adminCinemasApi.updateSeat(roomId, seatId, payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seats', roomId] });
    },
  });
};
