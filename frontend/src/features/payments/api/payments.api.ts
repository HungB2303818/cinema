import { httpClient } from '@/shared/api/http-client';
import type { MockPaymentRequest, PaymentResponse } from '../types/payment.types';

export const paymentsApi = {
  /**
   * POST /api/bookings/{bookingId}/payments/mock
   * Simulated payment (SUCCESS or FAILED) with idempotencyKey.
   * Only authenticated CUSTOMER owner can call this.
   */
  mockPayment: async (
    bookingId: number,
    data: MockPaymentRequest
  ): Promise<PaymentResponse> => {
    const res = await httpClient.post<PaymentResponse>(
      `/bookings/${bookingId}/payments/mock`,
      data
    );
    return res.data;
  },
};
