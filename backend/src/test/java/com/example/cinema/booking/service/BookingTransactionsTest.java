package com.example.cinema.booking.service;

import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import org.junit.jupiter.api.*;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingTransactionsTest {
    final BookingRepository bookings = mock(BookingRepository.class);
    final BookingSeatRepository selections = mock(BookingSeatRepository.class);
    final ShowtimeSeatRepository inventory = mock(ShowtimeSeatRepository.class);
    final DatabaseTime time = mock(DatabaseTime.class);
    final BookingTransactions worker = new BookingTransactions(bookings, selections, mock(ShowtimeRepository.class),
            inventory, mock(SeatRepository.class), mock(UserRepository.class), time);
    final Instant now = Instant.parse("2026-11-10T11:30:00Z");
    final Room room = Room.builder().id(2L).build();
    final Showtime showtime = Showtime.builder().id(3L).room(room).build();

    @Test void locksBookingThenIndividualInventoryIdsAscendingAndOnlyReleasesOwnedHolds() {
        Booking booking = Booking.builder().id(1L).showtime(showtime).expiresAt(now).build();
        var owned = row(9L, 1L);
        var reclaimed = row(3L, 99L);
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(selections.findInventoryIds(1L)).thenReturn(List.of(9L, 3L));
        when(inventory.findByIdForUpdate(3L)).thenReturn(Optional.of(reclaimed));
        when(inventory.findByIdForUpdate(9L)).thenReturn(Optional.of(owned));
        when(time.now()).thenReturn(now);
        assertThat(worker.expire(1L)).isTrue();
        var order = inOrder(bookings, selections, inventory);
        order.verify(bookings).findByIdForUpdate(1L);
        order.verify(selections).findInventoryIds(1L);
        order.verify(inventory).findByIdForUpdate(3L);
        order.verify(inventory).findByIdForUpdate(9L);
        assertThat(owned.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(owned.getCurrentBookingId()).isNull();
        assertThat(reclaimed.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(reclaimed.getCurrentBookingId()).isEqualTo(99L);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
    }

    @Test void refusesToReleaseCrossShowtimeHistory() {
        Booking booking = Booking.builder().id(1L).showtime(showtime).expiresAt(now).build();
        var corrupt = row(3L, 1L);
        corrupt.setShowtime(Showtime.builder().id(55L).room(room).build());
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(selections.findInventoryIds(1L)).thenReturn(List.of(3L));
        when(inventory.findByIdForUpdate(3L)).thenReturn(Optional.of(corrupt));
        when(time.now()).thenReturn(now);
        assertThatThrownBy(() -> worker.expire(1L)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SEAT_NOT_IN_ROOM));
        assertThat(corrupt.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
    }

    @Test void confirmedOrUnexpiredBookingsAreNeverCleaned() {
        Booking booking = Booking.builder().id(1L).showtime(showtime).expiresAt(now.plusMillis(1)).build();
        when(bookings.findByIdForUpdate(1L)).thenReturn(Optional.of(booking));
        when(time.now()).thenReturn(now);
        assertThat(worker.expire(1L)).isFalse();
        booking.setStatus(BookingStatus.CONFIRMED);
        assertThat(worker.expire(1L)).isFalse();
        verifyNoInteractions(inventory, selections);
    }

    private ShowtimeSeat row(Long id, Long owner) {
        return ShowtimeSeat.builder().id(id).showtime(showtime).seat(Seat.builder().room(room).build())
                .status(ShowtimeSeatStatus.HELD).currentBookingId(owner).holdExpiresAt(now).build();
    }
}
