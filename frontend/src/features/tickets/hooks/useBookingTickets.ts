import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets.api';
import type { TicketItem } from '../types/ticket.types';
import { useAuth } from '@/features/auth';

export interface UseBookingTicketsOptions {
  enabled?: boolean;
}

export function useBookingTickets(
  bookingId: number | null | undefined,
  options: UseBookingTicketsOptions = {}
) {
  const { user } = useAuth();
  const isEnabled = Boolean(bookingId && user?.id && options.enabled !== false);

  return useQuery<TicketItem[], Error>({
    queryKey: ['booking-tickets', user?.id, bookingId],
    queryFn: () => ticketsApi.getByBookingId(bookingId!),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // Tickets for confirmed booking don't mutate
  });
}
