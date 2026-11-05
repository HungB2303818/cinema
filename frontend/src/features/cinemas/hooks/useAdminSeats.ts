import { useQuery } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { SeatResponse } from '../types/cinema.types';

export const useAdminSeats = (roomId?: number) => {
  return useQuery<SeatResponse[], Error>({
    queryKey: ['admin', 'seats', roomId],
    queryFn: () => adminCinemasApi.listSeats(roomId!),
    enabled: typeof roomId === 'number' && roomId > 0,
    staleTime: 30000,
  });
};
