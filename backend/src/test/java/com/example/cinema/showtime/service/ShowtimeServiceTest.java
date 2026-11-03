package com.example.cinema.showtime.service;

import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShowtimeServiceTest {
    @Mock ShowtimeRepository showtimes;
    @Mock ShowtimeSeatRepository inventory;
    @Mock RoomRepository rooms;
    @Mock SeatRepository seats;
    @Mock MovieRepository movies;
    @Mock BookingRepository bookings;
    @Mock DatabaseTime time;
    @InjectMocks ShowtimeService service;
    final Instant start = Instant.parse("2026-11-10T12:00:00Z");
    Movie movie;
    Room room;
    Showtime showtime;

    @BeforeEach void setup() {
        movie = Movie.builder().id(1L).title("Phim").durationMinutes(120).status(MovieStatus.SHOWING).build();
        room = Room.builder().id(2L).name("Phòng").cinema(Cinema.builder().id(3L).name("Rạp").build()).build();
        showtime = Showtime.builder().id(4L).movie(movie).room(room).startsAt(start).endsAt(start.plusSeconds(7200))
                .basePrice(new BigDecimal("75000")).vipSurcharge(new BigDecimal("20000")).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", null, List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void createsInventoryUnderRoomLock() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(movies.findById(1L)).thenReturn(Optional.of(movie));
        when(seats.findByRoomIdAndStatusOrderByIdAsc(2L, PhysicalSeatStatus.ACTIVE)).thenReturn(List.of(seat(5L, SeatType.STANDARD)));
        when(showtimes.saveAndFlush(any())).thenAnswer(call -> { Showtime s = call.getArgument(0); s.setId(8L); return s; });
        var result = service.create(request(start, start.plusSeconds(7200)));
        assertThat(result.createdSeatCount()).isEqualTo(1);
        InOrder order = inOrder(rooms, showtimes, inventory);
        order.verify(rooms).findByIdForUpdate(2L);
        order.verify(showtimes).findOverlapsForUpdate(2L, start, start.plusSeconds(8100), null);
        order.verify(showtimes).saveAndFlush(any());
        order.verify(inventory).saveAllAndFlush(argThat((List<ShowtimeSeat> list) -> list.size() == 1
                && list.get(0).getStatus() == ShowtimeSeatStatus.AVAILABLE
                && list.get(0).getCurrentBookingId() == null));
    }

    @Test void rejectsOverlapWithoutCreatingShowtime() {
        prepareCreate();
        when(seats.findByRoomIdAndStatusOrderByIdAsc(2L, PhysicalSeatStatus.ACTIVE)).thenReturn(List.of(seat(5L, SeatType.STANDARD)));
        when(showtimes.findOverlapsForUpdate(anyLong(), any(), any(), isNull())).thenReturn(List.of(9L));
        assertCode(() -> service.create(request(start, start.plusSeconds(7200))), ErrorCode.SHOWTIME_OVERLAP);
        verify(showtimes, never()).saveAndFlush(any());
        verifyNoInteractions(inventory);
    }

    @Test void rejectsMaintenanceRoom() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        room.setStatus(RoomStatus.MAINTENANCE);
        assertCode(() -> service.create(request(start, start.plusSeconds(7200))), ErrorCode.ROOM_UNAVAILABLE);
    }

    @Test void rejectsRoomWithoutActiveSeats() {
        prepareCreate();
        assertCode(() -> service.create(request(start, start.plusSeconds(7200))), ErrorCode.ROOM_UNAVAILABLE);
    }

    @Test void rejectsHiddenMovie() {
        prepareCreate();
        movie.setStatus(MovieStatus.HIDDEN);
        assertCode(() -> service.create(request(start, start.plusSeconds(7200))), ErrorCode.MOVIE_UNAVAILABLE);
    }

    @Test void rejectsTooShortAndReversedIntervals() {
        prepareCreate();
        assertCode(() -> service.create(request(start, start.plusSeconds(60))), ErrorCode.SCHEDULE_INVALID);
        assertCode(() -> service.create(request(start, start)), ErrorCode.SCHEDULE_INVALID);
    }

    @Test void rejectsSubMillisecondTime() {
        prepareCreate();
        assertCode(() -> service.create(request(start.plusNanos(1), start.plusSeconds(7201))), ErrorCode.VALIDATION_ERROR);
    }

    @Test void rejectsVipPriceOverflow() {
        prepareCreate();
        var request = new ShowtimeRequest(1L, 2L, start, start.plusSeconds(7200), 15,
                new BigDecimal("9999999999.99"), BigDecimal.ONE);
        assertCode(() -> service.create(request), ErrorCode.SCHEDULE_INVALID);
    }

    @Test void refusesUpdateForAnyHistoricalBooking() {
        prepareUpdate();
        when(bookings.findHistoryForUpdate(4L)).thenReturn(List.of(10L));
        assertCode(() -> service.update(4L, request(start, start.plusSeconds(7200))), ErrorCode.RESOURCE_STATE_CONFLICT);
        verify(inventory, never()).deleteByShowtimeId(anyLong());
        verify(showtimes, never()).flush();
    }

    @Test void safeUpdateKeepsExistingInventoryInSameRoom() {
        prepareUpdate();
        when(movies.findById(1L)).thenReturn(Optional.of(movie));
        var result = service.update(4L, request(start.plusSeconds(3600), start.plusSeconds(10800)));
        assertThat(result.startsAt()).isEqualTo(start.plusSeconds(3600));
        verify(showtimes).findOverlapsForUpdate(2L, start.plusSeconds(3600), start.plusSeconds(11700), 4L);
        verify(inventory, never()).deleteByShowtimeId(anyLong());
    }

    @Test void returnsEffectiveExpiryAndPricesWithoutMutatingInventory() {
        when(showtimes.findById(4L)).thenReturn(Optional.of(showtime));
        when(time.now()).thenReturn(start.minusSeconds(1800));
        var expired = held(5L, SeatType.STANDARD, start.minusSeconds(1800));
        var held = held(6L, SeatType.VIP, start.minusSeconds(1799));
        var booked = ShowtimeSeat.builder().seat(seat(7L, SeatType.STANDARD)).status(ShowtimeSeatStatus.BOOKED).build();
        when(inventory.findSeatMap(4L)).thenReturn(List.of(expired, held, booked));
        var map = service.seatMap(4L);
        assertThat(map.bookingClosesAt()).isEqualTo(start.minusSeconds(600));
        assertThat(map.seats()).extracting(SeatMapResponse.SeatItem::status)
                .containsExactly(ShowtimeSeatStatus.AVAILABLE, ShowtimeSeatStatus.HELD, ShowtimeSeatStatus.BOOKED);
        assertThat(map.seats().get(1).price()).isEqualByComparingTo("95000");
        assertThat(expired.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        verify(inventory, never()).save(any());
    }

    @Test void hidesCancelledShowtimeAndHiddenMovie() {
        when(showtimes.findById(4L)).thenReturn(Optional.of(showtime));
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        assertCode(() -> service.seatMap(4L), ErrorCode.RESOURCE_NOT_FOUND);
        showtime.setStatus(ShowtimeStatus.SCHEDULED);
        movie.setStatus(MovieStatus.HIDDEN);
        assertCode(() -> service.seatMap(4L), ErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(time, inventory);
    }

    @Test void convertsVietnamDayToHalfOpenUtcRange() {
        when(movies.findById(1L)).thenReturn(Optional.of(movie));
        when(showtimes.findPublicSchedule(anyLong(), any(), any(), any(), any())).thenReturn(Page.empty());
        service.schedule(1L, LocalDate.of(2026, 11, 10), null, 0, 20, "startsAt,asc");
        verify(showtimes).findPublicSchedule(eq(1L), eq(Instant.parse("2026-11-09T17:00:00Z")),
                eq(Instant.parse("2026-11-10T17:00:00Z")), isNull(), any(Pageable.class));
    }

    @Test void defaultsCleanupAndSurcharge() {
        var request = new ShowtimeRequest(1L, 2L, start, start.plusSeconds(7200), null, BigDecimal.ZERO, null);
        assertThat(request.cleanupMinutes()).isEqualTo(15);
        assertThat(request.vipSurcharge()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    private void prepareCreate() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(movies.findById(1L)).thenReturn(Optional.of(movie));
    }
    private void prepareUpdate() {
        when(showtimes.findRoomIdById(4L)).thenReturn(Optional.of(2L));
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(showtimes.findByIdForUpdate(4L)).thenReturn(Optional.of(showtime));
    }
    private ShowtimeRequest request(Instant starts, Instant ends) {
        return new ShowtimeRequest(1L, 2L, starts, ends, 15, new BigDecimal("75000"), new BigDecimal("20000"));
    }
    private Seat seat(Long id, SeatType type) {
        return Seat.builder().id(id).room(room).seatRow("A").seatNumber(id.intValue()).seatType(type).build();
    }
    private ShowtimeSeat held(Long id, SeatType type, Instant expires) {
        return ShowtimeSeat.builder().seat(seat(id, type)).status(ShowtimeSeatStatus.HELD).holdExpiresAt(expires).currentBookingId(10L).build();
    }
    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
