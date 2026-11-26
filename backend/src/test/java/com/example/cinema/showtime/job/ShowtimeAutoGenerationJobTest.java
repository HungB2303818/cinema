package com.example.cinema.showtime.job;

import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.ActivePlanRef;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.repository.ScheduleGenerationLogRepository;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.service.ScheduleGenerationLogService;
import com.example.cinema.showtime.service.ShowtimeAutoGenerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShowtimeAutoGenerationJobTest {

    @Mock SchedulePlanRepository plans;
    @Mock ScheduleGenerationLogRepository logs;
    @Mock ShowtimeAutoGenerationService generationService;
    @Mock ScheduleGenerationLogService logService;
    @Mock DatabaseTime databaseTime;

    private ShowtimeAutoGenerationJob job;

    private final LocalDate dec1 = LocalDate.of(2026, 12, 1);
    private final LocalDate dec2 = LocalDate.of(2026, 12, 2);
    private final LocalDate dec3 = LocalDate.of(2026, 12, 3);

    @BeforeEach
    void setUp() {
        job = new ShowtimeAutoGenerationJob(plans, logs, generationService, logService,
                databaseTime, 3, true);
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-30T17:00:00Z"));
    }

    @Test
    void processesHorizonAndWeekdayMask() {
        ActivePlanRef daily = new ActivePlanRef(1L, dec1, LocalDate.of(2026, 12, 10), 127);
        ActivePlanRef wednesdayOnly = new ActivePlanRef(2L, dec1, LocalDate.of(2026, 12, 31), 4);
        when(plans.findAllActiveRefs()).thenReturn(List.of(daily, wednesdayOnly));

        job.runOnce("test");

        verify(generationService, times(3)).generateDate(eq(1L), any(), anyString());
        verify(generationService).generateDate(eq(2L), eq(dec2), anyString());
        verify(generationService, times(1)).generateDate(eq(2L), any(), anyString());
    }

    @Test
    void skipsDateWithSuccessfulLog() {
        ActivePlanRef daily = new ActivePlanRef(1L, dec1, LocalDate.of(2026, 12, 10), 127);
        when(plans.findAllActiveRefs()).thenReturn(List.of(daily));
        when(logs.existsSuccessfulGeneration(1L, dec1)).thenReturn(true);

        job.runOnce("test");

        verify(generationService, never()).generateDate(eq(1L), eq(dec1), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec2), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec3), anyString());
    }

    @Test
    void skipsDatesOutsideEffectiveRange() {
        ActivePlanRef later = new ActivePlanRef(1L, LocalDate.of(2026, 12, 2),
                LocalDate.of(2026, 12, 3), 127);
        when(plans.findAllActiveRefs()).thenReturn(List.of(later));

        job.runOnce("test");

        verify(generationService, never()).generateDate(eq(1L), eq(dec1), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec2), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec3), anyString());
    }

    @Test
    void recordsFailureAndContinuesOtherDates() {
        ActivePlanRef daily = new ActivePlanRef(1L, dec1, LocalDate.of(2026, 12, 10), 127);
        when(plans.findAllActiveRefs()).thenReturn(List.of(daily));
        when(generationService.generateDate(eq(1L), eq(dec1), anyString()))
                .thenThrow(new IllegalStateException("boom"));

        job.runOnce("test");

        verify(logService).record(eq(1L), eq(dec1), eq(GenerationOutcome.FAILED),
                eq(0), eq(0), anyString(), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec2), anyString());
        verify(generationService).generateDate(eq(1L), eq(dec3), anyString());
    }

    @Test
    void recordsPartialCountsFromGenerationFailure() {
        ActivePlanRef daily = new ActivePlanRef(1L, dec1, LocalDate.of(2026, 12, 10), 127);
        when(plans.findAllActiveRefs()).thenReturn(List.of(daily));
        when(generationService.generateDate(eq(1L), eq(dec1), anyString()))
                .thenThrow(new ShowtimeAutoGenerationService.GenerationFailedException(3, 2,
                        new IllegalStateException("boom")));

        job.runOnce("test");

        verify(logService).record(eq(1L), eq(dec1), eq(GenerationOutcome.FAILED),
                eq(3), eq(2), anyString(), anyString());
    }

    @Test
    void startupCatchUpSwallowsFailures() {
        when(plans.findAllActiveRefs()).thenThrow(new IllegalStateException("db down"));

        org.assertj.core.api.Assertions.assertThatCode(() -> job.catchUpOnStartup())
                .doesNotThrowAnyException();
    }
}
