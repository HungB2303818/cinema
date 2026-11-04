import { useQuery } from '@tanstack/react-query';
import { cinemasApi } from '../api/cinemas.api';

export function useCinemaDetail(id: number | null) {
  return useQuery({
    queryKey: ['cinema', id],
    queryFn: () => cinemasApi.getById(id!),
    enabled: typeof id === 'number' && id > 0,
    staleTime: 5 * 60_000,
  });
}
