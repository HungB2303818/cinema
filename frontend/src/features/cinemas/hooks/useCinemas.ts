import { useQuery } from '@tanstack/react-query';
import { cinemasApi } from '../api/cinemas.api';

export function useCinemas() {
  return useQuery({
    queryKey: ['cinemas'],
    queryFn: cinemasApi.list,
    staleTime: 5 * 60_000,
  });
}
