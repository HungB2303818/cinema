package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.ScheduleGenerationLogRepository;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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
class SchedulePlanServiceTest {

    @Mock SchedulePlanRepository plans;
    @Mock ScheduleGenerationLogRepository logs;
    @Mock ShowtimeRepository showtimes;
    @Mock RoomRepository rooms;    @Mock MovieRepository movies;
    @Mock ShowtimeAutoGenerationService generationService;
    @Mock ScheduleGenerationLogService logService;
    @Mock DatabaseTime databaseTime;
    @InjectMocks SchedulePlanService service;

    private static final Cinema CINEMA = Cinema.builder().id(1L).name("Rạp Mẫu")
            .address("1 Đường A").status(CinemaStatus.ACTIVE).build();
    private static final Room ROOM = Room.builder().id(2L).cinema(CINEMA).name("Phòng 1")
            .status(RoomStatus.ACTIVE).build();
    private static final Movie MOVIE = Movie.builder().id(10L).title("Phim A")
            .durationMinutes(90).status(MovieStatus.SHOWING)
            .releaseDate(LocalDate.of(2026, 11, 1)).build();

    private static SchedulePlanRequest request(SchedulePlanStatus status, List<Integer> days,
                                               List<Long> movieIds) {
        return new SchedulePlanRequest("Lịch tháng 12", 2L,
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31), days,
                LocalTime.of(9, 0), LocalTime.of(23, 0), 15, 15,
                new BigDecimal("75000.00"), new BigDecimal("20000.00"), movieIds, status);
    }

    private void stubCreateHappyPath() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(ROOM));
        when(plans.existsName(2L, "Lịch tháng 12", null)).thenReturn(false);
        when(movies.findAllById(List.of(10L))).thenReturn(List.of(MOVIE));
        when(plans.saveAndFlush(any())).thenAnswer(invocation -> {
            SchedulePlan plan = invocation.getArgument(0);
            plan.setId(5L);
            return plan;
        });
    }

    @Test
    void createsPlanWithOrderedMoviesAndDefaults() {
        stubCreateHappyPath();

        SchedulePlanResponse response = service.create(request(SchedulePlanStatus.ACTIVE,
                List.of(1, 2, 3, 4, 5, 6, 7), List.of(10L)), "admin");

        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.name()).isEqualTo("Lịch tháng 12");
        assertThat(response.roomName()).isEqualTo("Phòng 1");
        assertThat(response.daysOfWeek()).containsExactly(1, 2, 3, 4, 5, 6, 7);
        assertThat(response.movieCount()).isEqualTo(1);
        assertThat(response.movies().get(0).priority()).isZero();
        assertThat(response.status()).isEqualTo(SchedulePlanStatus.ACTIVE);
        verify(plans).saveAndFlush(any(SchedulePlan.class));
    }

    @Test
    void rejectsDuplicateName() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(ROOM));
        when(plans.existsName(2L, "Lịch tháng 12", null)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request(SchedulePlanStatus.ACTIVE,
                List.of(1), List.of(10L)), "admin"))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE));
    }

    @Test
    void rejectsOverlappingActiveWindow() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(ROOM));
        when(plans.existsName(2L, "Lịch tháng 12", null)).thenReturn(false);
        SchedulePlan other = SchedulePlan.builder().id(9L).name("Kế hoạch sáng")
                .openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(12, 0)).build();
        when(plans.findActiveOverlappingDates(eq(2L), any(), any(), isNull()))
                .thenReturn(List.of(other));

        assertThatThrownBy(() -> service.create(request(SchedulePlanStatus.ACTIVE,
                List.of(1), List.of(10L)), "admin"))
                .isInstanceOfSatisfying(AppException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_STATE_CONFLICT);
                    assertThat(ex.getMessage()).contains("Kế hoạch sáng");
                });
    }

    @Test
    void allowsAdjacentWindows() {
        stubCreateHappyPath();
        SchedulePlan morning = SchedulePlan.builder().id(9L).name("Kế hoạch sáng")
                .openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(9, 0)).build();
        when(plans.findActiveOverlappingDates(eq(2L), any(), any(), isNull()))
                .thenReturn(List.of(morning));

        SchedulePlanResponse response = service.create(request(SchedulePlanStatus.ACTIVE,
                List.of(1), List.of(10L)), "admin");

        assertThat(response.id()).isEqualTo(5L);
    }

    @Test
    void inactivePlanSkipsConflictCheck() {
        stubCreateHappyPath();

        service.create(request(SchedulePlanStatus.INACTIVE, List.of(1), List.of(10L)), "admin");

        verify(plans, never()).findActiveOverlappingDates(any(), any(), any(), any());
    }

    @Test
    void rejectsHiddenMovie() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(ROOM));
        when(plans.existsName(2L, "Lịch tháng 12", null)).thenReturn(false);
        when(plans.findActiveOverlappingDates(eq(2L), any(), any(), isNull())).thenReturn(List.of());
        Movie hidden = Movie.builder().id(10L).title("Phim ẩn").durationMinutes(90)
                .status(MovieStatus.HIDDEN).build();
        when(movies.findAllById(List.of(10L))).thenReturn(List.of(hidden));

        assertThatThrownBy(() -> service.create(request(SchedulePlanStatus.ACTIVE,
                List.of(1), List.of(10L)), "admin"))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.MOVIE_UNAVAILABLE));
    }

    @Test
    void rejectsInvalidDateRange() {
        SchedulePlanRequest invalid = new SchedulePlanRequest("Lịch", 2L,
                LocalDate.of(2026, 12, 31), LocalDate.of(2026, 12, 1), List.of(1),
                LocalTime.of(9, 0), LocalTime.of(23, 0), 15, 15,
                BigDecimal.TEN, BigDecimal.ZERO, List.of(10L), SchedulePlanStatus.ACTIVE);

        assertThatThrownBy(() -> service.create(invalid, "admin"))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_INVALID));
    }

    @Test
    void generateRejectsInactivePlan() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.INACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31)).daysOfWeek(127).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 1), "admin"))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_STATE_CONFLICT));
    }

    @Test
    void generateRejectsRangeLongerThan31Days() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.ACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2027, 2, 28)).daysOfWeek(127).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2027, 1, 1), "admin"))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void generateAggregatesApplicableDates() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.ACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31)).daysOfWeek(127).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));
        when(generationService.generateDate(eq(5L), any(LocalDate.class), anyString()))
                .thenAnswer(invocation -> new GenerationDateResult(invocation.getArgument(1),
                        GenerationOutcome.PARTIAL, 4, 1, "ok"));

        GenerationSummaryResponse summary = service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 2), "admin");

        assertThat(summary.createdCount()).isEqualTo(8);
        assertThat(summary.skippedCount()).isEqualTo(2);
        assertThat(summary.failedCount()).isZero();
        assertThat(summary.dates()).hasSize(2);
        verify(generationService, times(2)).generateDate(eq(5L), any(), anyString());
    }

    @Test
    void generateSkipsDatesNotInWeekdayMask() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.ACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31)).daysOfWeek(1).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));

        GenerationSummaryResponse summary = service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 1), "admin");

        assertThat(summary.dates()).isEmpty();
        verifyNoInteractions(generationService);
    }

    @Test
    void generateRecordsFailedDateAndContinues() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.ACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31)).daysOfWeek(127).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));
        when(generationService.generateDate(eq(5L), eq(LocalDate.of(2026, 12, 1)), anyString()))
                .thenThrow(new IllegalStateException("boom"));
        when(generationService.generateDate(eq(5L), eq(LocalDate.of(2026, 12, 2)), anyString()))
                .thenReturn(new GenerationDateResult(LocalDate.of(2026, 12, 2),
                        GenerationOutcome.SUCCESS, 3, 0, "ok"));

        GenerationSummaryResponse summary = service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 2), "admin");

        assertThat(summary.failedCount()).isEqualTo(1);
        assertThat(summary.createdCount()).isEqualTo(3);
        verify(logService).record(eq(5L), eq(LocalDate.of(2026, 12, 1)),
                eq(GenerationOutcome.FAILED), eq(0), eq(0), anyString(), anyString());
    }

    @Test
    void manualGenerationDoesNotJoinOuterTransaction() throws Exception {
        var method = SchedulePlanService.class.getMethod("generate", Long.class,
                LocalDate.class, LocalDate.class, String.class);
        var transactional = method.getAnnotation(org.springframework.transaction.annotation.Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.propagation())
                .isEqualTo(org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED);
    }

    @Test
    void generateKeepsPartialCountsWhenSystemFailureOccurs() {
        SchedulePlan plan = SchedulePlan.builder().id(5L).status(SchedulePlanStatus.ACTIVE)
                .effectiveFrom(LocalDate.of(2026, 12, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31)).daysOfWeek(127).build();
        when(plans.findById(5L)).thenReturn(Optional.of(plan));
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));
        when(generationService.generateDate(eq(5L), eq(LocalDate.of(2026, 12, 1)), anyString()))
                .thenThrow(new ShowtimeAutoGenerationService.GenerationFailedException(2, 1,
                        new IllegalStateException("boom")));

        GenerationSummaryResponse summary = service.generate(5L, LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 1), "admin");

        assertThat(summary.failedCount()).isEqualTo(1);
        assertThat(summary.createdCount()).isEqualTo(2);
        assertThat(summary.skippedCount()).isEqualTo(1);
        verify(logService).record(eq(5L), eq(LocalDate.of(2026, 12, 1)),
                eq(GenerationOutcome.FAILED), eq(2), eq(1), anyString(), anyString());
        assertThat(summary.dates()).singleElement().satisfies(result -> {
            assertThat(result.outcome()).isEqualTo(GenerationOutcome.FAILED);
            assertThat(result.createdCount()).isEqualTo(2);
            assertThat(result.skippedCount()).isEqualTo(1);
        });
    }

    @Test
    void updateRejectsRoomChangeWhenShowtimesExist() {
        Room otherRoom = Room.builder().id(3L).cinema(CINEMA).name("Phòng 2")
                .status(RoomStatus.ACTIVE).build();
        SchedulePlan plan = SchedulePlan.builder().id(5L).room(ROOM).name("Lịch tháng 12")
                .effectiveFrom(LocalDate.of(2026, 12, 1)).effectiveTo(LocalDate.of(2026, 12, 31))
                .daysOfWeek(127).openTime(LocalTime.of(9, 0)).closeTime(LocalTime.of(23, 0))
                .slotStepMinutes(15).cleanupMinutes(15).basePrice(new BigDecimal("75000.00"))
                .status(SchedulePlanStatus.ACTIVE).build();
        when(plans.findRoomIdById(5L)).thenReturn(Optional.of(2L));
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(ROOM));
        when(rooms.findByIdForUpdate(3L)).thenReturn(Optional.of(otherRoom));
        when(plans.findByIdForUpdate(5L)).thenReturn(Optional.of(plan));
        when(showtimes.existsBySchedulePlanId(5L)).thenReturn(true);

        SchedulePlanRequest request = new SchedulePlanRequest("Lịch tháng 12", 3L,
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31), List.of(1),
                LocalTime.of(9, 0), LocalTime.of(23, 0), 15, 15,
                new BigDecimal("75000.00"), new BigDecimal("20000.00"),
                List.of(10L), SchedulePlanStatus.ACTIVE);

        assertThatThrownBy(() -> service.update(5L, request, "admin"))
                .isInstanceOfSatisfying(AppException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_STATE_CONFLICT);
                    assertThat(ex.getMessage()).contains("đổi phòng chiếu");
                });
        verify(plans, never()).flush();
    }

    @Test
    void logsRejectMissingPlan() {
        when(plans.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> service.logs(5L, null, null, 0, 20))
                .isInstanceOfSatisfying(AppException.class, ex ->
                        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        verifyNoInteractions(logs);
    }

    @Test
    void logsRejectReversedDateRange() {
        assertThatThrownBy(() -> service.logs(5L, LocalDate.of(2026, 12, 2),
                LocalDate.of(2026, 12, 1), 0, 20))
                .isInstanceOfSatisfying(AppException.class, ex ->
                        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        verifyNoInteractions(plans, logs);
    }
}
