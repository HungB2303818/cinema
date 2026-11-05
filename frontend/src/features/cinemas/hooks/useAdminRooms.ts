import { useQuery } from '@tanstack/react-query';
import { adminCinemasApi } from '../api/cinemas.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { RoomResponse } from '../types/cinema.types';

export const useAdminRooms = (cinemaId?: number, page = 0, size = 20, sort = 'id,asc') => {
  return useQuery<PageResponse<RoomResponse>, Error>({
    queryKey: ['admin', 'rooms', cinemaId, page, size, sort],
    queryFn: () => adminCinemasApi.listRooms(cinemaId!, page, size, sort),
    enabled: typeof cinemaId === 'number' && cinemaId > 0,
    staleTime: 30000,
  });
};
