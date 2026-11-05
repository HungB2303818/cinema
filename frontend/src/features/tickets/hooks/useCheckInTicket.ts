import { useMutation } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets.api';
import type { CheckinRequest, CheckinResponse } from '../types/ticket.types';

export function useCheckInTicket() {
  return useMutation<CheckinResponse, Error, CheckinRequest>({
    mutationFn: (request: CheckinRequest) => ticketsApi.checkIn(request),
    // FE-08: Check-in is non-idempotent without an idempotency key.
    // NEVER auto-retry a failed or timed-out check-in mutation.
    retry: false,
  });
}
