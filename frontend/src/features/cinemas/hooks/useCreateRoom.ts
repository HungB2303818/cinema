import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { RoomRequest, RoomResponse } from '../types/cinema.types';

export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation<RoomResponse, Error, RoomRequest>({
    mutationFn: (payload) => adminCinemasApi.createRoom(payload),
    retry: false, // No auto-retry for mutations without idempotency
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms', variables.cinemaId] });
      queryClient.invalidateQueries({ queryKey: ['cinemas'] });
    },
  });
};
