import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets.api';

export function useMyTickets() {
  return useQuery({
    queryKey: ['my-tickets'],
    queryFn: ticketsApi.getMyTickets,
    staleTime: 30_000,
  });
}
