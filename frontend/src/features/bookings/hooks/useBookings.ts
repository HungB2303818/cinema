import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings.api';
import type {
  CreateBookingRequest,
  BookingResponse,
  BookingHistoryQueryParams,
  BookingSummaryItem,
  BookingCancelResponse,
} from '../types/booking.types';
import type { PageResponse } from '@/shared/types/api.types';
import { useAuth } from '@/features/auth';

export function useBookingDetail(
  bookingId: number | null,
  options?: { enabled?: boolean; polling?: boolean }
) {
  const { user } = useAuth();
  const isEnabled =
    (options?.enabled ?? true) &&
    typeof bookingId === 'number' &&
    bookingId > 0 &&
    Boolean(user?.id);
  const shouldPoll = options?.polling ?? false;

  return useQuery({
    queryKey: ['bookings', user?.id, bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: isEnabled,
    staleTime: 5_000,
    refetchInterval: shouldPoll ? 10_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useBookingHistory(
  params?: BookingHistoryQueryParams,
  options?: { enabled?: boolean }
) {
  const { user } = useAuth();
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const sort = params?.sort ?? 'createdAt,desc';

  const isEnabled =
    (options?.enabled ?? true) &&
    Boolean(user?.id && user?.role === 'CUSTOMER');

  return useQuery<PageResponse<BookingSummaryItem>, Error>({
    queryKey: ['bookings-history', user?.id, page, size, sort],
    queryFn: () => bookingsApi.getHistory({ page, size, sort }),
    enabled: isEnabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<BookingResponse, unknown, CreateBookingRequest>({
    mutationFn: (data: CreateBookingRequest) => bookingsApi.create(data),
    onSuccess: (data) => {
      // Invalidate seat map and user booking queries
      queryClient.invalidateQueries({
        queryKey: ['showtime-seats', data.showtimeId],
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['bookings', user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['bookings-history', user.id],
        });
      }
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<BookingCancelResponse, Error, number>({
    mutationFn: (bookingId: number) => bookingsApi.cancel(bookingId),
    onSuccess: (_, bookingId) => {
      // Invalidate target booking, user history and seat maps
      queryClient.invalidateQueries({
        queryKey: ['bookings', user?.id, bookingId],
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['bookings-history', user.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['showtime-seats'],
      });
    },
  });
}
