package com.example.cinema.payment.service;

import com.example.cinema.auth.entity.User;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.payment.dto.MockPaymentRequest;
import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.ticket.service.TicketCodes;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentTransactionsTest {
    final BookingRepository bookings = mock(BookingRepository.class);
    final BookingSeatRepository selections = mock(BookingSeatRepository.class);
    final ShowtimeSeatRepository inventory = mock(ShowtimeSeatRepository.class);
    final PaymentRepository payments = mock(PaymentRepository.class);
    final DatabaseTime time = mock(DatabaseTime.class);
    final TicketCodes codes = mock(TicketCodes.class);
    final PaymentTransactions worker = new PaymentTransactions(bookings, selections, inventory, payments, codes, time);
    final Instant now = Instant.parse("2026-11-10T11:30:00Z");
    final Room room = Room.builder().id(2L).build();
    final Showtime showtime = Showtime.builder().id(3L).room(room).build();
    final Booking booking = Booking.builder().id(1L).user(User.builder().id(7L).build()).showtime(showtime)
            .totalAmount(new BigDecimal("20.00")).expiresAt(now.plusSeconds(60)).build();
    final MockPaymentRequest request = new MockPaymentRequest(MockPaymentRequest.Result.SUCCESS, "key");
    ShowtimeSeat first, second;

    @BeforeEach void fixture() {
        first = row(3L); second = row(9L);
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(selections.findInventoryIds(1L)).thenReturn(List.of(9L, 3L));
        when(inventory.findByIdForUpdate(3L)).thenReturn(Optional.of(first));
        when(inventory.findByIdForUpdate(9L)).thenReturn(Optional.of(second));
        when(selections.findDetails(1L)).thenReturn(List.of(item(first), item(second)));
        when(time.now()).thenReturn(now);
        when(payments.saveAndFlush(any(Payment.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test void locksBookingThenIndividualInventoryAscendingThenReadsClockAndWrites() {
        when(codes.generate()).thenReturn("code-1", "code-2");
        worker.pay(7L, 1L, request);
        var order = inOrder(bookings, selections, inventory, time, payments);
        order.verify(bookings).findByIdForUpdate(1L);
        order.verify(selections).findInventoryIds(1L);
        order.verify(inventory).findByIdForUpdate(3L);
        order.verify(inventory).findByIdForUpdate(9L);
        order.verify(time).now();
        order.verify(payments).saveAndFlush(any(Payment.class));
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(first.getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
    }

    @Test void timeElapsedWaitingForSeatLocksCannotConfirmExpiredBooking() {
        when(inventory.findByIdForUpdate(9L)).thenAnswer(call -> {
            when(time.now()).thenReturn(booking.getExpiresAt());
            return Optional.of(second);
        });
        assertCode(ErrorCode.BOOKING_EXPIRED);
        verify(payments, never()).saveAndFlush(any()); verifyNoInteractions(codes);
    }

    @Test void oneReclaimedSeatRejectsEntirePaymentBeforeAnyMutation() {
        second.setCurrentBookingId(99L);
        assertCode(ErrorCode.BOOKING_STATE_CONFLICT);
        assertThat(first.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
        verify(payments, never()).saveAndFlush(any());
    }

    @Test void crossShowtimeInventoryIsRejected() {
        second.setShowtime(Showtime.builder().id(99L).room(room).build());
        assertCode(ErrorCode.SEAT_NOT_IN_ROOM);
        verify(payments, never()).saveAndFlush(any());
    }

    @Test void crossRoomPhysicalSeatIsRejected() {
        second.getSeat().setRoom(Room.builder().id(99L).build());
        assertCode(ErrorCode.SEAT_NOT_IN_ROOM);
    }

    @Test void failedPaymentNeverIssuesTicketsOrChangesBooking() {
        var response = worker.pay(7L, 1L, new MockPaymentRequest(MockPaymentRequest.Result.FAILED, "key"));
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(first.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        verifyNoInteractions(codes);
    }

    @Test void ownerIsCheckedBeforeGlobalKeyLookup() {
        assertThatThrownBy(() -> worker.pay(8L, 1L, request)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        verifyNoInteractions(payments, selections, inventory);
    }

    private ShowtimeSeat row(Long id) {
        return ShowtimeSeat.builder().id(id).showtime(showtime).seat(Seat.builder().id(id).room(room).seatRow("A").seatNumber(id.intValue()).build())
                .status(ShowtimeSeatStatus.HELD).currentBookingId(1L).holdExpiresAt(booking.getExpiresAt()).build();
    }
    private BookingSeat item(ShowtimeSeat row) { return BookingSeat.builder().booking(booking).showtimeSeat(row).unitPrice(BigDecimal.TEN).build(); }
    private void assertCode(ErrorCode code) {
        assertThatThrownBy(() -> worker.pay(7L, 1L, request)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
