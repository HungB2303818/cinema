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
    @Mock CinemaRepository cinemas;
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

    @Test void cinemaScheduleValidatesCinemaAndDates() {
        when(cinemas.findById(99L)).thenReturn(Optional.empty());
        assertCode(() -> service.cinemaSchedule(99L, LocalDate.of(2026, 11, 10), 0, 20), ErrorCode.RESOURCE_NOT_FOUND);

        Cinema inactive = Cinema.builder().id(98L).status(CinemaStatus.INACTIVE).build();
        when(cinemas.findById(98L)).thenReturn(Optional.of(inactive));
        assertCode(() -> service.cinemaSchedule(98L, LocalDate.of(2026, 11, 10), 0, 20), ErrorCode.RESOURCE_NOT_FOUND);

        Cinema active = Cinema.builder().id(3L).status(CinemaStatus.ACTIVE).build();
        when(cinemas.findById(3L)).thenReturn(Optional.of(active));
        assertCode(() -> service.cinemaSchedule(3L, LocalDate.of(999, 1, 1), 0, 20), ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.cinemaSchedule(3L, LocalDate.of(2026, 11, 10), -1, 20), ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.cinemaSchedule(3L, LocalDate.of(2026, 11, 10), 0, 101), ErrorCode.VALIDATION_ERROR);
    }

    @Test void cinemaScheduleGroupsByMovieAndPreservesShowtimesOrder() {
        Cinema active = Cinema.builder().id(3L).status(CinemaStatus.ACTIVE).name("Rạp Test").build();
        when(cinemas.findById(3L)).thenReturn(Optional.of(active));

        Movie movieB = Movie.builder().id(2L).title("Phim B").durationMinutes(100).status(MovieStatus.SHOWING).build();
        org.springframework.data.domain.PageImpl<Movie> moviePage =
                new org.springframework.data.domain.PageImpl<>(List.of(movie, movieB), org.springframework.data.domain.PageRequest.of(0, 20), 2);
        when(showtimes.findDistinctMoviesForCinemaSchedule(eq(3L), any(), any(), any())).thenReturn(moviePage);

        Showtime showtime2 = Showtime.builder().id(5L).movie(movie).room(room).startsAt(start.plusSeconds(3600))
                .endsAt(start.plusSeconds(10800)).basePrice(new BigDecimal("75000")).vipSurcharge(BigDecimal.ZERO).build();
        Showtime showtimeB = Showtime.builder().id(6L).movie(movieB).room(room).startsAt(start.plusSeconds(1800))
                .endsAt(start.plusSeconds(7800)).basePrice(new BigDecimal("80000")).vipSurcharge(BigDecimal.ZERO).build();

        when(showtimes.findShowtimesForCinemaMovies(eq(3L), eq(List.of(1L, 2L)), any(), any()))
                .thenReturn(List.of(showtime, showtime2, showtimeB));

        var result = service.cinemaSchedule(3L, LocalDate.of(2026, 11, 10), 0, 20);

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.content()).hasSize(2);
        assertThat(result.content().get(0).movie().title()).isEqualTo("Phim");
        assertThat(result.content().get(0).showtimes()).hasSize(2);
        assertThat(result.content().get(0).showtimes().get(0).id()).isEqualTo(4L);
        assertThat(result.content().get(0).showtimes().get(1).id()).isEqualTo(5L);
        assertThat(result.content().get(1).movie().title()).isEqualTo("Phim B");
        assertThat(result.content().get(1).showtimes()).hasSize(1);
        assertThat(result.content().get(1).showtimes().get(0).id()).isEqualTo(6L);
    }

    @Test void adminScheduleWithFilters() {
        when(showtimes.findAdminSchedule(eq(3L), eq(2L), eq(1L), any(Instant.class), any(Instant.class),
                eq(ShowtimeStatus.SCHEDULED), any(Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(showtime)));

        var result = service.adminSchedule(3L, 2L, 1L, LocalDate.of(2026, 11, 10), ShowtimeStatus.SCHEDULED,
                0, 20, "startsAt,asc");

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).id()).isEqualTo(4L);
        assertThat(result.content().get(0).cinemaName()).isEqualTo("Rạp");
        assertThat(result.content().get(0).roomName()).isEqualTo("Phòng");
    }

    @Test void adminScheduleWithoutDateDoesNotFilterToday() {
        when(showtimes.findAdminSchedule(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(showtime)));

        var result = service.adminSchedule(null, null, null, null, null, 0, 20, "id,desc");

        assertThat(result.totalElements()).isEqualTo(1);
        verify(showtimes).findAdminSchedule(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
    }

    @Test void adminDetailReturnsShowtimeEvenIfMovieHiddenOrRoomMaintenance() {
        movie.setStatus(MovieStatus.HIDDEN);
        room.setStatus(RoomStatus.MAINTENANCE);
        when(showtimes.findAdminDetailById(4L)).thenReturn(Optional.of(showtime));

        var result = service.adminDetail(4L);

        assertThat(result.id()).isEqualTo(4L);
        assertThat(result.movieId()).isEqualTo(1L);
        assertThat(result.roomId()).isEqualTo(2L);
    }

    @Test void adminDetailNotFoundThrows404() {
        when(showtimes.findAdminDetailById(999L)).thenReturn(Optional.empty());

        assertCode(() -> service.adminDetail(999L), ErrorCode.RESOURCE_NOT_FOUND);
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
