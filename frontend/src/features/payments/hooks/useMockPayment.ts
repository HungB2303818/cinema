import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments.api';
import type { MockPaymentRequest, PaymentResponse } from '../types/payment.types';
import { useAuth } from '@/features/auth';

export interface UseMockPaymentVariables {
  bookingId: number;
  data: MockPaymentRequest;
}

export function useMockPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<PaymentResponse, Error, UseMockPaymentVariables>({
    mutationFn: ({ bookingId, data }) => paymentsApi.mockPayment(bookingId, data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['booking-detail', variables.bookingId],
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['bookings', user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['booking-tickets', user.id, variables.bookingId],
        });
      }
    },
  });
}
