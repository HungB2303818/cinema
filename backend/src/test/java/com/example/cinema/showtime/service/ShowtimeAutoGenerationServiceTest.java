package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.GenerationDateResult;
import com.example.cinema.showtime.dto.ShowtimeRequest;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShowtimeAutoGenerationServiceTest {

    @Mock SchedulePlanRepository plans;
    @Mock ShowtimeRepository showtimes;
    @Mock SeatRepository seats;
    @Mock ShowtimeService showtimeService;
    @Mock ScheduleGenerationLogService logService;
    @Mock DatabaseTime databaseTime;

    private ShowtimeAutoGenerationService service;
    private Cinema cinema;
    private Room room;
    private Movie movie;
    private SchedulePlan plan;
    private final LocalDate date = LocalDate.of(2026, 12, 1);

    @BeforeEach
    void setUp() {
        service = new ShowtimeAutoGenerationService(plans, showtimes, seats, showtimeService,
                logService, new ShowtimeAllocationPlanner(), databaseTime);
        cinema = Cinema.builder().id(1L).name("Rạp").address("A").status(CinemaStatus.ACTIVE).build();
        room = Room.builder().id(2L).cinema(cinema).name("P1").status(RoomStatus.ACTIVE).build();
        movie = Movie.builder().id(10L).title("Phim A").durationMinutes(60)
                .status(MovieStatus.SHOWING).releaseDate(LocalDate.of(2026, 11, 1)).build();
        plan = SchedulePlan.builder().id(5L).room(room).name("Lịch")
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31))
                .daysOfWeek(127).openTime(LocalTime.of(9, 0)).closeTime(LocalTime.of(11, 0))
                .slotStepMinutes(15).cleanupMinutes(15)
                .basePrice(new BigDecimal("75000.00"))
                .vipSurcharge(new BigDecimal("20000.00"))
                .status(SchedulePlanStatus.ACTIVE).build();
        plan.getMovies().add(SchedulePlanMovie.builder().plan(plan).movie(movie).priority(0).build());
    }

    private void stubOperationalPlan() {
        when(plans.findSnapshotById(5L)).thenReturn(Optional.of(plan));
        when(seats.existsByRoomIdAndStatus(2L, PhysicalSeatStatus.ACTIVE)).thenReturn(true);
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));
    }

    @Test
    void createsShowtimeWithPlanValues() {
        stubOperationalPlan();

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SUCCESS);
        assertThat(result.createdCount()).isEqualTo(1);
        ArgumentCaptor<ShowtimeRequest> captor = ArgumentCaptor.forClass(ShowtimeRequest.class);
        verify(showtimeService).createInternal(captor.capture(),
                eq(ShowtimeAutoGenerationService.ACTOR), eq(5L));
        ShowtimeRequest request = captor.getValue();
        assertThat(request.movieId()).isEqualTo(10L);
        assertThat(request.roomId()).isEqualTo(2L);
        assertThat(request.startsAt()).isEqualTo(Instant.parse("2026-12-01T02:00:00Z"));
        assertThat(request.endsAt()).isEqualTo(Instant.parse("2026-12-01T03:00:00Z"));
        assertThat(request.cleanupMinutes()).isEqualTo(15);
        assertThat(request.basePrice()).isEqualByComparingTo("75000.00");
        assertThat(request.vipSurcharge()).isEqualByComparingTo("20000.00");
        verify(logService).record(eq(5L), eq(date), eq(GenerationOutcome.SUCCESS), eq(1), eq(0),
                anyString(), eq("run-1"));
    }

    @Test
    void partialWhenOneFrameOverlaps() {
        plan.setCloseTime(LocalTime.of(12, 0));
        stubOperationalPlan();
        when(showtimeService.createInternal(any(ShowtimeRequest.class), anyString(), eq(5L)))
                .thenReturn(null)
                .thenThrow(new AppException(ErrorCode.SHOWTIME_OVERLAP));

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.PARTIAL);
        assertThat(result.createdCount()).isEqualTo(1);
        assertThat(result.skippedCount()).isEqualTo(1);
        verify(logService).record(eq(5L), eq(date), eq(GenerationOutcome.PARTIAL), eq(1), eq(1),
                anyString(), eq("run-1"));
    }

    @Test
    void skippedWhenEveryFrameOverlaps() {
        stubOperationalPlan();
        when(showtimeService.createInternal(any(ShowtimeRequest.class), anyString(), eq(5L)))
                .thenThrow(new AppException(ErrorCode.SHOWTIME_OVERLAP));

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.createdCount()).isZero();
        assertThat(result.skippedCount()).isEqualTo(1);
    }

    @Test
    void skipsInactivePlan() {
        plan.setStatus(SchedulePlanStatus.INACTIVE);
        when(plans.findSnapshotById(5L)).thenReturn(Optional.of(plan));

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.message()).contains("tạm dừng");
        verifyNoInteractions(showtimeService);
    }

    @Test
    void skipsInactiveRoom() {
        room.setStatus(RoomStatus.MAINTENANCE);
        when(plans.findSnapshotById(5L)).thenReturn(Optional.of(plan));

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.message()).contains("tạm dừng");
        verifyNoInteractions(showtimeService);
    }

    @Test
    void skipsRoomWithoutActiveSeats() {
        when(plans.findSnapshotById(5L)).thenReturn(Optional.of(plan));
        when(seats.existsByRoomIdAndStatus(2L, PhysicalSeatStatus.ACTIVE)).thenReturn(false);

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.message()).contains("ghế");
        verifyNoInteractions(showtimeService);
    }

    @Test
    void skipsWhenNoEligibleMovie() {
        movie.setStatus(MovieStatus.UPCOMING);
        movie.setReleaseDate(LocalDate.of(2027, 1, 1));
        stubOperationalPlan();

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.message()).contains("phim hợp lệ");
        verifyNoInteractions(showtimeService);
    }

    @Test
    void skipsWhenDailyLimitReached() {
        stubOperationalPlan();
        when(showtimes.countScheduledStartsForRoomBetween(eq(2L), any(), any()))
                .thenReturn(40);

        GenerationDateResult result = service.generateDate(5L, date, "run-1");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SKIPPED);
        assertThat(result.message()).contains("40");
        verifyNoInteractions(showtimeService);
    }

    @Test
    void systemFailurePropagatesAndDoesNotLogSkipped() {
        stubOperationalPlan();
        when(showtimeService.createInternal(any(ShowtimeRequest.class), anyString(), eq(5L)))
                .thenThrow(new IllegalStateException("boom"));

        assertThatThrownBy(() -> service.generateDate(5L, date, "run-1"))
                .isInstanceOfSatisfying(ShowtimeAutoGenerationService.GenerationFailedException.class,
                        ex -> {
                            assertThat(ex.getCreatedCount()).isZero();
                            assertThat(ex.getSkippedCount()).isZero();
                            assertThat(ex.getCause()).isInstanceOf(IllegalStateException.class);
                        });
        verifyNoInteractions(logService);
    }

    @Test
    void systemFailureKeepsCountsOfAlreadyCreatedShowtimes() {
        plan.setCloseTime(LocalTime.of(12, 0));
        stubOperationalPlan();
        when(showtimeService.createInternal(any(ShowtimeRequest.class), anyString(), eq(5L)))
                .thenReturn(null)
                .thenThrow(new IllegalStateException("boom"));

        assertThatThrownBy(() -> service.generateDate(5L, date, "run-1"))
                .isInstanceOfSatisfying(ShowtimeAutoGenerationService.GenerationFailedException.class,
                        ex -> {
                            assertThat(ex.getCreatedCount()).isEqualTo(1);
                            assertThat(ex.getSkippedCount()).isZero();
                        });
        verifyNoInteractions(logService);
    }
}
