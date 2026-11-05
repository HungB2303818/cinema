import type { BookingStatus } from '@/features/bookings';
import type { TicketItem } from '@/features/tickets';

export type PaymentSimulatedResult = 'SUCCESS' | 'FAILED';
export type PaymentStatus = 'SUCCESS' | 'FAILED';

export interface MockPaymentRequest {
  simulatedResult: PaymentSimulatedResult;
  idempotencyKey: string;
}

export interface PaymentResponse {
  bookingId: number;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  tickets?: TicketItem[];
  message?: string;
}

export interface PaymentAttempt {
  version: number;
  userId: number;
  bookingId: number;
  simulatedResult: PaymentSimulatedResult;
  idempotencyKey: string;
  createdAt: string;
  status: 'PENDING' | 'INDETERMINATE' | 'FAILED' | 'SUCCESS';
}
