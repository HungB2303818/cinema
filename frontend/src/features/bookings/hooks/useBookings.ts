import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings.api';
import type { CreateBookingRequest, BookingResponse } from '../types/booking.types';
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
      }
    },
  });
}
