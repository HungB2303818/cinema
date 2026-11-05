import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { RoomRequest, RoomResponse } from '../types/cinema.types';

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation<RoomResponse, Error, { id: number; payload: RoomRequest }>({
    mutationFn: ({ id, payload }) => adminCinemasApi.updateRoom(id, payload),
    retry: false,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms', variables.payload.cinemaId] });
      queryClient.invalidateQueries({ queryKey: ['cinemas'] });
    },
  });
};
